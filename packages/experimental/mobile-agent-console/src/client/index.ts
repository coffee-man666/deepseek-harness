/** Browser surfaces for the mobile Agent console. */

import type { ClientContext, SessionId, SessionRuntime } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { DashboardController } from './controller.ts'
import { DashboardAction, DashboardPanel, type ConsoleFace } from './Panel.tsx'
import { en, NS, zh } from './locales.ts'

/** Services required by the action and modal slots. */
export const inject = ['slots', 'locale', 'sessions']

/** Mount the locale dictionaries, sidebar trigger, and frame-wide dashboard. */
export function apply(ctx: ClientContext): void {
  const controller = new DashboardController()
  const sessions = ctx.get('sessions') as SessionRuntime
  controller.setSessionOpener((id) => { sessions.open(id as SessionId) })
  const sessionFor = async (id: string, parentId?: string) => {
    const sessionId = id as SessionId
    let binding = sessions.binding(sessionId)
    if (binding === undefined && parentId !== undefined) {
      await sessions.refreshSubagents(parentId as SessionId)
      const address = sessions.subagentAddress(sessionId)
      if (address !== undefined) sessions.openSubagent(address)
      binding = sessions.binding(sessionId)
    }
    if (binding === undefined) throw new Error(`Agent "${id}" is not available in this browser session`)
    return binding.session
  }
  controller.setAgentActions({
    async create(prompt) {
      const id = await sessions.create()
      const session = await sessionFor(String(id))
      const result = await session.prompt([{ type: 'text', text: prompt }], 'queue')
      if (!result.ok) throw new Error(result.error.message)
      sessions.open(id)
      return String(id)
    },
    async send(id, prompt, parentId) {
      const result = await (await sessionFor(id, parentId)).prompt([{ type: 'text', text: prompt }], 'queue')
      if (!result.ok) throw new Error(result.error.message)
    },
    async cancel(id, parentId) {
      const result = await (await sessionFor(id, parentId)).cancel()
      if (!result.ok) throw new Error(result.error.message)
    },
  })
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'mobile-agent-console: dictionaries')
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'mobile-agent-console',
    order: 40,
    locale: NS,
    inject: (): ConsoleFace => ({ controller }),
  }, DashboardAction))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'mobile-agent-console',
    order: 100,
    locale: NS,
    inject: (): ConsoleFace => ({ controller }),
  }, DashboardPanel))
  ctx.effect(() => () => { controller.dispose() }, 'mobile-agent-console: controller')
}
