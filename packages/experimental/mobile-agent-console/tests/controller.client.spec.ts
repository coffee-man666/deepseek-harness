import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardController } from '../src/client/controller.ts'

function dashboard(): Record<string, unknown> {
  return {
    generatedAt: 1,
    route: { provider: 'glm', model: 'glm-5' },
    agents: [],
    teams: [],
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      reasoningTokens: 0,
      steps: 0,
    },
    memories: [],
    quota: { provider: 'glm', available: false, windows: [], error: 'not configured' },
  }
}

describe('mobile console Agent controls', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(dashboard()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })))
  })

  it('routes create, send, and cancel through the supplied durable actions', async () => {
    const calls: string[] = []
    const controller = new DashboardController()
    controller.setAgentActions({
      create: async (prompt) => { calls.push(`create:${prompt}`); return 'new-agent' },
      send: async (id, prompt, parentId) => { calls.push(`send:${id}:${prompt}:${parentId ?? ''}`) },
      cancel: async (id, parentId) => { calls.push(`cancel:${id}:${parentId ?? ''}`) },
    })

    await controller.createAgent('inspect the repo')
    await controller.sendAgentTask('agent-1', 'run tests', 'lead-1')
    await controller.cancelAgent('agent-1', 'lead-1')

    expect(calls).toEqual([
      'create:inspect the repo',
      'send:agent-1:run tests:lead-1',
      'cancel:agent-1:lead-1',
    ])
    expect(controller.getSnapshot().action).toBeUndefined()
    expect(controller.getSnapshot().actionError).toBeUndefined()
  })

  it('keeps an operation error visible in the panel state', async () => {
    const controller = new DashboardController()
    controller.setAgentActions({
      create: async () => 'unused',
      send: async () => { throw new Error('agent is busy') },
      cancel: async () => {},
    })

    await controller.sendAgentTask('agent-1', 'follow up')

    expect(controller.getSnapshot().action).toBeUndefined()
    expect(controller.getSnapshot().actionError).toBe('agent is busy')
  })
})
