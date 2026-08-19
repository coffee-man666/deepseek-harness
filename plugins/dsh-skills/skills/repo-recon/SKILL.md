---
name: "repo-recon"
description: "Parallel read-only recon of local git projects via subagents for survey, deep-dive, or pre-enhancement analysis."
status: proposal
version: "0.3.0"
date: "2026-08-19"
---

# Repo Recon

Two-phase local project reconnaissance with subagents. Phase 1 = quick scan (breadth). Phase 2 = deep dive (depth, only after user confirms targets). Never start the enhancement/analysis phase without explicit user confirmation.

## Parallel-subagent primitive (host-agnostic)

Both phases delegate reading to subagents. The primitive is: spawn all independent readers in ONE parallel block, then wait push-style — never poll status. Host mapping:

- Codex: `sessions_spawn` (`mode=run`, `cleanup=delete`), then one `sessions_yield`; never loop on `sessions_list`/`sessions_history`
- Other harness hosts: the host's parallel subagent facility — same shape: one spawn block, push-based completion
- No subagent facility: fall back to sequential reads and shrink scope (fewer projects, tighter budgets); say so in the report

Every subagent brief must state: READ-ONLY (never modify project files); method = README + PLAN/IMPLEMENTATION/AGENTS docs first, then main-entry source only; a reading budget; and that long output goes to report files because subagent text replies truncate.

## Phase 0 — Triage (self, no subagent)

1. List candidate projects from the roots the user named; if none were named, probe common project roots (e.g. `~/git/*/`, `~/Cursor/*/`, `~/src/*/`) and say which roots you scanned
2. Skim each README (first ~400 chars; if none, list top-level files)
3. Filter by the user's stated criteria (example: "projects with LLM orchestration"). Skip infra/tooling repos unless asked
4. If targets are ambiguous, present the candidate list and ask; otherwise proceed to Phase 1

## Phase 1 — Quick scan (parallel subagents)

- Default 3 projects per subagent; adjust group size to the project count
- Default ~15 min reading budget per project; state the budget in the brief
- Per-project report format (≤40 lines): 定位 / 技术栈 / 工作流拆解 / AI 编排点 / 编排痛点
- Write group reports to `dsh-scan/recon-scan-<group>.md`
- After completion: merge into one summary for the user (one-liner per project), then ask which projects to deep-dive

## Phase 2 — Deep dive (one subagent per confirmed target)

1. `git pull --ff-only` each target first; report branch/HEAD and new commits to the user
2. One subagent per project, spawned in one parallel block; default ~40 min reading budget
3. Feed phase-1 findings into the brief as "claims to verify and expand"
4. Deep-dive brief: every claim needs file:line evidence; sections = HEAD state / full workflow map / LLM call graph / state & cache / error handling (retry/timeout/降级 inventory) / deployment / pain-point list (each mapped to what plugin-style orchestration would fix + severity 高/中/低)
5. "未深入" annotation beats guessing; collect them into an explicit list
6. Report to `dsh-scan/recon-deep-<project>.md` (≤300 lines, 中文); final subagent reply = 1-line workflow summary + Top-5 pain points
7. Summarize both reports to the user and wait for confirmation before writing any enhancement analysis

## Rules

- GB-size repos: README + docs + core pipeline files only; never full-tree reads
- Always `git pull` before deep dive; if pull brings new commits, tell the user what changed
- Push-based completion only: yield and wait; never poll
- Deep-dive subagents get read-only scope plus exactly one writable report path each
- Record the project path + branch + HEAD in every report header
