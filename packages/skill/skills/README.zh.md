# @deepseek-ai/dsh-skills

[English](README.md) | 中文

这是一个随包提供的 skill 提供方，包含三个仓库分析与运行时优化工作流：`repo-recon`、`dsh-enhancement-analysis` 和 `harness-runtime-optimizer`。

## 插件

该插件需要 `ctx.skills`，并注册一个名为 `dsh-skills` 的不可变 `bundled` 提供方。

base profile 会以禁用状态携带该插件条目；只有部署明确启用该条目时，这些 skill 才会进入目录。

| Skill | 用途 |
|---|---|
| `repo-recon` | 以分阶段的快速扫描和深入分析，对本地 Git 项目执行只读侦察。 |
| `dsh-enhancement-analysis` | 将项目的编排痛点映射到 DeepSeek Harness 原语，并在不修改代码的情况下生成优先级报告。 |
| `harness-runtime-optimizer` | 诊断运行时策略浪费，设计受控实验，并决定采用、拒绝或分段使用某项策略。 |

## 资源

发布的 `skills/` 目录保留套件的 `README.md`、`VERSION`、`CHANGELOG.md`、每个 `SKILL.md`，以及所有被引用的 `references/` 和 `templates/` 文件。

每个已加载的 skill 都会把自己的目录公开为 `resourceBase`，因此正文中的相对路径会以随包资源目录为基准解析。

## 模型体验

通过 `@deepseek-ai/dsh-tool-skill` 间接影响模型；它会把三个随包 skill 放入会话目录，并按需加载其中一个正文。

#### KV Cache 影响

挂载后，该提供方会向 skill 目录添加三个摘要；加载 skill 时会追加正文和保留的资源指引。未挂载时，该提供方不产生作用。

## 已知限制与暂缓事项

- **发布内容是静态的**——修改随包 skill 需要发布新版本；该提供方不会监视包内资源。
- **存在本地路径假设**——部分工作流指向本地 DSH checkout 或本地项目路径，部署时应先检查这些指引。
- **只提供指引**——这些 skill 会生成报告并给出实验决策，不会自动修改仓库或发布运行时策略。
