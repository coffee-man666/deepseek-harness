# Agent Note: DSH skills suite 0.3.0 revision

Status: implemented

English | [中文](2026-08-19-dsh-skills-suite-revision.zh.md)

## Problem

The first real run of the suite (a two-subagent analysis of an external LLM-pipeline project) exposed four defects: `dsh-capabilities.md` named `ctx.sessions.fork()`, which does not exist in the v0.1.0-rc.7 source; `dsh-enhancement-analysis` looked for a recon report under `dsh-scan/` while `repo-recon` wrote it under `recon/`, so the documented handoff never connected; both skills hardcoded personal paths (`~/git/deepseek-harness`, private repository names); and `repo-recon` expressed its parallelism in Codex-specific tool names, unusable verbatim on any other host.

## Decision

Suite version 0.3.0 corrects the primitive inventory against the local source: subagent delegation (`ctx.subagents.start()` with the in-process fork/spawn providers), the `llm/stream` waterfall, `agent/request-error` with `dsh-llm-retry`, `dsh-token-meter`, and the guard plugins replace the idealized names. A resolution rule (`$DSH_ROOT` → common locations → GitHub) replaces the hardcoded source path. All suite artifacts now share one `dsh-scan/` root, which fixes the handoff path. `repo-recon` states a host-agnostic spawn-block/push-completion primitive with a host mapping and a sequential fallback. `harness-runtime-optimizer` keeps the loop skeleton and rules in SKILL.md and moves the phase checklists to `references/runtime-optimizer-phases.md`, cutting the always-loaded skill body to a third. The report template records the target repo/branch/HEAD and adds dedicated sections for non-DSH findings and the 未深入 list, because the trial run showed both were being dropped.

The two published trees previously relied on a prose warning in the 0.2.0 notes to stay in sync. `scripts/verify-dsh-skills-sync.ts` now asserts byte equality between `packages/skill/skills/skills` and `plugins/dsh-skills/skills` in both directions, plus version agreement across `VERSION`, every SKILL.md frontmatter, the Codex manifest, and the provider's hardcoded METADATA. It runs in the `doc-sync` gate list.

## Alternatives considered

**Keep `ctx.sessions.fork()` as an aspirational name** — rejected: a fact-checking skill that fails its own fact check has no authority, and the real subagent seam covers the same use cases.

**Per-host skill forks instead of a host-agnostic primitive** — rejected: one primitive with a host mapping keeps a single suite to maintain; the mapping is three lines.

**Rebalance the optimizer by trimming rules instead of extracting phases** — rejected: the rules are the non-negotiables; the phase checklists are reference material that only matters mid-phase.

## Consequences

Skill revisions must now update both published trees and bump the version in six places, and the gate fails the build if any of them drift — the 0.2.0 note's "update both artifacts or record a version split" instruction is enforced mechanically. Suite consumers on hosts without a subagent facility get an explicit sequential fallback instead of undefined behavior. The corrected capability map is pinned to rc.7; the map's own header still requires re-verification against newer checkouts, and the DSH-source resolution rule records which source an analysis actually used.

## Verification

`pnpm run verify-dsh-skills-sync` reports 11 identical files and one version across six carriers; `pnpm vitest run packages/skill/skills` passes with the updated METADATA expectation. The revised `dsh-enhancement-analysis` was re-applied to the same external project; its report now carries the target HEAD, the non-DSH findings section, and the 未深入 list.
