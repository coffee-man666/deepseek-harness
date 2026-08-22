import { describe, expect, it } from 'vitest'
import { parseDashboardSnapshot } from '../src/wire.ts'

function snapshot(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    generatedAt: 1,
    route: { provider: 'glm', model: 'glm-5' },
    agents: [],
    teams: [],
    usage: {
      inputTokens: 10,
      outputTokens: 20,
      cacheReadTokens: 3,
      cacheWriteTokens: 4,
      reasoningTokens: 5,
      steps: 1,
    },
    memories: [],
    quota: { provider: 'glm', available: false, windows: [], error: 'not configured' },
    ...overrides,
  }
}

describe('mobile console dashboard wire parser', () => {
  it('accepts the complete dashboard projection and copies arrays', () => {
    const value = parseDashboardSnapshot(snapshot({
      agents: [{
        id: 'lead', name: 'lead', role: 'lead', status: 'running', provider: 'glm', model: 'glm-5',
        usage: { inputTokens: 1, outputTokens: 2, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0, steps: 1 },
      }],
      teams: [{
        id: 'lead', leadId: 'lead',
        members: [{ id: 'lead', name: 'lead', role: 'lead', status: 'running', diagnostics: ['ok'] }],
        tasks: [{
          id: 'task-1', revision: 1, subject: 'ship', description: 'ship it', status: 'pending',
          blockedBy: [], writeScopes: ['src'], ready: true, warnings: [],
        }],
      }],
      memories: [{ id: 'memory-1', time: 2, content: 'fact', tags: ['project'], agentId: 'lead', cwd: '/tmp/project' }],
      quota: {
        provider: 'glm', available: true,
        windows: [{ name: 'day', usedPercent: 12.5, remaining: 100, resetAt: 'tomorrow' }],
      },
    }))

    expect(value.route).toEqual({ provider: 'glm', model: 'glm-5' })
    expect(value.agents[0]?.usage.inputTokens).toBe(1)
    expect(value.teams[0]?.tasks[0]?.subject).toBe('ship')
    expect(value.memories[0]?.tags).toEqual(['project'])
    expect(value.quota.windows[0]?.usedPercent).toBe(12.5)
  })

  it.each([
    ['not an object', 'dashboard response is not an object'],
    [snapshot({ agents: {} }), 'dashboard agents is not an array'],
    [snapshot({ usage: { inputTokens: -1 } }), 'dashboard field inputTokens is not a non-negative number'],
    [snapshot({ quota: { provider: 'glm', available: true, windows: 'no' } }), 'quota windows is not an array'],
    [snapshot({ memories: [{ id: 'm' }] }), 'dashboard field time is not a non-negative number'],
  ] as const)('rejects %s', (value, message) => {
    expect(() => parseDashboardSnapshot(value)).toThrow(message)
  })
})
