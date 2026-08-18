# Agent Note: Bundled DSH skills provider

Status: implemented

[English](2026-08-18-bundled-dsh-skills-provider.md) | 中文

## Problem

DSH Skills 0.2.0 套件包含可复用的分析指引、参考资料和报告模板，但 Harness 会话只有在插件将它们贡献给 `ctx.skills` 后，才能发现随包提供的指令。

## Decision

该套件以 `@deepseek-ai/dsh-skills` 的形式交付，作为 skill 能力家族中的 bundled skill 提供方。

提供方以 `BUNDLED_SKILL_RANK` 注册 `dsh-enhancement-analysis`、`harness-runtime-optimizer` 和 `repo-recon`，并启用模型与用户调用。每个候选项都指向随包提供的 `SKILL.md`；加载时移除 frontmatter，并将 skill 目录公开为 `resourceBase`，因此套件中的相对 `references/` 与 `templates/` 路径在打包后仍然可用。

base profile 会携带禁用的插件条目。部署必须明确启用该条目，这三个 skill 才会进入目录或影响模型请求。

压缩包中的套件元数据和资源文件保留在包发布的 `skills/` 目录下。提供方在加载时读取这些文件，注册表负责优先级、校验、失效和释放。

随包的套件 README 属于 bundled artifact 的源内容，因此从仓库的双语文档配对中排除；插件约定的翻译由包根目录的 README 负责。

## Alternatives considered

**本地文件系统发现**——不采用，因为该套件属于包内内容，应当无需复制到用户或项目 skill 根目录即可使用。

**运行时 `ctx.skills.register()` 调用**——不采用，因为提供方可以为每个 skill 提供稳定的资源基准，并在不把正文嵌入 JavaScript 的情况下保留随包的参考资料和模板。

**在默认 profile 中启用提供方**——不采用，因为新增三个可被模型调用的目录条目会改变现有部署的提示词组成；显式选择加入可以保持当前默认行为。

## Consequences

该插件可以由 Cordis 组合挂载，并沿用本地 skill 相同的发现和面向模型的加载路径。更新套件需要发布新插件版本，部署方在启用前应检查随包指引中的本地路径假设。

该包将提供方实现和资源加入 Host aggregate、base bundle 依赖闭包以及生成的能力图。提供方除了注册表注册外不拥有可变运行时状态，因此其 invariant companion 只记录所有权，不增加独立的运行时检查。

## Verification

包测试挂载真实注册表和提供方，检查三个摘要，加载一个不含 frontmatter 的正文，验证随包的参考资料和模板资源，并确认释放后目录被清空。
