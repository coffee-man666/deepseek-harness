---
name: "repo-recon"
description: "Parallel read-only recon of local git projects via subagents for survey, deep-dive, or pre-enhancement analysis."
status: proposal
version: "0.2.0"
date: "2026-08-18"
---

# Repo Recon

Two-phase local project reconnaissance with subagents. Phase 1 = quick scan (breadth). Phase 2 = deep dive (depth, only after user confirms targets). Never start the enhancement/analysis phase without explicit user confirmation.

## Phase 0 — Triage (self, no subagent)

1. `ls -d ~/git/*/` and `du -sh ~/git/*/ | sort -rh | head -20`
2. Read first ~400 chars of each README (`ls | grep -i readme`); if none, list top-level files
3. Filter by the user's stated criteria (e.g. trading-related + heavy AI orchestration). Skip infra/tooling repos unless asked
4. If targets are ambiguous, present the candidate list and ask; otherwise proceed to Phase 1

## Phase 1 — Quick scan (parallel subagents)

- 3 projects per subagent; spawn all groups in ONE parallel tool block
- `sessions_spawn`: `mode=run`, `cleanup=delete`, `taskName=scan-group-{a,b,c}`
- Subagent brief must state: READ-ONLY (never modify project files); method = README + PLAN/IMPLEMENTATION/AGENTS docs first, then main-entry source only; ~15 min reading budget per project; write report to `recon/scan-group-X.md` in the workspace (subagent text replies truncate — long output goes to files)
- Per-project report format (≤40 lines): 定位 / 技术栈 / 工作流拆解 / AI 编排点 / 编排痛点
- After spawning: `sessions_yield` once; never poll `sessions_list`/`sessions_history`
- On completion: merge into one summary for the user (one-liner per project), then ask which projects to deep-dive

## Phase 2 — Deep dive (one subagent per confirmed target)

1. `git pull --ff-only` each target first; report branch/HEAD and new commits to the user
2. Spawn one subagent per project in ONE parallel block, `taskName=deep-<project>`
3. Feed phase-1 findings into the brief as "claims to verify and expand"
4. Deep-dive brief: every claim needs file:line evidence; sections = HEAD state / full workflow map / LLM call graph / state & cache / error handling (retry/timeout/降级 inventory) / deployment / pain-point list (each mapped to what plugin-style orchestration would fix + severity 高/中/低)
5. ~40 min reading budget; "未深入" annotation beats guessing
6. Report to `recon/deep-<project>.md` (≤300 lines, 中文); final subagent reply = 1-line workflow summary + Top-5 pain points
7. Summarize both reports to the user and wait for confirmation before writing any enhancement analysis

## Rules

- GB-size repos: README + docs + core pipeline files only; never full-tree reads
- Always `git pull` before deep dive; if pull brings new commits, tell the user what changed
- Respect push-based completion: yield and wait; do not loop on status checks
- Deep-dive subagents get read-only scope plus exactly one writable report path each
