import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { LOADER_SMOKE_TEST_TIMEOUT_MS, runLoaderSmoke } from '@deepseek-ai/dsh-loader-smoke'

/**
 * Real-model pipeline run. Self-skips without both DEEPSEEK_API_KEY and
 * VIBE_ROOT (the external vibe-report-dashboard checkout whose pipeline
 * modules and .env.local the facade drives). Assertions read the driver's
 * result.json rather than stdout: a piped stdout can truncate on exit.
 */
const enabled = process.env.DEEPSEEK_API_KEY !== undefined && process.env.VIBE_ROOT !== undefined
const binScript = fileURLToPath(new URL('../driver.ts', import.meta.url))
const configPath = fileURLToPath(new URL('../cordis.yml', import.meta.url))
const tsconfigPath = fileURLToPath(new URL('../../../tsconfig.json', import.meta.url))
const samplePath = fileURLToPath(new URL('./fixtures/sample.md', import.meta.url))

describe.skipIf(!enabled)('lumen-pipeline with-key pipeline run', () => {
  it('runs the full pipeline as DSH subagent stages with metering and session logs', async () => {
    const outDir = join(mkdtempSync(join(tmpdir(), 'lumen-pipeline-withkey-')), 'run')
    const { stderr } = await runLoaderSmoke({
      label: 'lumen-pipeline-with-key',
      tempDirPrefix: 'lumen-pipeline-withkey-',
      processTimeoutMs: 300_000,
      binScript,
      libBinScript: binScript,
      configPath,
      binArgs: ['--sample', samplePath, '--out', outDir, '--label', 'with-key-smoke'],
      tsconfigPath,
    })
    expect(stderr).toBe('')
    const result = JSON.parse(readFileSync(join(outDir, 'result.json'), 'utf8')) as Record<string, unknown>
    expect(result).toMatchObject({ ok: true })
    // Four stages; Lumen's validation-retry loop can add calls.
    expect((result['llmCalls'] as unknown[]).length).toBeGreaterThanOrEqual(4)
    expect((result['childSessions'] as unknown[]).length).toBeGreaterThanOrEqual(4)
    expect((result['totals'] as Record<string, number>)['inputTokens']).toBeGreaterThan(0)
  }, LOADER_SMOKE_TEST_TIMEOUT_MS * 10)
})
