# Agent Note:Lumen 流水线 DSH 门面示例

Status: implemented

[English](2026-08-19-lumen-pipeline-facade-example.md) | 中文

## Problem

DSH 增强分析流程的终点是一条建议的迁移路径——"入口包成 DSH 门面,再试点一个阶段"——但仓库里没有任何示例在真实外部流水线上演示这个形态,也没有一次运行度量过门面相对原版栈(业务代码不变)到底付出了什么、解锁了什么。

## Decision

[`examples/lumen-pipeline/cordis.yml`](../../../../examples/lumen-pipeline/cordis.yml) 运行开源的 [vibe-report-dashboard](https://github.com/coffee-man666/vibe-report-dashboard)("Lumen")报告流水线——route → extract → theme → compose → refine——业务代码零改动:驱动器把项目的 OpenAI 适配器对象换成 DSH 支撑的传输层,每次 `llmStructured` 调用变成一个带 `outputSchema` 的 spawn subagent 子会话,在组合的 `dsh-llm-retry`、`dsh-token-meter`、JSONL 会话持久化和按阶段模型路由之下执行。

组合刻意保持最小(credentials、一条手工声明的 `dsh-llm-pi-ai` 路由——其 `baseURL` 通过 `DSH_PIPELINE_BASE_URL` 支持故障注入、agent spine、持久化、token meter、retry、projection、subagent + spawn provider)。驱动器度量每阶段耗时、按 step 去重后从 `session/event` usage 块折叠出的精确 provider 用量、重试事件与子会话 id。超出结构化输出子集的 schema(Lumen RDM/maestro schema 里的 `minimum`、`minItems`)降级为 Lumen 自己的提示词注入措辞,解析值经 `toolCalls` 路径返回;`max-tokens` 截断返回文本让 Lumen 的校验重试环接手——与原适配器语义一致。

目标项目经 `VIBE_ROOT` 寻址(未设置即 fail-loud)且公开可 clone,持 key 者都能复现 with-key 路径;不内嵌个人路径,key 不进树。仓库外的对比工作区(故障注入代理、在同一适配器 seam 埋点的原版 runner、矩阵脚本、展示页)以同模型同端点驱动双栈;其结果支撑本 note 但不是本仓库的产物。

试点对相关 seam 的发现(均在真实运行中观察到):

- 结构化输出 JSON Schema 子集拒绝 `minimum`/`minItems`(`packages/core/tools/src/json-schema.ts` 关键字白名单),普通第三方 schema 落出原生捕获路径的频率超出预期。
- `AgentOptions`(`packages/core/agent/src/runtime-types.ts`)只暴露 provider/model/maxTokens:按阶段的 temperature 无法经 subagent 委托透传。
- 子代理继承父 spine 的完整工具清单(一个流水线子会话看到了 `job_list`),纯编排组合需要最小 spine,否则 prompt 无谓变宽。
- `dsh-llm-retry` 只在 agent 循环边界生效这一点是承重墙:选择 subagent 阶段(而非裸 `ctx.llm.stream`)才让门面重试成立。

## Alternatives considered

**用裸 `ctx.llm.stream` 传输替代 subagent 子会话** — 拒绝:llm seam 没有结构化输出捕获也没有重试(llm-retry 挂在 `agent/request-error` 上),等于在 DSH 外壳里复刻原版栈的弱点。

**把流水线阶段拷进示例** — 拒绝:门面主张只有在目标项目的模块原样运行时才可信;拷贝会静默分叉 prompt。

**把对比矩阵提交进仓库** — 拒绝:它花费真实 API key、依赖单一操作者环境,demo 不是回归面;keyless boot 冒烟与自跳过的 with-key 运行才是可测试边界。

## Consequences

示例需要 `VIBE_ROOT` 与 `DEEPSEEK_API_KEY` 才能走模型路径(两个测试否则自跳过或 fail-loud);目标项目已开源,这只是一次 clone 加一把 key,不是私有依赖。它记录的是迁移模式及其度量成本,不发布独立产品。上述发现本身是上游候选——schema 子集扩宽、AgentOptions 增加 temperature 字段、最小编排 spine,都是小而带证据的改动。

## Verification

Keyless:`vitest run --config vitest.e2e.config.ts examples/lumen-pipeline/tests/keyless-smoke.e2e.ts` 经 Loader 启动组合并解析 llm/subagents/tokenMeter。With-key(自跳过):完整流水线运行断言 ok、≥4 次计量的 LLM 调用、≥4 个子会话、非零输入 token。矩阵(已发布于目标项目的 `dsh/` 目录):故障注入下原版栈 3/3 全挂而门面 3/3 重试穿透;会话日志重放恢复 RDM 并跳过两个 LLM 调用(9.8s 对 80.9s)。
