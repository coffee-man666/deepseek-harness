/**
 * CLI driver for the Lumen pipeline DSH facade (see facade.ts). Runs one
 * sample end to end and writes rdm.json / plan.json / result.json.
 *
 * Usage: tsx driver.ts --sample <file.md> --out <dir> [--label <name>]
 *          [--strong-extract] [--reuse-extract <manifest.json>]
 * Requires DEEPSEEK_API_KEY in the environment. Optional
 * DSH_PIPELINE_BASE_URL routes requests through the fault proxy.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { startFacade } from './facade.ts'

const args = process.argv.slice(2)
function arg(name: string): string | undefined {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
function hasFlag(name: string): boolean {
  return args.includes(`--${name}`)
}

const VIBE = process.env.VIBE_ROOT
if (!VIBE) {
  console.error('driver: VIBE_ROOT must point at the vibe-report-dashboard checkout (the pipeline modules and .env.local are read from it)')
  process.exit(1)
}
const samplePath = arg('sample')
if (!samplePath) {
  console.error('driver: --sample <file.md> is required')
  process.exit(1)
}
const outDir = arg('out') ?? 'run-output'
mkdirSync(outDir, { recursive: true })

const result: Record<string, unknown> = {
  label: arg('label') ?? 'dsh',
  sample: samplePath,
  stack: 'dsh-facade',
  stages: {},
}

const facade = await startFacade(VIBE)
try {
  const text = readFileSync(samplePath, 'utf8')
  const reuseManifest = arg('reuse-extract')
  if (reuseManifest) {
    // Replay path: recover the RDM from the prior run's durable session log,
    // then run only the stages after extract.
    const prior = JSON.parse(readFileSync(reuseManifest, 'utf8')) as { rdmPath?: string; extractChildSession?: string; extractTokens?: { input: number; output: number } }
    const { tryExtractJSON } = await import(resolve(VIBE, 'src/lib/llm/index.ts'))
    const sessionsRoot = process.env.DSH_LUMEN_SESSIONS ?? './.sessions'
    let replayText = ''
    if (prior.extractChildSession) {
      const queue = [resolve(sessionsRoot)]
      while (queue.length > 0 && replayText === '') {
        const dir = queue.shift()
        if (dir === undefined) break
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          if (entry.isDirectory()) queue.push(resolve(dir, entry.name))
          else if (entry.name === 'session.jsonl' && dir.includes(prior.extractChildSession)) {
            const lines = readFileSync(resolve(dir, entry.name), 'utf8').split('\n').filter(Boolean)
            for (const line of [...lines].reverse()) {
              const ev = JSON.parse(line) as { type?: string; data?: { message?: { content?: Array<{ type?: string; text?: string }> } } }
              if (ev.type !== 'assistant/message') continue
              const msgText = (ev.data?.message?.content ?? []).map(b => b.type === 'text' ? (b.text ?? '') : '').join('')
              if (msgText.trim() !== '') { replayText = msgText; break }
            }
            break
          }
        }
      }
    }
    const parsedReplay = replayText ? tryExtractJSON(replayText) : null
    const rdm = (parsedReplay ?? JSON.parse(readFileSync(prior.rdmPath ?? resolve(outDir, 'rdm.json'), 'utf8'))) as Record<string, unknown>
    ;(result.stages as Record<string, unknown>)['route'] = { skipped: 'replay' }
    ;(result.stages as Record<string, unknown>)['extract'] = { skipped: 'replay', replaySource: replayText ? 'session-log' : 'artifact', replayedFrom: prior.extractChildSession, priorTokens: prior.extractTokens ?? null }
    // A replayed run still needs a fresh rdm.json artifact for later reuse.
    writeFileSync(resolve(outDir, 'rdm.json'), JSON.stringify(rdm, null, 2))
  }

  const run = await facade.run({
    filename: samplePath.split('/').pop() ?? samplePath,
    text,
    language: 'en',
    strongExtract: hasFlag('strong-extract'),
    ...(reuseManifest ? { prefetchedRdm: JSON.parse(readFileSync(resolve(outDir, 'rdm.json'), 'utf8')) as Record<string, unknown> } : {}),
  })
  result.ok = run.ok
  if (!run.ok) {
    result.error = run.metrics.error
    result.failedAt = run.metrics.failedAt
  }
  result.totalMs = run.metrics.totalMs
  result.llmCalls = run.metrics.llmCalls
  result.childSessions = run.metrics.llmCalls.map(c => ({ stage: c.stage, sessionId: c.childSessionId }))
  result.retryEvents = run.metrics.retries
  result.totals = run.metrics.totals
  if (run.rdm !== undefined) writeFileSync(resolve(outDir, 'rdm.json'), JSON.stringify(run.rdm, null, 2))
  if (run.plan !== undefined) writeFileSync(resolve(outDir, 'plan.json'), JSON.stringify(run.plan, null, 2))
} catch (e) {
  result.ok = false
  result.error = e instanceof Error ? e.message : String(e)
} finally {
  writeFileSync(resolve(outDir, 'result.json'), JSON.stringify(result, null, 2))
  // Flush the summary before exit: a piped stdout can lose console.log on process.exit.
  await new Promise<void>((resolveFlush) => {
    process.stdout.write(`${JSON.stringify({ ok: result.ok, totalMs: result.totalMs, totals: result.totals, retries: result.retryEvents, failedAt: result.failedAt ?? null })}\n`, () => resolveFlush())
  })
  await facade.dispose()
  process.exit(result.ok ? 0 : 1)
}
