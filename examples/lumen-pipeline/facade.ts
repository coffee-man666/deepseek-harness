/**
 * Reusable DSH facade for the Lumen report pipeline: boots the cordis.yml
 * composition once, then runs Lumen's own pipeline modules per request with
 * the project's OpenAI adapter swapped for a DSH-backed transport. Every
 * llmStructured call becomes one spawn subagent child with a structured-output
 * schema, executed under the composition's retry policy, token meter, and
 * session log. Consumed by driver.ts (CLI) and sidecar.ts (HTTP service).
 */
import { resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { boot } from '@deepseek-ai/dsh-app-boot'

export interface FacadeRunInput {
  readonly filename: string
  readonly text: string
  readonly language?: string
  readonly strongExtract?: boolean
  /** When set (e.g. recovered from a prior session log), route and extract are skipped. */
  readonly prefetchedRdm?: Record<string, unknown>
}

export interface FacadeStageRecord {
  stage: string
  model: string
  ms: number
  stopReason: string
  usedSchema: boolean
  schemaRejectReason: string | null
  inputTokens: number
  outputTokens: number
  dshTotalTokens: number | null
  dshSurfaceTokens: number | null
  childSessionId: string
}

export interface FacadeRunMetrics {
  ok: boolean
  error?: string
  failedAt?: string
  totalMs: number
  retries: number
  llmCalls: FacadeStageRecord[]
  totals: { calls: number; ok: number; inputTokens: number; outputTokens: number }
}

export interface FacadeRunResult {
  ok: boolean
  rdm?: Record<string, unknown>
  plan?: Record<string, unknown>
  themeId?: string
  metrics: FacadeRunMetrics
}

export interface Facade {
  run(input: FacadeRunInput): Promise<FacadeRunResult>
  dispose(): Promise<void>
}

export async function startFacade(vibeRoot: string, configPath = resolve(import.meta.dirname, 'cordis.yml')): Promise<Facade> {
  const ctx: Context = await boot('lumen-pipeline', configPath)

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

  const retries = { count: 0 }
  ctx.on('session/event', ((session: { id: string }, event: { type: string; data?: Record<string, unknown> }) => {
    if (event.type === 'llm/retry' || event.type === 'llm/retry-started') retries.count++
    if (event.type === 'assistant/chunk') {
      const chunk = event.data?.chunk as { type?: string; usage?: { inputTokens?: number; outputTokens?: number } } | undefined
      if (chunk?.type === 'usage' && chunk.usage) setUsage(session.id, event.data?.turn, event.data?.step, chunk.usage)
    }
    if (event.type === 'assistant/message') {
      const usage = event.data?.usage as { inputTokens?: number; outputTokens?: number } | undefined
      if (usage) setUsage(session.id, event.data?.turn, event.data?.step, usage)
    }
  }) as never)

  const agentsService = ctx.get('agents') as unknown as { roots: () => Array<Record<string, unknown>> }
  const parent = agentsService.roots()[0] as never
  const subagents = ctx.get('subagents') as unknown as {
    start: (provider: string, request: Record<string, unknown>) => Promise<{
      id: string
      localAgent: { session: { id: string } } | undefined
      result: Promise<{ output: Array<{ type: string; text?: string }>; structured?: unknown; stopReason: string }>
      dispose: () => Promise<void>
    }>
  }
  const tokenMeter = ctx.get('tokenMeter') as unknown as { measure: (session: unknown) => Promise<{ totalTokens: number; surfaceTokens: number }> }

  const { OpenAIAdapter } = await import(resolve(vibeRoot, 'src/lib/llm/adapters/openai.ts'))
  const { tryExtractJSON } = await import(resolve(vibeRoot, 'src/lib/llm/index.ts'))
  const { defaultProvider } = await import(resolve(vibeRoot, 'src/lib/llm/providers.ts'))
  const { ingestOne } = await import(resolve(vibeRoot, 'src/lib/pipeline/ingest.ts'))
  const { routeReport, routeHint } = await import(resolve(vibeRoot, 'src/lib/pipeline/router.ts'))
  const { extractRDM } = await import(resolve(vibeRoot, 'src/lib/pipeline/extract.ts'))
  const { suggestTheme } = await import(resolve(vibeRoot, 'src/lib/themes.ts'))
  const { composeWithMaestro } = await import(resolve(vibeRoot, 'src/lib/pipeline/maestro.ts'))
  const { refineSectionCopy } = await import(resolve(vibeRoot, 'src/lib/pipeline/refine.ts'))

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

  async function run(input: FacadeRunInput): Promise<FacadeRunResult> {
    const stageRecords: FacadeStageRecord[] = []
    let currentStage = '(init)'
    const profile = { ...defaultProvider() }
    profile.schema = 'openai'
    profile.base_url = process.env.DSH_PIPELINE_BASE_URL ?? 'https://api.deepseek.com/v1'
    profile.model = 'deepseek-chat'
    profile.capabilities = { ...(profile.capabilities ?? {}), structured_output: true }

    const dshCall = async (profileArg: unknown, req: Record<string, unknown>): Promise<Record<string, unknown>> => {
      void profileArg
      const stage = currentStage
      const model = input.strongExtract && (stage === 'extract' || stage === 'compose') ? 'deepseek-reasoner' : 'deepseek-chat'
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
      let runHandle: Awaited<ReturnType<typeof subagents.start>>
      let usedSchema = false
      let schemaRejectReason: string | null = null
      if (req.responseSchema && typeof req.responseSchema === 'object') {
        try {
          runHandle = await subagents.start('spawn', { ...base, outputSchema: req.responseSchema })
          usedSchema = true
        } catch (e) {
          // Schema outside the enforced subset: fall back to Lumen's own
          // prompt-enforcement wording so the model still sees the schema.
          schemaRejectReason = e instanceof Error ? e.message.slice(0, 200) : String(e)
          const instructed = `${promptText}\n\nRespond ONLY with a single JSON object matching this JSON Schema. No prose, no code fences.\n\nSchema:\n\`\`\`json\n${JSON.stringify(req.responseSchema)}\n\`\`\``
          runHandle = await subagents.start('spawn', { ...base, prompt: [{ type: 'text', text: instructed }] })
        }
      } else {
        runHandle = await subagents.start('spawn', base)
      }
      const childId = runHandle.id
      const res = await runHandle.result
      const usage = sessionUsage(childId)
      let dshTotalTokens: number | null = null
      let dshSurfaceTokens: number | null = null
      if (runHandle.localAgent) {
        try {
          const measure = await tokenMeter.measure(runHandle.localAgent.session)
          dshTotalTokens = measure.totalTokens
          dshSurfaceTokens = measure.surfaceTokens
        } catch { /* metering is best-effort in the record */ }
      }
      await runHandle.dispose()
      const outputText = res.output.map(b => b.type === 'text' ? (b.text ?? '') : '').join('')
      stageRecords.push({
        stage, model, ms: Date.now() - stageStarted, stopReason: res.stopReason, usedSchema,
        schemaRejectReason,
        inputTokens: usage.input, outputTokens: usage.output,
        dshTotalTokens, dshSurfaceTokens,
        childSessionId: childId,
      })
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
      return { text: outputText, usage: { inputTokens: usage.input, outputTokens: usage.output }, finishReason: 'stop' }
    }

    const priorCall = OpenAIAdapter.call
    OpenAIAdapter.call = dshCall as never
    const started = Date.now()
    const language = input.language ?? 'en'
    try {
      const source = await ingestOne({ filename: input.filename, mime: 'text/markdown', text: input.text })

      let rdm: Record<string, unknown>
      if (input.prefetchedRdm !== undefined) {
        rdm = input.prefetchedRdm
      } else {
        currentStage = 'route'
        const route = await routeReport(profile, [source], language) as { type: string } | null
        const hint = routeHint(route) || undefined

        currentStage = 'extract'
        const extract = await extractRDM(profile, [source], { hint, language })
        rdm = extract.rdm as unknown as Record<string, unknown>
      }

      const meta = rdm.meta as { title?: string } | undefined
      const thesis = rdm.thesis as { summary?: string } | undefined
      const seed = `${meta?.title ?? ''} ${thesis?.summary ?? ''}`
      const theme = suggestTheme(seed)

      currentStage = 'compose'
      const compose = await composeWithMaestro(rdm as never, profile, 'light', language)
      const plan = compose.plan as unknown as Record<string, unknown>

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
      currentStage = 'refine'
      const patch = await refineSectionCopy(profile, { section, instruction: 'Tighten the narrative and make the takeaway sharper. Do not change widget types.', rdmSlice: slice, language })
      void patch

      return { ok: true, rdm, plan, themeId: theme.id, metrics: metrics(stageRecords, retries.count, started, currentStage) }
    } catch (e) {
      return {
        ok: false,
        metrics: {
          ...metrics(stageRecords, retries.count, started, currentStage),
          error: e instanceof Error ? e.message : String(e),
        },
      }
    } finally {
      OpenAIAdapter.call = priorCall
    }
  }

  return {
    run,
    dispose: async () => {
      try { await (ctx as unknown as { fiber: { dispose: () => Promise<void> } }).fiber.dispose() } catch { /* already disposed */ }
    },
  }
}

function metrics(stageRecords: FacadeStageRecord[], retries: number, started: number, failedAt: string): FacadeRunMetrics {
  return {
    ok: true,
    failedAt,
    totalMs: Date.now() - started,
    retries,
    llmCalls: stageRecords,
    totals: {
      calls: stageRecords.length,
      ok: stageRecords.filter(c => c.stopReason === 'completed').length,
      inputTokens: stageRecords.reduce((s, c) => s + c.inputTokens, 0),
      outputTokens: stageRecords.reduce((s, c) => s + c.outputTokens, 0),
    },
  }
}
