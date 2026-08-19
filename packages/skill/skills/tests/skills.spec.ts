import { access } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as DshSkills from '@deepseek-ai/dsh-skills'

describe('dsh-skills', () => {
  it('registers, loads, and disposes the bundled skill suite', async () => {
    const ctx = new Context()
    await ctx.plugin(SkillRegistry)
    const fiber = await ctx.plugin(DshSkills)

    const summaries = await ctx.skills.list()
    expect(summaries.map(skill => skill.name)).toEqual([
      'dsh-enhancement-analysis',
      'harness-runtime-optimizer',
      'repo-recon',
    ])
    expect(summaries.every(skill => skill.provider === 'dsh-skills')).toBe(true)
    expect(summaries.every(skill => skill.source === 'bundled')).toBe(true)

    const enhancement = await ctx.skills.get('dsh-enhancement-analysis')
    expect(enhancement?.content).toMatch(/^# DSH Enhancement Analysis/m)
    expect(enhancement?.content).not.toMatch(/^---$/m)
    expect(enhancement?.metadata).toEqual({ status: 'proposal', version: '0.3.1', date: '2026-08-19' })
    expect(enhancement?.resourceBase?.kind).toBe('directory')

    const resourceBase = enhancement?.resourceBase
    if (resourceBase?.kind !== 'directory') throw new Error('bundled skill must expose a directory resource base')
    const resourceRoot = pathToFileURL(resourceBase.path)
    await access(new URL('references/dsh-capabilities.md', resourceRoot))
    await access(new URL('templates/report-template.md', resourceRoot))

    await fiber.dispose()
    expect(await ctx.skills.list()).toEqual([])
  })
})
