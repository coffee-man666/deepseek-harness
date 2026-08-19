# Changelog

## 0.3.2 — 2026-08-19

- Re-verified the capability map against upstream v0.1.0-rc.8 after merging: the mapped surfaces (pi-ai profile fields, subagent start request, retry/meter seams) are unchanged; the schema-subset and AgentOptions findings remain open.

## 0.3.1 — 2026-08-19

- Publication hygiene: the DSH-source probe locations and repo-recon project-root examples use conventional directory names only; no operator-specific paths remain in the published artifacts.

## 0.3.0 — 2026-08-19

- Corrected DSH primitive names against the v0.1.0-rc.7 source: subagent delegation (`ctx.subagents.start()`, fork/spawn providers) replaces the nonexistent `ctx.sessions.fork()`; `llm/stream` waterfall and `agent/request-error` documented as the retry/routing seams.
- Added a DSH-source resolution rule (`$DSH_ROOT` → common locations → GitHub) replacing the hardcoded `~/git/deepseek-harness` path; removed private-repo references.
- Unified all suite artifacts under `dsh-scan/` and fixed the recon-report handoff path that `dsh-enhancement-analysis` expected but `repo-recon` never wrote.
- `repo-recon`: host-agnostic parallel-subagent primitive with a host mapping and sequential fallback; neutral project-root discovery; budgets and group sizes are stated defaults.
- `harness-runtime-optimizer`: SKILL.md slimmed to the loop skeleton and rules; phase checklists moved to `references/runtime-optimizer-phases.md`.
- Report template gains target repo/branch/HEAD header fields, a non-DSH findings section, and an explicit 未深入 list.

## 0.2.0 — 2026-08-18

- Added `harness-runtime-optimizer`.
- Added runtime policy catalog covering model routing, context, retry/fallback, stopping, tools, branching, arbiter/merge, budgets, execution worlds, sessions/memory, and observability.
- Added a controlled experiment methodology with baseline/candidate scorecards and ADOPT / REJECT / SEGMENT decisions.
- Added an explicit path from static DSH migration analysis to empirical runtime-loop optimization.
- Added package-level `README.md`, `VERSION`, and this changelog.
- Updated existing skills to package version 0.2.0 and added handoff guidance into runtime optimization.
