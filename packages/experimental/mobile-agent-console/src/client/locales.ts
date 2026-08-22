/** Mobile Agent console dictionaries. */

/** Dictionary namespace. */
export const NS = 'mobile-agent-console'

/** Chinese copy is the key-set source of truth. */
export const zh = {
  'action.open': 'Agent 控制台',
  'action.close': '关闭 Agent 控制台',
  'action.refresh': '刷新',
  'newAgent': '新建 Agent',
  'newAgentPrompt': '输入这个 Agent 的首个任务：',
  'sendTask': '派任务',
  'sendTaskPrompt': '输入要派给这个 Agent 的任务：',
  'stop': '停止',
  'actionFailed': '操作失败：{error}',
  'title': '移动 Agent 控制台',
  'description': '多 Agent 状态、任务进度、GLM 用量、额度和共享记忆。',
  'route': '当前路由',
  'agents': 'Agents',
  'teams': 'Agent Teams',
  'tasks': '任务',
  'memory': '共享记忆',
  'usage': '用量',
  'quota': 'GLM 额度',
  'steps': '步骤',
  'input': '输入',
  'output': '输出',
  'cache': '缓存',
  'reasoning': '推理',
  'completed': '已完成',
  'running': '运行中',
  'idle': '空闲',
  'provisioning': '准备中',
  'failed': '失败',
  'inactive': '未运行',
  'noAgents': '当前没有活动 Agent。',
  'noTeams': '还没有 Agent Team。',
  'noMemory': '还没有共享记忆。',
  'quotaUnavailable': '额度监控不可用：{error}',
  'loginRequired': '手机入口需要登录 token；打开网关打印的 login URL。',
  'loading': '读取中…',
  'refreshFailed': '读取失败：{error}',
  'openTranscript': '打开会话',
  'progress': '{done}/{total} 已完成',
  'reset': '重置：{time}',
} as const

/** English dictionary. */
export const en: Record<keyof typeof zh, string> = {
  'action.open': 'Agent console',
  'action.close': 'Close Agent console',
  'action.refresh': 'Refresh',
  'newAgent': 'New Agent',
  'newAgentPrompt': 'Enter the first task for this Agent:',
  'sendTask': 'Send task',
  'sendTaskPrompt': 'Enter a task for this Agent:',
  'stop': 'Stop',
  'actionFailed': 'Action failed: {error}',
  'title': 'Mobile Agent console',
  'description': 'Multi-Agent status, task progress, GLM usage, quota, and shared memory.',
  'route': 'Active route',
  'agents': 'Agents',
  'teams': 'Agent Teams',
  'tasks': 'Tasks',
  'memory': 'Shared memory',
  'usage': 'Usage',
  'quota': 'GLM quota',
  'steps': 'steps',
  'input': 'input',
  'output': 'output',
  'cache': 'cache',
  'reasoning': 'reasoning',
  'completed': 'completed',
  'running': 'running',
  'idle': 'idle',
  'provisioning': 'provisioning',
  'failed': 'failed',
  'inactive': 'inactive',
  'noAgents': 'No live Agents.',
  'noTeams': 'No Agent Teams yet.',
  'noMemory': 'No shared memory yet.',
  'quotaUnavailable': 'Quota monitor unavailable: {error}',
  'loginRequired': 'The mobile entry requires its login token; open the login URL printed by the gateway.',
  'loading': 'Loading…',
  'refreshFailed': 'Refresh failed: {error}',
  'openTranscript': 'Open transcript',
  'progress': '{done}/{total} completed',
  'reset': 'Reset: {time}',
}

/** Key domain of the mobile console namespace. */
export type MobileConsoleKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Mobile Agent console copy. */
    'mobile-agent-console': MobileConsoleKey
  }
}
