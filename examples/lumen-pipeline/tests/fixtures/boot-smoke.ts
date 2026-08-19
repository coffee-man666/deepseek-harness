#!/usr/bin/env node
/** Boot-only Loader smoke: the composition loads and its pipeline services resolve. */

import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { boot, resolveConfigPath } from '@deepseek-ai/dsh-app-boot'

const NAME = 'lumen-pipeline-boot-smoke'
const [configPath] = process.argv.slice(2)
if (configPath === undefined) throw new Error(`${NAME}: expected <config-path>`)

process.env.DSH_LUMEN_SESSIONS = join(mkdtempSync(join(tmpdir(), 'lumen-boot-smoke-')), 'sessions')
const ctx: Context = await boot(NAME, resolveConfigPath(configPath, undefined))
const services = {
  llm: ctx.get('llm') !== undefined,
  subagents: ctx.get('subagents') !== undefined,
  tokenMeter: ctx.get('tokenMeter') !== undefined,
}
await ctx.fiber.dispose()
const ok = Object.values(services).every(Boolean)
process.stdout.write(`${JSON.stringify({ type: 'boot-smoke', ok, services })}\n`)
if (!ok) process.exitCode = 1
