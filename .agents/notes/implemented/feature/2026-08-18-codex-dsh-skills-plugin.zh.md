# Agent Note: Codex dsh-skills plugin packaging

Status: implemented

[English](2026-08-18-codex-dsh-skills-plugin.md) | 中文

## Problem

DSH Skills 套件需要 Codex 插件 manifest 和插件根目录下的 skill 布局，才能被 Codex 发现。DSH bundled provider 只会在 DSH runtime 内注册同一套内容。

## Decision

该套件以 Codex 插件形式放在 `plugins/dsh-skills`。`.codex-plugin/plugin.json` 声明 `dsh-skills` 的 `0.2.0` 版本、界面元数据和 `./skills/`；压缩包中的每个非目录条目都在该目录下逐字节保留。这让三个 `SKILL.md` 以及全部 references 和 templates 可用，同时不需要 MCP、app 或 hook 集成。

仓库保留 `@deepseek-ai/dsh-skills` 作为 DSH runtime 集成。这两个产物分别面向 Codex 和 DSH 的不同加载器，并共享工作流内容；runtime 提供方的决策记录在[bundled provider 说明](2026-08-18-bundled-dsh-skills-provider.md)中。

仓库不创建个人或仓库 marketplace 条目。本次变更定义插件产物，安装或分发交由明确的 marketplace 或本地路径流程处理。

## Alternatives considered

**只保留 DSH provider**——不采用，因为 DSH provider 不会创建 Codex 发现所需的 `.codex-plugin/plugin.json` 和 `skills/` 布局。

**把 skill 目录放在插件根目录**——不采用，因为 Codex 从插件的 `skills/` 目录发现 skill 组件；压缩包被放在该目录下，同时保留其内部资源路径。

**在打包时创建 marketplace 条目**——不采用，因为 marketplace 注册会改变安装元数据，而本次范围只定义插件产物。

## Consequences

该套件可以作为本地 Codex 插件加载，并保留 references 和报告模板。同一工作流内容同时存在于 DSH 包和 Codex 插件中，因此未来更新套件时必须同步更新两个发布产物，或明确记录版本分叉。该插件仍然只提供指引，不声明外部集成或凭据。

## Verification

官方 `plugin-creator` validator 检查通过，并且 `dsh-skills-v0.2.0.zip` 中的每个非目录条目都与插件资源树逐字节一致。
