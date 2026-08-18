# DSH Enhancement Analysis — <project>

- 日期 / recon 报告路径 / DSH baseline（commit + 日期）

## 1. Pipeline 分段地图
（从 recon 重绘：trigger → stages → storage → output；标 LLM 调用点和痛点编号）

## 2. 映射表（核心交付）
| # | 阶段/痛点 (file:line) | DSH primitive | 判定 (✅/✅✅/⚠️) | 收益 |

## 3. DSH 独有解锁
（当前栈做不到的：fork A/B、模型热换、瀑布拦截、会话重放…逐条）

## 4. 诚实成本
（语言差距 / MCP 化工具数量 / rc 阶段风险 / 重写行数估计）

## 5. 优先级矩阵
| 排名 | 改造项 | recon 严重度 | 工作量 | 战略价值 |

## 6. 迁移路径
- Step 1: 入口包成 MCP tool（零风险，DSH 当门面）
- Step 2: 试点阶段插件化（选哪个阶段、验证什么假设）
- Step 3: 决策门（什么指标达标才继续）

## 7. 待团长拍板的问题
