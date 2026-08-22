import { clientBundle } from '../../client/tsdown.client.ts'

export default clientBundle(
  '@deepseek-ai/dsh-experimental-mobile-agent-console',
  ['lib/types/index.js', 'lib/types/invariant.js'],
  { hostPhase: true },
)
