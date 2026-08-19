/**
 * Content-integrity gate for the DSH skills suite. The same suite ships as two
 * published artifacts — the bundled provider package (`packages/skill/skills`)
 * and the Codex plugin (`plugins/dsh-skills`) — so this gate asserts both stay
 * byte-identical and that the suite version agrees across every metadata
 * carrier: the VERSION file, each SKILL.md frontmatter, the Codex plugin
 * manifest, and the provider's hardcoded METADATA.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const packageTree = resolve(root, 'packages/skill/skills/skills')
const pluginTree = resolve(root, 'plugins/dsh-skills/skills')
const pluginManifest = resolve(root, 'plugins/dsh-skills/.codex-plugin/plugin.json')
const providerSource = resolve(root, 'packages/skill/skills/src/index.ts')

function listFiles(dir: string, base = dir): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry)
    if (statSync(abs).isDirectory()) out.push(...listFiles(abs, base))
    else out.push(relative(base, abs))
  }
  return out.sort()
}

const failures: string[] = []
function fail(message: string): void {
  failures.push(message)
}

// 1. The two published trees carry identical bytes.
const packageFiles = listFiles(packageTree)
const pluginFiles = listFiles(pluginTree)
for (const rel of packageFiles) {
  if (!pluginFiles.includes(rel)) {
    fail(`missing in plugins/dsh-skills/skills: ${rel}`)
    continue
  }
  const left = readFileSync(join(packageTree, rel))
  const right = readFileSync(join(pluginTree, rel))
  if (!left.equals(right)) fail(`content differs between the two published trees: ${rel}`)
}
for (const rel of pluginFiles) {
  if (!packageFiles.includes(rel)) fail(`missing in packages/skill/skills/skills: ${rel}`)
}

// 2. The suite version agrees across every metadata carrier.
const versionFile = readFileSync(join(packageTree, 'VERSION'), 'utf8').trim()
const versionRe = /version:\s*"?(\d+\.\d+\.\d+)"?/
const manifestVersion = JSON.parse(readFileSync(pluginManifest, 'utf8'))['version'] as string
const metadataMatch = /version:\s*'(\d+\.\d+\.\d+)'/u.exec(readFileSync(providerSource, 'utf8'))
if (!metadataMatch) fail('provider METADATA in packages/skill/skills/src/index.ts has no parseable version')

const carriers: [name: string, value: string][] = [
  ['skills/VERSION', versionFile],
  ['plugins/dsh-skills/.codex-plugin/plugin.json', manifestVersion],
  ['packages/skill/skills/src/index.ts METADATA', metadataMatch?.[1] ?? '<unparseable>'],
]
for (const skillMd of packageFiles.filter(rel => rel.endsWith('SKILL.md'))) {
  const match = versionRe.exec(readFileSync(join(packageTree, skillMd), 'utf8'))
  if (!match) {
    fail(`${skillMd} frontmatter has no parseable version`)
    continue
  }
  carriers.push([skillMd, match[1] ?? '<missing>'])
}
for (const [name, value] of carriers) {
  if (value !== versionFile) fail(`${name} version ${value} does not match VERSION ${versionFile}`)
}

if (failures.length > 0) {
  console.error('verify-dsh-skills-sync: the two published skill suites diverged:')
  for (const failure of failures) console.error(`  ${failure}`)
  process.exit(1)
}

console.log(`verify-dsh-skills-sync: ${packageFiles.length} file(s) identical in both trees; suite version ${versionFile} consistent across ${carriers.length} metadata carriers.`)
