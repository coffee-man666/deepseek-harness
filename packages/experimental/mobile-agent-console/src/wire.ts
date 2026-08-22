/** Browser-safe JSON vocabulary shared by the mobile console's Host and Client faces. */

/** Provider-reported token totals for one live Agent or the whole console. */
export interface UsageWire {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly cacheReadTokens: number
  readonly cacheWriteTokens: number
  readonly reasoningTokens: number
  readonly steps: number
}

/** One live Agent row projected for the dashboard. */
export interface AgentWire {
  readonly id: string
  readonly name: string
  readonly role: 'lead' | 'teammate' | 'agent'
  readonly status: 'idle' | 'running' | 'inactive' | 'provisioning' | 'failed'
  readonly provider?: string
  readonly model?: string
  readonly cwd?: string
  readonly parentId?: string
  readonly usage: UsageWire
}

/** One Agent Teams roster row. */
export interface TeamMemberWire {
  readonly id: string
  readonly name: string
  readonly role: 'lead' | 'teammate'
  readonly status: AgentWire['status']
  readonly description?: string
  readonly provider?: string
  readonly context?: 'fresh' | 'fork'
  readonly model?: string
  readonly diagnostics: readonly string[]
}

/** One Agent Teams shared task row. */
export interface TeamTaskWire {
  readonly id: string
  readonly revision: number
  readonly subject: string
  readonly description: string
  readonly status: 'pending' | 'in_progress' | 'completed' | 'deleted'
  readonly blockedBy: readonly string[]
  readonly writeScopes: readonly string[]
  readonly ownerName?: string
  readonly ready: boolean
  readonly warnings: readonly string[]
}

/** One implicit Agent Team rooted at a Lead session. */
export interface TeamWire {
  readonly id: string
  readonly leadId: string
  readonly members: readonly TeamMemberWire[]
  readonly tasks: readonly TeamTaskWire[]
}

/** One bounded memory record from the project-shared JSONL store. */
export interface MemoryWire {
  readonly id: string
  readonly time: number
  readonly content: string
  readonly tags: readonly string[]
  readonly agentId: string
  readonly cwd: string
}

/** One quota window returned by the configured provider monitor. */
export interface QuotaWindowWire {
  readonly name: string
  readonly usedPercent?: number
  readonly remaining?: number
  readonly resetAt?: string
}

/** Provider quota state; unavailable is a normal state when no monitor key is configured. */
export interface QuotaWire {
  readonly provider: string
  readonly available: boolean
  readonly windows: readonly QuotaWindowWire[]
  readonly error?: string
}

/** Complete dashboard response. */
export interface DashboardSnapshot {
  readonly generatedAt: number
  readonly route: { readonly provider: string; readonly model: string }
  readonly agents: readonly AgentWire[]
  readonly teams: readonly TeamWire[]
  readonly usage: UsageWire
  readonly memories: readonly MemoryWire[]
  readonly quota: QuotaWire
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('mobile-agent-console: dashboard response is not an object')
  }
  return value as Record<string, unknown>
}

function stringField(row: Record<string, unknown>, name: string): string {
  const value = row[name]
  if (typeof value !== 'string') throw new TypeError(`mobile-agent-console: dashboard field ${name} is not a string`)
  return value
}

function numberField(row: Record<string, unknown>, name: string): number {
  const value = row[name]
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`mobile-agent-console: dashboard field ${name} is not a non-negative number`)
  }
  return value
}

function usageField(value: unknown): UsageWire {
  const row = record(value)
  return {
    inputTokens: numberField(row, 'inputTokens'),
    outputTokens: numberField(row, 'outputTokens'),
    cacheReadTokens: numberField(row, 'cacheReadTokens'),
    cacheWriteTokens: numberField(row, 'cacheWriteTokens'),
    reasoningTokens: numberField(row, 'reasoningTokens'),
    steps: numberField(row, 'steps'),
  }
}

function stringArray(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
    throw new TypeError(`mobile-agent-console: dashboard field ${name} is not a string array`)
  }
  return [...value]
}

/**
 * Parse and validate an untrusted dashboard fetch response.
 * @param value - JSON value returned by the Host dashboard route.
 * @returns the validated browser-safe dashboard snapshot.
 */
export function parseDashboardSnapshot(value: unknown): DashboardSnapshot {
  const row = record(value)
  const route = record(row.route)
  const agents = Array.isArray(row.agents) ? row.agents.map((item) => {
    const agent = record(item)
    return {
      id: stringField(agent, 'id'),
      name: stringField(agent, 'name'),
      role: stringField(agent, 'role') as AgentWire['role'],
      status: stringField(agent, 'status') as AgentWire['status'],
      ...(typeof agent.provider === 'string' ? { provider: agent.provider } : {}),
      ...(typeof agent.model === 'string' ? { model: agent.model } : {}),
      ...(typeof agent.cwd === 'string' ? { cwd: agent.cwd } : {}),
      ...(typeof agent.parentId === 'string' ? { parentId: agent.parentId } : {}),
      usage: usageField(agent.usage),
    }
  }) : (() => { throw new TypeError('mobile-agent-console: dashboard agents is not an array') })()
  const teams = Array.isArray(row.teams) ? row.teams.map((item) => {
    const team = record(item)
    const members = Array.isArray(team.members) ? team.members.map((memberValue) => {
      const member = record(memberValue)
      const context: 'fresh' | 'fork' | undefined = member.context === 'fresh'
        ? 'fresh'
        : member.context === 'fork' ? 'fork' : undefined
      return {
        id: stringField(member, 'id'),
        name: stringField(member, 'name'),
        role: stringField(member, 'role') as TeamMemberWire['role'],
        status: stringField(member, 'status') as TeamMemberWire['status'],
        ...(typeof member.description === 'string' ? { description: member.description } : {}),
        ...(typeof member.provider === 'string' ? { provider: member.provider } : {}),
        ...(context === undefined ? {} : { context }),
        ...(typeof member.model === 'string' ? { model: member.model } : {}),
        diagnostics: stringArray(member.diagnostics, 'diagnostics'),
      }
    }) : (() => { throw new TypeError('mobile-agent-console: team members is not an array') })()
    const tasks = Array.isArray(team.tasks) ? team.tasks.map((taskValue) => {
      const task = record(taskValue)
      const status = stringField(task, 'status') as TeamTaskWire['status']
      return {
        id: stringField(task, 'id'),
        revision: numberField(task, 'revision'),
        subject: stringField(task, 'subject'),
        description: stringField(task, 'description'),
        status,
        blockedBy: stringArray(task.blockedBy, 'blockedBy'),
        writeScopes: stringArray(task.writeScopes, 'writeScopes'),
        ...(typeof task.ownerName === 'string' ? { ownerName: task.ownerName } : {}),
        ready: task.ready === true,
        warnings: stringArray(task.warnings, 'warnings'),
      }
    }) : (() => { throw new TypeError('mobile-agent-console: team tasks is not an array') })()
    return { id: stringField(team, 'id'), leadId: stringField(team, 'leadId'), members, tasks }
  }) : (() => { throw new TypeError('mobile-agent-console: dashboard teams is not an array') })()
  const memories = Array.isArray(row.memories) ? row.memories.map((memoryValue) => {
    const memory = record(memoryValue)
    return {
      id: stringField(memory, 'id'),
      time: numberField(memory, 'time'),
      content: stringField(memory, 'content'),
      tags: stringArray(memory.tags, 'tags'),
      agentId: stringField(memory, 'agentId'),
      cwd: stringField(memory, 'cwd'),
    }
  }) : (() => { throw new TypeError('mobile-agent-console: dashboard memories is not an array') })()
  const quota = record(row.quota)
  const windows = Array.isArray(quota.windows) ? quota.windows.map((windowValue) => {
    const window = record(windowValue)
    return {
      name: stringField(window, 'name'),
      ...(typeof window.usedPercent === 'number' ? { usedPercent: window.usedPercent } : {}),
      ...(typeof window.remaining === 'number' ? { remaining: window.remaining } : {}),
      ...(typeof window.resetAt === 'string' ? { resetAt: window.resetAt } : {}),
    }
  }) : (() => { throw new TypeError('mobile-agent-console: quota windows is not an array') })()
  return {
    generatedAt: numberField(row, 'generatedAt'),
    route: { provider: stringField(route, 'provider'), model: stringField(route, 'model') },
    agents,
    teams,
    usage: usageField(row.usage),
    memories,
    quota: {
      provider: stringField(quota, 'provider'),
      available: quota.available === true,
      windows,
      ...(typeof quota.error === 'string' ? { error: quota.error } : {}),
    },
  }
}
