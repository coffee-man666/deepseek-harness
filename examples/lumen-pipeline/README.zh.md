# lumen-pipeline

[English](README.md) | 中文

Lumen 报告转仪表盘流水线（来自开源项目
[vibe-report-dashboard](https://github.com/coffee-man666/vibe-report-dashboard)）运行在
DSH llm 栈上的**门面迁移演示**：目标项目的流水线代码零改动，只有其 OpenAI 适配器对象被换成
DSH 支撑的传输层。每次 `llmStructured` 调用变成一个带 `outputSchema` 的 spawn subagent
子会话，在本组合的重试策略、token 计量、持久会话日志和按阶段模型路由之下执行。

目标项目的 [`dsh/` 目录](https://github.com/coffee-man666/vibe-report-dashboard/tree/main/dsh)发布了实测对比（原版栈 vs 本门面，含注入 429 的可靠性实验与会话日志重放），附带可复现的 runner 和可视化对比页。

## 运行

```sh
git clone https://github.com/coffee-man666/vibe-report-dashboard "$VIBE_ROOT"
DEEPSEEK_API_KEY=… VIBE_ROOT="$VIBE_ROOT" pnpm tsx driver.ts \
  --sample "$VIBE_ROOT/tests/samples/01-ev-industry-2026q1.md" --out /tmp/lumen-dsh
```

选项：`--strong-extract` 将 extract/compose 路由到 `deepseek-reasoner`（按阶段模型路由演示）；`--reuse-extract <manifest>` 从持久化的会话日志重放先前的 extract 而非重新付费；`DSH_PIPELINE_BASE_URL` 将 provider 路由指向其他端点（例如目标项目的 `dsh/fault-proxy/proxy.mjs`）。

## 测试

- Keyless（始终运行）：`pnpm vitest run --config vitest.e2e.config.ts examples/lumen-pipeline/tests/keyless-smoke.e2e.ts` —— 经 Loader 启动本组合并解析 llm/subagents/tokenMeter。
- With-key（缺 `DEEPSEEK_API_KEY` 或 `VIBE_ROOT` 时自跳过）：`examples/lumen-pipeline/tests/with-key.e2e.ts` —— 一次完整流水线运行，断言计量与会话日志。

本试点产生的设计决策与 seam 发现（schema 子集拒绝、AgentOptions temperature、纯编排工具清单）记录在 [Agent Note](../../.agents/notes/implemented/feature/2026-08-19-lumen-pipeline-facade-example.md)（英文）。
