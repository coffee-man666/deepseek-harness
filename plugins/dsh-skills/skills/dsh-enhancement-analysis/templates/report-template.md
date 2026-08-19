# DSH Enhancement Analysis — <project>

- 日期
- 目标仓库:path + branch + HEAD
- recon 报告路径(如有)
- DSH baseline:解析到的源码路径 + commit + 日期

## 1. Pipeline 分段地图
（从 recon 重绘：trigger → stages → storage → output；标 LLM 调用点和痛点编号）

## 2. 映射表（核心交付）
| # | 阶段/痛点 (file:line) | DSH primitive | 判定 (✅/✅✅/⚠️) | 收益 |

## 3. DSH 独有解锁
（当前栈做不到的：并行 A/B、模型热换、瀑布拦截、会话重放…逐条）

## 4. 诚实成本
（语言差距 / 重写行数估计 / 适配器数量 / rc 阶段风险）

## 5. 优先级矩阵
| 排名 | 改造项 | 严重度 | 工作量 | 战略价值 |

## 6. 迁移路径
- Step 1: 入口包成 DSH 门面（零风险）
- Step 2: 试点阶段插件化（选哪个阶段、验证什么假设）
- Step 3: 决策门（什么指标达标才继续）

## 7. 非 DSH 发现（先修项）
（安全/存储/渲染等 DSH 能力域之外的发现:现象 + file:line + 建议,与迁移无关但往往最急）

## 8. 未深入清单
（没读到的部分,明确列出,不猜测）

## 9. 待团长拍板的问题
