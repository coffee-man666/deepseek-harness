import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

/** Cordis companion plugin name. */
export const name = 'mobile-agent-console-invariant'

/**
 * This package owns no independent durable event vocabulary. Agent Teams and
 * Session remain the authorities for the records the dashboard reads, while
 * memory is an explicitly bounded user file rather than a session projection.
 */
export const inject = ['invariants']

/**
 * No runtime invariant: Agent Teams and Session own the durable records this
 * dashboard projects, while memory is an explicitly bounded user file.
 */
const install: InvariantInstaller = () => {}

/** Register the intentionally empty package invariant. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register('@deepseek-ai/dsh-experimental-mobile-agent-console', install))
