import { useEffect, useSyncExternalStore } from 'react'
import { Button, Modal, StateDot, type StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { DashboardSnapshot, AgentWire, TeamWire } from '../wire.ts'
import { DashboardController } from './controller.ts'
import { NS, type MobileConsoleKey } from './locales.ts'
import css from './Panel.module.css'

/** Business face injected into both console slots. */
export interface ConsoleFace {
  readonly controller: DashboardController
}

/** Full props for the sidebar trigger. */
export type DashboardActionProps = PropsRuntime<'sidebar.footer.action'>
  & InjectFace<ConsoleFace>
  & PropsLocale<typeof NS>

/** Full props for the frame-wide modal. */
export type DashboardPanelProps = PropsRuntime<'shell.overlay'>
  & InjectFace<ConsoleFace>
  & PropsLocale<typeof NS>

function tokenCount(value: number): string {
  return Math.round(value).toLocaleString()
}

function statusState(status: AgentWire['status']): StateDotState {
  switch (status) {
    case 'running': return 'ongoing'
    case 'failed': return 'error'
    case 'provisioning': return 'warning'
    case 'inactive': return 'warning'
    case 'idle': return 'done'
    default: return 'warning'
  }
}

function statusKey(status: AgentWire['status']): MobileConsoleKey {
  switch (status) {
    case 'running': return 'running'
    case 'failed': return 'failed'
    case 'provisioning': return 'provisioning'
    case 'inactive': return 'inactive'
    case 'idle': return 'idle'
    default: return 'inactive'
  }
}

function progress(team: TeamWire, t: TranslateNS<typeof NS>): string {
  const active = team.tasks.filter(task => task.status !== 'deleted')
  const done = active.filter(task => task.status === 'completed').length
  return t('progress', { done, total: active.length })
}

function UsageCard({ snapshot, t }: { snapshot: DashboardSnapshot; t: TranslateNS<typeof NS> }) {
  const usage = snapshot.usage
  return (
    <section className={css.card}>
      <h3>{t('usage')}</h3>
      <div className={css.metrics}>
        <span>{t('input')} <b>{tokenCount(usage.inputTokens)}</b></span>
        <span>{t('output')} <b>{tokenCount(usage.outputTokens)}</b></span>
        <span>{t('cache')} <b>{tokenCount(usage.cacheReadTokens + usage.cacheWriteTokens)}</b></span>
        <span>{t('reasoning')} <b>{tokenCount(usage.reasoningTokens)}</b></span>
        <span>{t('steps')} <b>{tokenCount(usage.steps)}</b></span>
      </div>
    </section>
  )
}

function QuotaCard({ snapshot, t }: { snapshot: DashboardSnapshot; t: TranslateNS<typeof NS> }) {
  const quota = snapshot.quota
  return (
    <section className={css.card}>
      <h3>{t('quota')}</h3>
      {!quota.available && <p className={css.muted}>{t('quotaUnavailable', { error: quota.error ?? 'unknown error' })}</p>}
      {quota.available && quota.windows.length === 0 && <p className={css.muted}>GLM</p>}
      {quota.windows.map(window => (
        <div key={`${window.name}-${window.resetAt ?? ''}`} className={css.quotaRow}>
          <div className={css.rowHeading}><span>{window.name}</span><span>{window.usedPercent === undefined ? '' : `${Math.round(window.usedPercent)}%`}</span></div>
          {window.usedPercent !== undefined && <div className={css.bar}><span style={{ width: `${Math.max(0, Math.min(100, window.usedPercent))}%` }} /></div>}
          {window.remaining !== undefined && <span className={css.muted}>{tokenCount(window.remaining)} remaining</span>}
          {window.resetAt !== undefined && <span className={css.muted}>{t('reset', { time: window.resetAt })}</span>}
        </div>
      ))}
    </section>
  )
}

function AgentRow({ agent, controller, t }: { agent: AgentWire; controller: DashboardController; t: TranslateNS<typeof NS> }) {
  return (
    <div className={css.agentRow}>
      <button type="button" className={css.agentOpen} onClick={() => { controller.openAgent(agent.id) }} title={t('openTranscript')}>
        <StateDot state={statusState(agent.status)} />
        <span className={css.agentIdentity}>
          <b>{agent.name}</b>
          <small>{agent.provider ?? '—'} / {agent.model ?? '—'}</small>
        </span>
        <span className={css.agentStatus}>{t(statusKey(agent.status))}</span>
        <span className={css.agentUsage}>{tokenCount(agent.usage.inputTokens + agent.usage.outputTokens)} tok</span>
      </button>
      <div className={css.agentActions}>
        <Button variant="outline" size="sm" onClick={() => {
          const prompt = window.prompt(t('sendTaskPrompt'))?.trim()
          if (prompt !== undefined && prompt.length > 0) void controller.sendAgentTask(agent.id, prompt, agent.parentId)
        }}>{t('sendTask')}</Button>
        {agent.status === 'running' && <Button variant="outline" size="sm" onClick={() => { void controller.cancelAgent(agent.id, agent.parentId) }}>{t('stop')}</Button>}
      </div>
    </div>
  )
}

function TeamCard({ team, t }: { team: TeamWire; t: TranslateNS<typeof NS> }) {
  const activeTasks = team.tasks.filter(task => task.status !== 'deleted')
  return (
    <section className={css.card}>
      <div className={css.rowHeading}><h3>{team.id.slice(0, 12)}</h3><span className={css.muted}>{progress(team, t)}</span></div>
      <div className={css.teamMembers}>
        {team.members.map((member) => {
          return <span key={member.id} className={css.member}>
            <StateDot state={statusState(member.status)} />{member.name}
          </span>
        })}
      </div>
      {activeTasks.length > 0 && <div className={css.tasks}>{activeTasks.map(task => <div key={task.id} className={css.task}><StateDot state={task.status === 'completed' ? 'done' : task.status === 'in_progress' ? 'ongoing' : 'warning'} /><span>{task.subject}</span></div>)}</div>}
    </section>
  )
}

function MemoryCard({ snapshot, t }: { snapshot: DashboardSnapshot; t: TranslateNS<typeof NS> }) {
  return (
    <section className={css.card}>
      <h3>{t('memory')}</h3>
      {snapshot.memories.length === 0 && <p className={css.muted}>{t('noMemory')}</p>}
      {snapshot.memories.map(memory => <div key={memory.id} className={css.memory}><span className={css.memoryTags}>{memory.tags.join(' · ')}</span><span>{memory.content}</span></div>)}
    </section>
  )
}

/** Render the compact sidebar entry. */
export function DashboardAction({ controller, t }: DashboardActionProps) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  const active = state.snapshot?.agents.some(agent => agent.status === 'running') ?? false
  return (
    <button type="button" className={css.action} aria-label={t('action.open')} onClick={() => { controller.toggle() }}>
      <StateDot state={active ? 'ongoing' : 'done'} />
      <span>{t('action.open')}</span>
    </button>
  )
}

/** Render the full frame-wide mobile console modal. */
export function DashboardPanel({ controller, t }: DashboardPanelProps) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  useEffect(() => {
    if (!state.open) return
    void controller.refresh()
    const timer = window.setInterval(() => { void controller.refresh() }, 5_000)
    return () => { window.clearInterval(timer) }
  }, [controller, state.open])

  const snapshot = state.snapshot
  return (
    <Modal
      open={state.open}
      onClose={() => { controller.close() }}
      title={t('title')}
      closeLabel={t('action.close')}
      description={t('description')}
      className={css.dialog ?? ''}
      contentClassName={css.modalContent ?? ''}
    >
      <div className={css.toolbar}>
        <span className={css.route}>{t('route')}: <b>{snapshot?.route.provider ?? '—'} / {snapshot?.route.model ?? '—'}</b></span>
        <Button variant="outline" size="sm" onClick={() => { void controller.refresh() }}>{t('action.refresh')}</Button>
      </div>
      {state.loading && snapshot === undefined && <p className={css.muted}>{t('loading')}</p>}
      {state.error !== undefined && <p className={css.error}>{state.error === 'login-required' ? t('loginRequired') : t('refreshFailed', { error: state.error })}</p>}
      {snapshot !== undefined && (
        <div className={css.contentGrid}>
          <section className={`${css.card} ${css.wideCard}`}>
            <div className={css.rowHeading}>
              <h3>{t('agents')}</h3>
              <Button variant="outline" size="sm" onClick={() => {
                const prompt = window.prompt(t('newAgentPrompt'))?.trim()
                if (prompt !== undefined && prompt.length > 0) void controller.createAgent(prompt)
              }}>{t('newAgent')}</Button>
            </div>
            {state.actionError !== undefined && <p className={css.error}>{t('actionFailed', { error: state.actionError })}</p>}
            {snapshot.agents.length === 0 && <p className={css.muted}>{t('noAgents')}</p>}
            {snapshot.agents.map(agent => <AgentRow key={agent.id} agent={agent} controller={controller} t={t} />)}
          </section>
          <UsageCard snapshot={snapshot} t={t} />
          <QuotaCard snapshot={snapshot} t={t} />
          <section className={`${css.card} ${css.wideCard}`}>
            <h3>{t('teams')}</h3>
            {snapshot.teams.length === 0 && <p className={css.muted}>{t('noTeams')}</p>}
            {snapshot.teams.map(team => <TeamCard key={team.id} team={team} t={t} />)}
          </section>
          <div className={css.wideCard}><MemoryCard snapshot={snapshot} t={t} /></div>
        </div>
      )}
    </Modal>
  )
}
