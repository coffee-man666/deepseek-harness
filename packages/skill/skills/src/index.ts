/** Bundled DSH workflow-analysis skills provider. */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import {
  BUNDLED_SKILL_RANK,
  type SkillCandidate,
  type SkillDefinition,
  type SkillProvider,
} from '@deepseek-ai/dsh-skill'

const PROVIDER_NAME = 'dsh-skills'
const INVOCATION = { modelInvocable: true, userInvocable: true } as const
const SOURCE = 'bundled' as const
const METADATA = { status: 'proposal', version: '0.3.2', date: '2026-08-19' } as const

interface BundledSkill {
  readonly name: string
  readonly description: string
  readonly body: URL
}

type BundledCandidate = SkillCandidate & {
  readonly locator: URL
  readonly path: string
  readonly resourceBase: NonNullable<SkillCandidate['resourceBase']>
  readonly metadata: NonNullable<SkillCandidate['metadata']>
}

const BUNDLED_SKILLS: readonly BundledSkill[] = [
  {
    name: 'dsh-enhancement-analysis',
    description: 'Analyze any project directly (recon report optional), map pain points onto DeepSeek Harness capabilities; produce a prioritized enhancement report.',
    body: new URL('../skills/dsh-enhancement-analysis/SKILL.md', import.meta.url),
  },
  {
    name: 'harness-runtime-optimizer',
    description: 'Observe, experiment on, and optimize an agent harness runtime loop as a policy layer: routing, context, retry, stopping, tools, branching, budgeting, and execution-world policies. Designed for DSH but usable as a harness-neutral methodology.',
    body: new URL('../skills/harness-runtime-optimizer/SKILL.md', import.meta.url),
  },
  {
    name: 'repo-recon',
    description: 'Parallel read-only recon of local git projects via subagents for survey, deep-dive, or pre-enhancement analysis.',
    body: new URL('../skills/repo-recon/SKILL.md', import.meta.url),
  },
]

function toCandidate(skill: BundledSkill): BundledCandidate {
  const path = fileURLToPath(skill.body)
  return {
    name: skill.name,
    description: skill.description,
    invocation: INVOCATION,
    provider: PROVIDER_NAME,
    source: SOURCE,
    resourceBase: { kind: 'directory', path: fileURLToPath(new URL('./', skill.body)) },
    rank: BUNDLED_SKILL_RANK,
    locator: skill.body,
    path,
    metadata: METADATA,
  }
}

const CANDIDATES = BUNDLED_SKILLS.map(toCandidate)

function stripFrontmatter(content: string): string {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
}

const provider: SkillProvider = {
  name: PROVIDER_NAME,
  list: () => Promise.resolve(CANDIDATES),
  async get(candidate): Promise<SkillDefinition> {
    // The registry passes back the exact candidate returned by this provider's list().
    const bundled = candidate as BundledCandidate
    const body = await readFile(bundled.locator, 'utf8')
    return {
      name: bundled.name,
      description: bundled.description,
      invocation: bundled.invocation,
      provider: bundled.provider,
      source: bundled.source,
      resourceBase: bundled.resourceBase,
      path: bundled.path,
      metadata: bundled.metadata,
      content: stripFrontmatter(body),
    }
  },
}

/** Cordis plugin name. */
export const name = 'dsh-skills'
/** Service required by the bundled provider. */
export const inject = ['skills']

/** Register the bundled DSH workflow-analysis skills on `ctx.skills`. */
export function apply(ctx: Context): void {
  ctx.skills.registerProvider(() => provider)
}
