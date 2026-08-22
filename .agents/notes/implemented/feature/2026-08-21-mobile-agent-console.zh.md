# Agent Note: Mobile Agent Teams console over an authenticated gateway

Status: implemented

[English](2026-08-21-mobile-agent-console.md) | 中文

## Problem

DSH runtime 已经拥有 Agent Teams、持久化 Session、provider token 用量、Web UI 和 credential reference，但这些能力目前是分开组合的。手机操作者需要一个受控入口来管理多个 Agent、查看进度、查看 provider 额度，以及让同一项目中的 Agent 共享记忆。把现有 Web listener 暴露到公网会扩大既有安全面，而单独实现 memory 或 dashboard 又会重复 runtime 状态并丢失 durable session 模型。

## Decision

私有实验包 `@deepseek-ai/dsh-experimental-mobile-agent-console` 是一个同时包含 Host/Client 两端的组合层。它的 bundle patch 启用已有的 GLM OpenAI 兼容 provider 路由、实验性的 Agent Teams 和 Team 工具，以及本包的 service。随包提供的 GLM 默认值是 provider `glm`、model `glm-5`、endpoint `https://open.bigmodel.cn/api/paas/v4` 和 credential reference `ZHIPU_API_KEY`；使用其他模型或 endpoint 的部署仍可覆盖这些值。

Host service 将 live Agent 和 Agent Teams service 投影为一个 JSON snapshot route。它从所属 service 读取 Agent 状态和 Team member/task 状态，从持久化的 `assistant/message` 与 `step/end` session event 统计 token 总量，通过现有 Web client 打开选定 Agent 的 transcript，并将配置的 GLM quota monitor 归一化为窗口数据。quota monitor 使用 provider 要求的原始 API key authorization，解析 `data.limits` 响应，并使用可配置的请求超时；这与 GLM chat route 的 bearer authorization 分开。Client 提供 sidebar action 和 overlay panel；面板的新建 Agent、派任务、停止操作复用 client runtime 的 Session face，对 teammate 先解析 direct-parent catalog 再使用 continuable subagent transport。它不创建第二份 runtime 状态存储，也不创建第二套 event vocabulary。

本包把有上限的项目记忆存储在 `.dsh-memory/memory.jsonl` 中。`memory_remember` 通过串行 writer 写入经过校验的记录，`memory_recall` 执行有上限的词法检索，pre-step listener 则把最近记录作为有上限的 snapshot user message 注入。因此，model 看到的注入上下文会在到达 model 前写入日志。memory 工具和已有 Team 工具对 model 可见，而 credential 与 provider 原始 quota 响应只留在 Host。

普通 DSH WebServer 继续只监听回环地址。可选的独立 Node gateway 监听配置的 host 与 port，对每一个 HTTP request 和 WebSocket upgrade 使用 bearer token 或 HttpOnly cookie 认证，然后代理到回环 WebServer。默认 gateway 监听 `0.0.0.0:3082`，用于可信局域网或 VPN；token 来自 `DSH_MOBILE_ACCESS_TOKEN`，未设置时在启动时生成并打印。gateway 授予与 Web UI 相同的控制面，不是多用户授权层。

本包不增加新的 durable session event kind。dashboard 用量和 memory 可见性使用已有 event 以及已记录的 snapshot message，因此 replay 不需要新的 session-format version。它的 invariant contribution 有意为空，因为该 service 不拥有独立于 Agent、Team 或 memory store 的新 durable relationship。

## Alternatives considered

**把现有 WebServer 绑定到 `0.0.0.0`。** 否决，因为这会把当前 Web UI listener 直接变成面向网络的控制面，并把手机访问绑定到现有 loopback 安全决策。独立 gateway 让新的暴露面拥有明确的 token、health route 和独立配置，同时保留主 listener。

**默认使用外部移动 dashboard 或 memory MCP。** 否决，因为外部进程需要重新拼装 Agent Teams 与 Session 状态，而 MCP memory 会让 model-visible context 依赖额外 service。本组合使用原生 Team/session owner，并使用易于检查和恢复的本地 JSONL store。

**把 memory record 放入 Session event format。** 否决，因为项目 memory 跨 Agent 共享，而 Session event 由单个 durable conversation 所有。显式工具写入仍保持独立，pre-step snapshot 则记录 model 实际收到的内容，不引入新的 event schema。

**增加只推送的 dashboard transport。** 否决，因为已有 Web client 已经拥有带认证的 route 和 Session opening path。五秒一次的有上限 polling 足以提供运维概览，并保持较小的 Client/Host wire surface；dashboard 会明确说明由此产生的刷新延迟。

## Testing

Host 与 Client 的 TypeScript project 可以独立编译，package bundle 会同时产出两端。该组合发生变化时，仓库级 typecheck、Cordis configuration gates、文档 gates，以及构建后 profile startup smoke 都必须保持通过。dashboard parser 会拒绝不合法的不可信 JSON；gateway authentication 与 loopback WebServer 分开验证；quota normalization 只暴露类型化 projection。

## Consequences

操作者得到一个移动 URL，可以查看 Agent 状态、Team task 进度、从 session 统计的 token 数、GLM quota window、最近项目 memory，并打开 transcript。已有 Team lifecycle、session persistence、provider accounting、credential loading 和 Web UI 行为仍由各自 owner 负责。

这个组合是单进程、项目本地的。Teammate 共享 checkout，memory retrieval 是词法检索而不是 embedding，quota display 依赖 provider monitor，dashboard 状态最多落后一个 polling interval。gateway token 实际上拥有完整 Web UI 控制权，因此必须只留在可信局域网或 VPN 中，不能直接暴露到公网。
