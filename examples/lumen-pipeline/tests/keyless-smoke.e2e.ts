import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { LOADER_SMOKE_TEST_TIMEOUT_MS, runLoaderSmoke } from '@deepseek-ai/dsh-loader-smoke'

const binScript = fileURLToPath(new URL('./fixtures/boot-smoke.ts', import.meta.url))
const configPath = fileURLToPath(new URL('../cordis.yml', import.meta.url))
const tsconfigPath = fileURLToPath(new URL('../../../tsconfig.json', import.meta.url))

describe('lumen-pipeline keyless smoke', () => {
  it('boots the real composition through the Loader and resolves the pipeline services', async () => {
    const { stdout, stderr } = await runLoaderSmoke({
      label: 'lumen-pipeline',
      tempDirPrefix: 'lumen-pipeline-smoke-',
      binScript,
      libBinScript: binScript,
      configPath,
      binArgs: [configPath],
      tsconfigPath,
    })
    expect(stderr).toBe('')
    const result = JSON.parse(stdout.trimEnd().split('\n').at(-1) ?? '') as Record<string, unknown>
    expect(result).toMatchObject({
      type: 'boot-smoke',
      ok: true,
      services: { llm: true, subagents: true, tokenMeter: true },
    })
  }, LOADER_SMOKE_TEST_TIMEOUT_MS)
})
