# Agent Note:DSH skills 套件 0.3.0 修订

Status: implemented

[English](2026-08-19-dsh-skills-suite-revision.md) | 中文

## Problem

套件的第一次真实运行(双子代理分析一个外部 LLM 流水线项目)暴露了四个缺陷:`dsh-capabilities.md` 写的 `ctx.sessions.fork()` 在 v0.1.0-rc.7 源码里不存在;`dsh-enhancement-analysis` 在 `dsh-scan/` 下找 recon 报告,而 `repo-recon` 写到 `recon/`,文档声称的交接从未接通过;两个技能都硬编码了个人路径(`~/git/deepseek-harness`、私有仓名);`repo-recon` 用 Codex 专属工具名表达并行方式,照搬到其他宿主不可执行。

## Decision

套件版本 0.3.0 按本地源码修正了原语清单:用 subagent delegation(`ctx.subagents.start()`,进程内 fork/spawn provider)、`llm/stream` 瀑布、`agent/request-error` 配 `dsh-llm-retry`、`dsh-token-meter`、guard 插件替换理想化的名称。解析规则(`$DSH_ROOT` → 常见位置 → GitHub)替换硬编码源码路径。全部套件产物统一到 `dsh-scan/` 根目录,修复了交接路径。`repo-recon` 用宿主无关的"单块 spawn + 推送式完成"原语加宿主映射表和顺序回退表达并行。`harness-runtime-optimizer` 把循环骨架和规则留在 SKILL.md,阶段清单移入 `references/runtime-optimizer-phases.md`,常驻技能体缩到三分之一。报告模板记录目标仓库/分支/HEAD,并为非 DSH 发现和未深入清单增加独立章节——试运行证明这两类内容此前会被丢弃。

两个发布树此前只靠 0.2.0 note 里的文字警告保持同步。`scripts/verify-dsh-skills-sync.ts` 现在双向断言 两个发布树逐字节相等,并校验 `VERSION`、每个 SKILL.md frontmatter、Codex manifest、provider 硬编码 METADATA 之间的版本一致。该 gate 挂入 `doc-sync` 清单。

## Alternatives considered

**保留 `ctx.sessions.fork()` 作为愿景名** — 拒绝:一个以事实核查为职责的技能自己核查不通过就没有权威性,且真实的 subagent seam 覆盖同样的用例。

**按宿主分叉技能而非宿主无关原语** — 拒绝:一个原语加映射表只需维护单一套件;映射只有三行。

**靠删规则而非抽离阶段细节给 optimizer 瘦身** — 拒绝:规则是不可妥协项;阶段清单只在对应阶段中途才有价值的参考材料。

## Consequences

技能修订从此必须同时更新两个发布树、在六处 bump 版本,gate 会在任何一处漂移时让构建失败——0.2.0 note 里"更新两个产物或记录版本分叉"的要求变成机械强制。没有子代理设施的宿主上有显式的顺序回退而非未定义行为。修正后的能力映射锚定在 rc.7;映射文件头部仍要求对新 checkout 复核,DSH 源码解析规则会记录分析实际使用的源。

## Verification

`pnpm run verify-dsh-skills-sync` 报告 11 个文件一致、六处载体版本统一;`pnpm vitest run packages/skill/skills` 以更新后的 METADATA 断言通过。修订版 `dsh-enhancement-analysis` 重新应用于同一外部项目;报告现在携带目标 HEAD、非 DSH 发现章节和未深入清单。
