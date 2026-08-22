import { parseDashboardSnapshot, type DashboardSnapshot } from '../wire.ts'

/** Observable browser state for the mobile console modal. */
export interface DashboardControllerState {
  readonly open: boolean
  readonly loading: boolean
  readonly snapshot: DashboardSnapshot | undefined
  readonly error: string | undefined
  readonly action: 'create' | 'send' | 'cancel' | undefined
  readonly actionError: string | undefined
}

/** Browser actions that reuse the runtime's durable Session verbs. */
export interface DashboardAgentActions {
  /** Create a new ordinary Agent and deliver its first task. */
  create(prompt: string): Promise<string>
  /** Deliver a task to an existing Agent or continuable teammate. */
  send(id: string, prompt: string, parentId?: string): Promise<void>
  /** Stop an existing Agent or continuable teammate. */
  cancel(id: string, parentId?: string): Promise<void>
}

const INITIAL: DashboardControllerState = {
  open: false,
  loading: false,
  snapshot: undefined,
  error: undefined,
  action: undefined,
  actionError: undefined,
}

/** Fetches the Host snapshot and owns the modal's small external-store state. */
export class DashboardController {
  private state: DashboardControllerState = INITIAL
  private readonly listeners = new Set<() => void>()
  private openSession: (id: string) => void = () => {}
  private agentActions: DashboardAgentActions | undefined

  /** Return the stable current snapshot for `useSyncExternalStore`. */
  getSnapshot = (): DashboardControllerState => this.state

  /** Subscribe one browser component to state changes. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /**
   * Give the controller the runtime's session-navigation action.
   * @param openSession - callback that opens an Agent transcript by id.
   */
  setSessionOpener(openSession: (id: string) => void): void {
    this.openSession = openSession
  }

  /**
   * Give the controller durable Agent operations supplied by the client runtime.
   * @param actions - create, send, and cancel operations over real Sessions.
   */
  setAgentActions(actions: DashboardAgentActions): void {
    this.agentActions = actions
  }

  /** Open or close the dashboard. */
  toggle(): void {
    this.setState({ open: !this.state.open })
  }

  /** Close the dashboard modal. */
  close(): void {
    if (this.state.open) this.setState({ open: false })
  }

  /**
   * Navigate to one Agent's transcript from the dashboard.
   * @param id - Agent/session id to open.
   */
  openAgent(id: string): void {
    this.openSession(id)
    this.close()
  }

  /**
   * Create a real Agent and queue its first task.
   * @param prompt - complete first task for the new Agent.
   * @returns completion after the Host accepts the task.
   */
  async createAgent(prompt: string): Promise<void> {
    const actions = this.agentActions
    if (actions === undefined) throw new Error('Agent controls are unavailable')
    await this.runAction('create', () => actions.create(prompt))
  }

  /**
   * Queue a task for one existing Agent.
   * @param id - opaque Agent/session id from the dashboard.
   * @param prompt - task text to queue.
   * @param parentId - optional direct Team Lead id for teammate resolution.
   * @returns completion after the Host accepts the task.
   */
  async sendAgentTask(id: string, prompt: string, parentId?: string): Promise<void> {
    const actions = this.agentActions
    if (actions === undefined) throw new Error('Agent controls are unavailable')
    await this.runAction('send', () => actions.send(id, prompt, parentId))
  }

  /**
   * Stop one running Agent.
   * @param id - opaque Agent/session id from the dashboard.
   * @param parentId - optional direct Team Lead id for teammate resolution.
   * @returns completion after the Host admits the cancellation.
   */
  async cancelAgent(id: string, parentId?: string): Promise<void> {
    const actions = this.agentActions
    if (actions === undefined) throw new Error('Agent controls are unavailable')
    await this.runAction('cancel', () => actions.cancel(id, parentId))
  }

  /** Refresh the dashboard route without caching. */
  async refresh(): Promise<void> {
    if (this.state.loading) return
    this.setState({ loading: true, error: undefined })
    try {
      const response = await fetch('/api/mobile-agent-console', { cache: 'no-store' })
      if (!response.ok) throw new Error(response.status === 401 ? 'login-required' : `HTTP ${response.status}`)
      const payload: unknown = await response.json()
      this.setState({ loading: false, snapshot: parseDashboardSnapshot(payload), error: undefined })
    } catch (error) {
      this.setState({
        loading: false,
        error: error instanceof Error ? error.message : 'dashboard request failed',
      })
    }
  }

  /** Release browser listeners on plugin teardown. */
  dispose(): void {
    this.listeners.clear()
  }

  private async runAction(
    action: 'create' | 'send' | 'cancel',
    operation: () => Promise<unknown>,
  ): Promise<void> {
    this.setState({ action, actionError: undefined })
    try {
      await operation()
      await this.refresh()
      this.setState({ action: undefined })
    } catch (error) {
      this.setState({
        action: undefined,
        actionError: error instanceof Error ? error.message : 'Agent operation failed',
      })
    }
  }

  private setState(next: Partial<DashboardControllerState>): void {
    this.state = { ...this.state, ...next }
    for (const listener of this.listeners) listener()
  }
}
