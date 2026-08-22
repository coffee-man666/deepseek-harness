# @deepseek-ai/dsh-experimental-mobile-agent-console

[English](README.md) | 中文

这是一个面向 DSH Web profile 的完整移动控制层实验包。它把原生 Agent Teams roster 与工具、GLM OpenAI 兼容路由、按项目共享的 JSONL 记忆、实时面板，以及带 token 认证的局域网网关组合起来；网关代理现有的本机回环 Web 应用。

## 在当前 checkout 中运行

构建 workspace，把这个本地组合包安装到 Web profile，并配置智谱 GLM key：

```sh
pnpm run build
pnpm dsh plugin --profile web add ./packages/experimental/mobile-agent-console
export ZHIPU_API_KEY=...
export DSH_MOBILE_ACCESS_TOKEN=...
pnpm dsh --profile web --no-open
```

网关会打印局域网 URL；如果没有设置 `DSH_MOBILE_ACCESS_TOKEN`，还会打印一次生成的访问 token。在手机上打开 `http://<lan-ip>:3082/__dsh_mobile__/login?access_token=<token>` 完成一次登录；网关会把 token 存入 HttpOnly cookie，之后就能访问普通 Web UI。若希望重启后 token 不变，请在启动前设置 `DSH_MOBILE_ACCESS_TOKEN`。

该包目前是私有实验包，因此在 promotion（正式化）之前，支持的安装方式是当前 checkout 的本地路径。Profile 安装还会把浏览器端加入 profile 的 client-module roster；直接使用 `--patch` 适合只调试 Host 端，不是手机端到端启动路径。

## 配置

随附 patch 启用以下默认值；后续 patch 会替换完整的 `mobile-agent-console` config，因此要保持启用的字段需要一并重述：

```yaml
- id: mobile-agent-console
  name: '@deepseek-ai/dsh-experimental-mobile-agent-console'
  config:
    gatewayEnabled: true
    gatewayHost: 0.0.0.0
    gatewayPort: 3082
    tokenEnv: DSH_MOBILE_ACCESS_TOKEN
    quotaApiKeyEnv: ZHIPU_API_KEY
    quotaCacheMs: 30000
    quotaTimeoutMs: 5000
    memoryDirectory: .dsh-memory
    maxMemoryEntries: 200
    maxMemoryContextBytes: 12000
```

`gatewayEnabled: false` 会保留回环 Web UI 上的本地 dashboard route，但不启动第二个监听器。`gatewayHost: 127.0.0.1` 适合本地 smoke test。插件还支持配置 `quotaUrl`、`defaultProvider` 和 `defaultModel`。

## 包含什么

- **GLM：** 新 Agent 默认使用 `glm/glm-5`，同时列出 `glm-4.5-air`。路由使用 `https://open.bigmodel.cn/api/paas/v4`，并通过 DSH credentials 按 `ZHIPU_API_KEY` 引用解析 key。账号使用其他模型或 endpoint 时，可在后续 patch 中修改 `llm-pi-ai` 行。
- **多个 Agent：** Agent Teams 在 Lead session 中持久化命名 teammate、peer 消息和共享任务 DAG。面板读取实时 roster 与任务记录，并可打开任意 Agent 的 transcript；“新建 Agent”会创建真实 Session 并提交首个任务，“派任务”和“停止”复用现有 Session/continuation 队列与取消语义。
- **进度与状态：** 面板每五秒刷新一次，展示 Agent 状态、Team 成员、任务完成度、当前模型路由，以及从 session 日志统计的步骤/token 用量。
- **额度：** 配置了 `ZHIPU_API_KEY` 时，Host 按 provider 要求使用原始 API key authorization 调用 GLM monitor endpoint，并在达到配置的超时时间后终止请求；结果缓存 30 秒，只暴露归一化后的窗口和错误状态，不返回 key 或 provider 原始响应。
- **记忆：** `memory_remember` 与 `memory_recall` 将记录写入 session 工作目录下的 `.dsh-memory/memory.jsonl`。最近记录会在 model step 前以有上限的 `snapshot` user message 注入，因此 model 看到的记忆也会进入 session 日志。

面板里的 Agent 操作不是前端临时状态：新建、追加任务和停止都通过 DSH client runtime 的 Session face 进入原生 Host；对 Team teammate 会先解析 direct-parent catalog，再使用 continuable subagent transport。手机端可以直接开多个并行 Agent，之后从同一面板查看它们的运行状态和累计用量。

## 安全与限制

普通 DSH WebServer 仍只监听回环地址。移动网关是唯一监听所有网卡的服务，所有 HTTP 请求和 WebSocket upgrade 都必须带 bearer token 或其 HttpOnly cookie。该 token 具有与 Web UI 相同的控制权限，只应在可信局域网或 VPN 中使用，并通过修改 `DSH_MOBILE_ACCESS_TOKEN` 轮换；不要把网关直接暴露到公网。

用量来自实时 session 日志中 provider 报告的 `assistant/message` token 字段；provider 不报告的数值无法由本包推算。额度显示依赖 GLM monitor 响应，未配置 key 时会显示不可用。记忆是对每个项目目录一个 JSONL 文件执行有上限的词法检索；它保持本地实现，不提供 embedding、跨机器同步或自动密钥脱敏。

Agent Teams 与网关都是单进程能力。Teammate 共享 DSH 进程和 checkout，write scope 仍然只是 advisory（建议性约束）。重启会保留 session persistence，但不会把旧 Team runtime 自动变成 live roster；请通过正常 DSH session lifecycle 新建或恢复 Team。

## Model 体验

### Mobile console context

#### What the model sees

Team 与 memory 工具对 model 可见。`memory_remember` 保存简短事实，`memory_recall` 搜索项目记忆；pre-step memory snapshot 在到达 model 前就会写入日志。Team 协作工具仍由 `@deepseek-ai/dsh-experimental-tool-agent-team` 负责，本包不重复实现其 policy 或 wire vocabulary。

#### Token effect

每条由 `memory_recall` 返回的事实都会消耗 tool-result token，每个注入的 memory snapshot 都会在 model step 前增加 user-context token。Team roster 与 task state 保留在 dashboard projection 中，只有 Team 工具把它们返回给 model 时才进入 model context。

#### KV Cache effect

记忆 snapshot 是在 model step 前插入的有上限 user message，因此它会进入日志请求上下文，也可能影响 provider 的 prefix-cache 复用。本包不假设某个 provider 的具体缓存策略。

## 已知限制与延后工作

- GLM 模型列表和额度响应属于 deployment fact；智谱调整可用模型或账号 endpoint 后，需要覆盖 patch。
- 面板是 polling view，不是第二套事件传输；状态变化最多可能延迟一个刷新周期。
- 网关目前代理完整 Web surface，不提供多用户账号或基于角色的权限。
