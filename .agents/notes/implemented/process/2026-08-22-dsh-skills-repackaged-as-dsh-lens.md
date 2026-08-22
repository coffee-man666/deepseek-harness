# Agent Note: dsh-skills repackaged as the standalone dsh-lens plugin

Status: implemented

English | [中文](2026-08-22-dsh-skills-repackaged-as-dsh-lens.zh.md)

## Problem

The dsh-skills suite had two publication surfaces inside this monorepo — the Codex plugin (`plugins/dsh-skills`, installed through `codex plugin marketplace`) and the bundled harness provider (`packages/skill/skills`, `@deepseek-ai/dsh-skills`, disabled in the base profile) — kept byte-identical by `verify-dsh-skills-sync`. The intended audience was the third-party DSH plugin ecosystem (`github.com/topics/dsh-plugin`), whose plugins are standalone npm packages installed with `dsh plugin --profile <name> add`, not Codex marketplace plugins and not harness-bundled providers.

## Decision

Retire both in-repo surfaces and ship the suite solely as **dsh-lens** ([github.com/coffee-man666/dsh-lens](https://github.com/coffee-man666/dsh-lens), npm name `@deepseek-ai/dsh-lens`, suite version 0.5.0): a bundle package declaring `dsh.bundle.patch`, a packaged skill provider (`source: 'dsh-lens'`) at `BUNDLED_SKILL_RANK`, and the skills tree migrated byte-identical from 0.4.0. Skill names are unchanged.

Removed here: `plugins/dsh-skills/`, `.agents/plugins/marketplace.json`, `packages/skill/skills/`, `scripts/verify-dsh-skills-sync.ts`, the root script and its `run-gates` entry, the workspace-constraints resource entry, the translation-pairing exclusions, and the base-profile row and dependency. `docs/subsystems/skills.md` and `docs/capability-seams.md` (+zh) now name `dsh-skill-badge` as the packaged-provider example and point readers to dsh-lens; the generated catalogs were regenerated.

## Consequences

- One publication surface removes the byte-identity gate and its four metadata carriers; the new repo carries its own `pnpm verify` (VERSION ↔ SKILL.md frontmatter ↔ provider METADATA ↔ package.json).
- Suite releases version independently of harness releases; the peers (`@deepseek-ai/cordis`, `@deepseek-ai/dsh-skill`) resolve from the user's DSH installation, so no npm publication of harness packages is implied.
- The base profile loses a permanently-disabled row; users who want the suite add one bundle explicitly (`dsh plugin --profile <name> add github:coffee-man666/dsh-lens`).
- The retired-path links in the three 2026-08-18/19 feature notes above were unlinked in place so the link and package-path gates stay green on historical records.

## Alternatives considered

- Renaming the Codex plugin in place: rejected — it keeps the wrong installation surface (Codex marketplace, not the DSH plugin system) and the dual-publication sync gate.
- An in-repo enabling bundle that flips the base-profile `disabled` flag: rejected — it still couples every suite release to a harness release and keeps two trees to synchronize.
- Keeping the bundled provider as a fallback: rejected — two sources of truth for the same four skills is exactly the structure this change removes.
