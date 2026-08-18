# Agent Note: Bundled DSH skills provider

Status: implemented

English | [中文](2026-08-18-bundled-dsh-skills-provider.zh.md)

## Problem

The DSH Skills 0.2.0 suite contains reusable analysis instructions, references, and report templates, but a Harness session can only discover packaged instructions when a plugin contributes them to `ctx.skills`.

## Decision

The suite is shipped as `@deepseek-ai/dsh-skills`, a bundled skill provider in the skill capability family.

The provider registers `dsh-enhancement-analysis`, `harness-runtime-optimizer`, and `repo-recon` at `BUNDLED_SKILL_RANK` with model and user invocation enabled. Each candidate points at its packaged `SKILL.md`; loading strips the frontmatter and exposes the skill directory as `resourceBase`, so the suite’s relative `references/` and `templates/` paths remain available after packaging.

The base profile carries the plugin row disabled. A deployment must explicitly enable the row before the three skills enter its catalog or affect model requests.

The archive’s suite metadata and resource files remain under the package’s published `skills/` directory. The provider reads these files at load time, while the registry owns precedence, validation, invalidation, and disposal.

The embedded suite README is source content for the bundled artifact and is excluded from the repository’s bilingual documentation pairing; the package README owns the translated plugin contract.

## Alternatives considered

**Local filesystem discovery** — rejected because the suite is package-owned content and should remain available without copying files into a user or project skill root.

**Runtime `ctx.skills.register()` calls** — rejected because a provider gives each skill a stable resource base and preserves the packaged references and templates without embedding their bodies in JavaScript.

**Enabling the provider in the default profile** — rejected because adding three model-invocable catalog entries changes prompt composition for existing deployments; explicit opt-in preserves current defaults.

## Consequences

The plugin can be mounted by a Cordis composition and is covered by the same discovery and model-facing loader path as local skills. Publishing a revised suite requires a new plugin version, and deployments should review the bundled instructions for local path assumptions before enabling them.

The package adds a provider implementation and its assets to the Host aggregate, the base bundle dependency closure, and the generated capability graph. The provider has no mutable runtime state beyond the registry registration, so its invariant companion records ownership without adding a separate runtime check.

## Verification

The package test mounts the real registry and provider, checks all three summaries, loads a body without frontmatter, verifies packaged reference and template resources, and confirms disposal removes the catalog.
