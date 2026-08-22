# Agent Note: Codex dsh-skills plugin packaging

Status: implemented

English | [中文](2026-08-18-codex-dsh-skills-plugin.zh.md)

## Problem

The DSH Skills suite needs a Codex plugin manifest and plugin-root skill layout to be discoverable by Codex. The DSH bundled provider only registers the same content inside a DSH runtime.

## Decision

The suite is packaged at `plugins/dsh-skills` as a Codex plugin. `.codex-plugin/plugin.json` declares `dsh-skills` version `0.2.0`, its interface metadata, and `./skills/`; every non-directory archive entry is preserved byte-for-byte beneath that directory. This keeps the three `SKILL.md` files and all references and templates available without MCP, app, or hook integrations.

The repository retains `@deepseek-ai/dsh-skills` as the DSH runtime integration. These are separate loader artifacts for Codex and DSH and share the workflow content; the runtime provider decision is recorded in [the bundled provider note](2026-08-18-bundled-dsh-skills-provider.md).

The repository does not create a personal or repo marketplace entry. This change defines the plugin artifact and leaves installation or distribution to an explicit marketplace or local-path workflow.

## Alternatives considered

**Only the DSH provider** — rejected because a DSH provider does not create the `.codex-plugin/plugin.json` and `skills/` layout required for Codex discovery.

**Put skill directories at the plugin root** — rejected because Codex discovers skill components from the plugin `skills/` directory; the archive is placed beneath that directory while retaining its internal resource paths.

**Create a marketplace entry during packaging** — rejected because marketplace registration changes installation metadata and was not part of defining the plugin artifact.

## Consequences

The suite can be loaded as a local Codex plugin and retains its references and report templates. The same workflow content exists in both the DSH package and Codex plugin, so future suite revisions must update both published artifacts or deliberately record a version split. The plugin remains guidance-only and declares no external integrations or credentials.

## Verification

The official `plugin-creator` validator passes, and every non-directory entry from `dsh-skills-v0.2.0.zip` compares byte-for-byte with the plugin resource tree.
