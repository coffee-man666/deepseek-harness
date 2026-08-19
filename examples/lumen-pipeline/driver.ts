/**
 * DSH-facade driver for the Lumen report pipeline. Boots the cordis.yml
 * composition, then runs Lumen's own pipeline modules with the project's
 * OpenAI adapter swapped for a DSH-backed one: every llmStructured call
 * becomes one spawn subagent child with a structured-output schema, executed
 * under the composition's retry policy, token meter, and session log.
 *
 * Usage: tsx driver.ts --sample <file.md> --out <dir> [--label <name>]
 *          [--strong-extract] [--reuse-extract <manifest.json>]
 * Requires DEEPSEEK_API_KEY in the environment. Optional
 * DSH_PIPELINE_BASE_URL routes requests through the fault proxy.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { boot } from '@deepseek-ai/dsh-app-boot'

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
const label = arg('label') ?? 'dsh'
const strongExtract = hasFlag('strong-extract')
mkdirSync(outDir, { recursive: true })

const started = Date.now()
const result: Record<string, unknown> = { label, sample: samplePath, stack: 'dsh-facade', stages: {} }
const stageRecords: Array<Record<string, unknown>> = []
const childSessions: Array<{ stage: string; sessionId: string }> = []
let retryEvents = 0

// Exact provider usage per session step. The same step reports usage on both
// its assistant/chunk and assistant/message events, so values are keyed by
// step and overwritten, never added.
const usageByStep = new Map<string, { session: string; input: number; output: number }>()
function setUsage(sessionId: string, turn: unknown, step: unknown, usage: { inputTokens?: number; outputTokens?: number }): void {
  usageByStep.set(`${sessionId}:${String(turn)}:${String(step)}`, {
    session: sessionId,
    input: usage.inputTokens ?? 0,
    output: usage.outputTokens ?? 0,
  })
}
function sessionUsage(sessionId: string): { input: number; output: number } {
  let input = 0
  let output = 0
  for (const v of usageByStep.values()) {
    if (v.session !== sessionId) continue
    input += v.input
    output += v.output
  }
  return { input, output }
}

let ctx: Context
try {
  ctx = await boot('lumen-pipeline', resolve(import.meta.dirname, 'cordis.yml'))
} catch (e) {
  result.ok = false
  result.error = `boot failed: ${e instanceof Error ? e.message : String(e)}`
  writeFileSync(resolve(outDir, 'result.json'), JSON.stringify(result, null, 2))
  console.error(result.error)
  process.exit(1)
}

const agentsService = ctx.get('agents') as unknown as { roots: () => Array<Record<string, unknown>> }
const parent = agentsService.roots()[0] as never

ctx.on('session/event', ((session: { id: string }, event: { type: string; data?: Record<string, unknown> }) => {
  if (event.type === 'llm/retry' || event.type === 'llm/retry-started') retryEvents++
  if (event.type === 'assistant/chunk') {
    const chunk = event.data?.chunk as { type?: string; usage?: { inputTokens?: number; outputTokens?: number } } | undefined
    if (chunk?.type === 'usage' && chunk.usage) setUsage(session.id, event.data?.turn, event.data?.step, chunk.usage)
  }
  if (event.type === 'assistant/message') {
    const usage = event.data?.usage as { inputTokens?: number; outputTokens?: number } | undefined
    if (usage) setUsage(session.id, event.data?.turn, event.data?.step, usage)
  }
}) as never)

let currentStage = '(init)'
function mark(stage: string, info: Record<string, unknown>): void {
  currentStage = stage
  ;(result.stages as Record<string, unknown>)[stage] = { ...info, atMs: Date.now() - started }
}

// --- the DSH-backed transport installed into Lumen's adapter seam ---
const STRONG_STAGES = new Set(['extract', 'compose'])
const { OpenAIAdapter } = await import(resolve(VIBE, 'src/lib/llm/adapters/openai.ts'))
const { tryExtractJSON } = await import(resolve(VIBE, 'src/lib/llm/index.ts'))

function foldPrompt(system: string | undefined, messages: Array<{ role: string; content: unknown }>): string {
  const parts: string[] = []
  if (system) parts.push(`System instructions:\n${system}`)
  for (const m of messages) {
    const text = typeof m.content === 'string'
      ? m.content
      : Array.isArray(m.content)
        ? m.content.map((b: { text?: string }) => b?.text ?? '').join('\n')
        : ''
    parts.push(`${m.role}:\n${text}`)
  }
  return parts.join('\n\n')
}

const subagents = ctx.get('subagents') as unknown as {
  start: (provider: string, request: Record<string, unknown>) => Promise<{
    id: string
    localAgent: { session: { id: string } } | undefined
    result: Promise<{ output: Array<{ type: string; text?: string }>; structured?: unknown; stopReason: string }>
    dispose: () => Promise<void>
  }>
}
const tokenMeter = ctx.get('tokenMeter') as unknown as { measure: (session: unknown) => Promise<{ totalTokens: number; surfaceTokens: number }> }

async function dshCall(profile: unknown, req: Record<string, unknown>): Promise<Record<string, unknown>> {
  const stage = currentStage
  const model = strongExtract && STRONG_STAGES.has(stage) ? 'deepseek-reasoner' : 'deepseek-chat'
  const params = req.params as { max_tokens: number }
  const promptText = foldPrompt(req.system as string | undefined, req.messages as Array<{ role: string; content: unknown }>)
  const base = {
    prompt: [{ type: 'text', text: promptText }],
    parent,
    signal: AbortSignal.timeout(300_000),
    agentOptions: { provider: 'deepseek', model, maxTokens: params.max_tokens },
    label: `lumen-${stage}`,
  }
  const stageStarted = Date.now()
  let run: Awaited<ReturnType<typeof subagents.start>>
  let usedSchema = false
  let schemaRejectReason: string | null = null
  let effectivePrompt = promptText
  if (req.responseSchema && typeof req.responseSchema === 'object') {
    try {
      run = await subagents.start('spawn', { ...base, outputSchema: req.responseSchema })
      usedSchema = true
    } catch (e) {
      // Schema outside the enforced subset: fall back to Lumen's own
      // prompt-enforcement wording so the model still sees the schema.
      schemaRejectReason = e instanceof Error ? e.message.slice(0, 200) : String(e)
      effectivePrompt = `${promptText}\n\nRespond ONLY with a single JSON object matching this JSON Schema. No prose, no code fences.\n\nSchema:\n\`\`\`json\n${JSON.stringify(req.responseSchema)}\n\`\`\``
      run = await subagents.start('spawn', { ...base, prompt: [{ type: 'text', text: effectivePrompt }] })
    }
  } else {
    run = await subagents.start('spawn', base)
  }
  const childId = run.id
  const res = await run.result
  const usage = sessionUsage(childId)
  let measure: { totalTokens: number; surfaceTokens: number } | undefined
  if (run.localAgent) {
    try { measure = await tokenMeter.measure(run.localAgent.session) } catch { /* metering is best-effort in the record */ }
  }
  await run.dispose()
  const outputText = res.output.map(b => b.type === 'text' ? (b.text ?? '') : '').join('')
  stageRecords.push({
    stage, model, ms: Date.now() - stageStarted, stopReason: res.stopReason, usedSchema,
    schemaRejectReason,
    inputTokens: usage.input, outputTokens: usage.output,
    dshTotalTokens: measure?.totalTokens ?? null, dshSurfaceTokens: measure?.surfaceTokens ?? null,
    childSessionId: childId,
  })
  childSessions.push({ stage, sessionId: childId })
  // Transport failure after DSH retries is fatal; truncation ('max-tokens')
  // and other non-error stops return text so Lumen's validation-retry loop
  // can react, matching the original adapter's semantics.
  if (res.stopReason === 'error') throw new Error(`dsh child failed at ${stage}: stopReason=error output=${outputText.slice(0, 200)}`)
  if (res.structured !== undefined) {
    return {
      text: JSON.stringify(res.structured),
      toolCalls: [{ id: 'dsh', name: 'structured_output', input: res.structured }],
      usage: { inputTokens: usage.input, outputTokens: usage.output },
      finishReason: 'tool_use',
    }
  }
  const parsed = usedSchema ? undefined : tryExtractJSON(outputText)
  if (parsed !== undefined && parsed !== null) {
    return {
      text: outputText,
      toolCalls: [{ id: 'dsh', name: 'structured_output', input: parsed }],
      usage: { inputTokens: usage.input, outputTokens: usage.output },
      finishReason: 'tool_use',
    }
  }
  // No parseable capture: return raw text so Lumen's own validation-retry loop handles it.
  return { text: outputText, usage: { inputTokens: usage.input, outputTokens: usage.output }, finishReason: 'stop' }
}

OpenAIAdapter.call = dshCall as never

try {
  const { defaultProvider } = await import(resolve(VIBE, 'src/lib/llm/providers.ts'))
  const profile = { ...defaultProvider() }
  profile.schema = 'openai'
  profile.base_url = process.env.DSH_PIPELINE_BASE_URL ?? 'https://api.deepseek.com/v1'
  profile.model = 'deepseek-chat'
  profile.capabilities = { ...(profile.capabilities ?? {}), structured_output: true }

  const { ingestOne } = await import(resolve(VIBE, 'src/lib/pipeline/ingest.ts'))
  const { routeReport, routeHint } = await import(resolve(VIBE, 'src/lib/pipeline/router.ts'))
  const { extractRDM } = await import(resolve(VIBE, 'src/lib/pipeline/extract.ts'))
  const { suggestTheme } = await import(resolve(VIBE, 'src/lib/themes.ts'))
  const { composeWithMaestro } = await import(resolve(VIBE, 'src/lib/pipeline/maestro.ts'))
  const { refineSectionCopy } = await import(resolve(VIBE, 'src/lib/pipeline/refine.ts'))

  const text = readFileSync(samplePath, 'utf8')
  const source = await ingestOne({ filename: samplePath.split('/').pop() ?? samplePath, mime: 'text/markdown', text })
  mark('ingest', { blocks: source.blocks.length })

  const language = 'en'
  let rdm: Record<string, unknown> | undefined
  let route: { type: string } | null = null

  const reuseManifest = arg('reuse-extract')
  if (reuseManifest) {
    const prior = JSON.parse(readFileSync(reuseManifest, 'utf8')) as { rdmPath?: string; extractChildSession?: string; extractTokens?: { input: number; output: number } }
    // Replay from the durable session log: find the extract child's log by
    // session id and take its final assistant text, exactly what a fresh run
    // would have parsed. Falls back to the recorded artifact only if the log
    // cannot be read.
    const sessionsRoot = process.env.DSH_LUMEN_SESSIONS ?? './.sessions'
    let replayedFrom = 'artifact'
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
              const text = (ev.data?.message?.content ?? []).map(b => b.type === 'text' ? (b.text ?? '') : '').join('')
              if (text.trim() !== '') { replayText = text; break }
            }
            replayedFrom = 'session-log'
            break
          }
        }
      }
    }
    const parsedReplay = replayText ? tryExtractJSON(replayText) : null
    rdm = (parsedReplay ?? JSON.parse(readFileSync(prior.rdmPath ?? resolve(outDir, 'rdm.json'), 'utf8'))) as Record<string, unknown>
    mark('route', { skipped: 'replay' })
    mark('extract', { skipped: 'replay', replaySource: replayedFrom, replayedFrom: prior.extractChildSession, priorTokens: prior.extractTokens ?? null })
  } else {
    route = await (mark('route', {}), routeReport(profile, [source], language) as Promise<{ type: string } | null>)
    mark('route', { type: route?.type ?? null })
    const hint = routeHint(route) || undefined
    mark('extract', {})
    const extract = await extractRDM(profile, [source], { hint, language })
    rdm = extract.rdm as unknown as Record<string, unknown>
    mark('extract', {
      metrics: ((rdm.metrics as unknown[]) ?? []).length,
      series: ((rdm.series as unknown[]) ?? []).length,
      rankings: ((rdm.rankings as unknown[]) ?? []).length,
    })
  }

  const meta = rdm.meta as { title?: string } | undefined
  const thesis = rdm.thesis as { summary?: string } | undefined
  const seed = `${meta?.title ?? ''} ${thesis?.summary ?? ''}`
  const theme = suggestTheme(seed)
  mark('theme', { themeId: theme.id })

  mark('compose', {})
  const compose = await composeWithMaestro(rdm as never, profile, 'light', language)
  mark('compose', { usedMaestro: compose.usedMaestro, sections: compose.plan.sections.length, error: compose.error ?? null })

  const section = compose.plan.sections[0] as { widgets: Array<{ ref: { category: string; id: string } }> }
  const slice: Record<string, unknown> = { meta: rdm.meta, thesis: rdm.thesis }
  const byCat = new Map<string, Set<string>>()
  for (const w of section.widgets) {
    const ids = byCat.get(w.ref.category) ?? new Set<string>()
    ids.add(w.ref.id)
    byCat.set(w.ref.category, ids)
  }
  for (const [cat, ids] of byCat) {
    const arr = (rdm as unknown as Record<string, { id: string }[]>)[cat]
    if (Array.isArray(arr)) slice[cat] = arr.filter(n => ids.has(n.id))
  }
  mark('refine', {})
  const patch = await refineSectionCopy(profile, { section, instruction: 'Tighten the narrative and make the takeaway sharper. Do not change widget types.', rdmSlice: slice, language })
  mark('refine', { title: patch.title, narrativeParas: patch.narrative.length })

  result.ok = true
  writeFileSync(resolve(outDir, 'rdm.json'), JSON.stringify(rdm, null, 2))
  writeFileSync(resolve(outDir, 'plan.json'), JSON.stringify(compose.plan, null, 2))
} catch (e) {
  result.ok = false
  result.error = e instanceof Error ? e.message : String(e)
  result.failedAt = currentStage
} finally {
  result.totalMs = Date.now() - started
  result.llmCalls = stageRecords
  result.childSessions = childSessions
  result.retryEvents = retryEvents
  result.totals = {
    calls: stageRecords.length,
    ok: stageRecords.filter(c => c.stopReason === 'completed').length,
    inputTokens: stageRecords.reduce((s, c) => s + (c.inputTokens as number), 0),
    outputTokens: stageRecords.reduce((s, c) => s + (c.outputTokens as number), 0),
  }
  writeFileSync(resolve(outDir, 'result.json'), JSON.stringify(result, null, 2))
  // Flush the summary before exit: a piped stdout can lose console.log on process.exit.
  await new Promise<void>((resolve) => {
    process.stdout.write(`${JSON.stringify({ ok: result.ok, totalMs: result.totalMs, totals: result.totals, retries: retryEvents, failedAt: result.failedAt ?? null })}\n`, () => resolve())
  })
  try { await (ctx as unknown as { fiber: { dispose: () => Promise<void> } }).fiber.dispose() } catch { /* already disposed */ }
  process.exit(result.ok ? 0 : 1)
}
