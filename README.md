# CampusMatch AI｜可解释的校园社团招新决策助手

CampusMatch AI 是一个面向高校招新场景的解决方案型 PoC：学生确认约束后获得可解释推荐，社团运营者通过匿名转化和模型运行指标验证方案价值。

## 演示状态

当前仓库提供可复现的本地与 Docker 演示，尚未宣称公网地址。面试时建议按 [5 分钟演示脚本](docs/demo-script.md) 操作。

## 客户背景与问题

新生面对大量社团时常凭宣传图或熟人推荐选择；活动时间、费用、校区和技能门槛分散在不同资料中。社团负责人能统计咨询量，却难以知道推荐是否形成了有效意向；学校管理者也缺少统一、隐私友好的运营视图。

原始项目实现了社团浏览、AI 匹配、问答和 CRUD，但存在四类问题：模型直接决定分数，结果不可复现；提示词 JSON 只做类型断言，模型可虚构社团；浏览器保留大模型 SDK 路径，存在密钥风险；管理写接口无鉴权，且没有转化、降级和 token 指标。

## 角色与优先需求

| 角色 | 首要任务 | 产品响应 |
| --- | --- | --- |
| 学生 | 快速排除明显不合适的社团 | 时间、费用、校区、门槛硬过滤 |
| 学生 | 理解推荐依据和代价 | 四维分数、数据库证据、注意事项 |
| 社团运营者 | 看到推荐是否形成意向 | 匿名去重意向与转化率 |
| 管理员 | 安全维护招新资料 | 服务端签名会话、所有写操作鉴权 |
| 方案负责人 | 控制模型风险与成本 | Provider 网关、结构校验、超时重试、规则降级、token 日志 |

## 业务流程

1. 学生用自然语言描述需求，或直接填写结构化条件。
2. AI 只提取偏好，学生必须确认后才能匹配。
3. 向量层先做语义召回（把最相关的社团排到候选池前面），规则服务再执行硬约束，并按兴趣 40、目标 25、时间 20、技能 15 计算分数——排序权威仍在规则层。
4. qwen-flash 只为候选结果撰写说明；程序校验结构、长度和社团 ID，并拒绝模型提供的分数。
5. 模型未配置、超时或输出不合法时，接口仍返回规则结果并明确标注降级。
6. 学生提交匿名意向；同一浏览器对同一社团只记录一次。
7. 运营驾驶舱展示聚合业务指标和 AI 运行指标。

## AI 设计

- 大模型边界：偏好提取、推荐理由、资料内问答和后台文案生成。
- 确定性边界：硬过滤、评分、排序、意向去重、指标计算和权限判断。
- 结构化输出：Zod 在运行时校验，不使用 TypeScript 强制转换冒充验证。
- 事实约束：问答先用向量语义检索命中至多 5 条社团知识块（LangChain 嵌入 + sqlite-vec），SSE 首帧返回回答来源；检索失败时降级到关键词检索。
- 可靠性：支持调用超时、调用方取消、429/502/503/504 有界重试和规则降级。
- 可观测性：只记录用例、模型、状态、耗时、token、错误码和是否降级；不记录原始提示词、回答或学生身份。

## PoC 架构

```text
浏览器
  │ HTTP / POST-SSE
  ▼
Nginx（唯一公网入口、SPA 静态资源、SSE 反向代理）
  │
  ▼
Express 模块化单体
  ├─ Auth / Intent / Analytics
  ├─ RuleMatchingService ── SQLite 持久卷
  ├─ VectorRetrievalService ─ sqlite-vec 向量表（同一 SQLite 文件）
  ├─ RecommendationService
  └─ Model Gateway ──────── 阿里云百炼（qwen-flash 对话 + text-embedding-v3 向量）
```

部署目标是一台腾讯云轻量应用服务器：只开放 SSH 与 HTTP/HTTPS，Node 端口和 SQLite 文件不暴露。这个规模下，模块化单体比微服务更便宜、更容易演示和排障。

## 为什么用 sqlite-vec，而没有上独立向量库、Kubernetes、Redis 和微服务

语义检索用 **sqlite-vec**：向量表与业务库落在同一个 SQLite 文件里，`docker compose up` 即开箱可用，不需要额外的向量库服务。这既补齐了“我喜欢拍照 → 摄影协会”这类关键词命不中的语义召回，又不扩大部署面。其余重组件按触发条件再演进：

- 多实例写入或数据量进入万级：SQLite 迁移到腾讯云数据库；向量层可平滑换成 pgvector / 专用向量库。
- 高频会话、分布式限流或任务异步化：引入 Redis 与队列。
- 资料从社团知识块扩展到大量规章、PDF 和历史问答：增加更细的切块策略与重排。

## 技术栈

- Vue 3、TypeScript、Vite、Pinia、Element Plus
- Node.js、Express、Zod、Prisma、SQLite
- 阿里云百炼（qwen-flash 对话 + text-embedding-v3 向量）/ OpenAI-compatible Provider、POST-SSE
- LangChain.js（嵌入）+ sqlite-vec（向量检索）的混合检索
- Vitest、Supertest
- Docker Compose、Nginx、腾讯云轻量应用服务器

## 本地运行

要求 Node.js 20+。

```bash
npm install
cp backend/.env.example backend/.env
npm exec --workspace backend prisma migrate deploy
npm run seed --workspace backend
npm run index:vectors --workspace backend   # 生成社团知识的向量索引（需 AI Key）
npm run dev
```

`index:vectors` 会把社团知识块嵌入 sqlite-vec；也可省略——服务启动时若向量表为空且已配置 Key，会自动构建一次。

访问前端 `http://localhost:5175`，后端健康检查为 `http://localhost:3001/api/health`。没有 AI Key 时仍可浏览社团和使用结构化规则匹配；自然语言提取、向量检索与问答会明确提示未配置，问答自动降级到关键词检索。

阿里云百炼（DashScope）配置——对话与向量共用同一个兼容端点：

```env
AI_PROVIDER=openai-compat
AI_API_KEY=replace_me
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL=qwen-flash
AI_EMBEDDING_MODEL=text-embedding-v3
AI_EMBEDDING_DIM=1024
RAG_ENABLED=true
RAG_TOP_K=5
```

作品演示默认使用响应快、成本低的 `qwen-flash`；需要更高质量时可换成 `qwen-plus` 等模型，改 `AI_MODEL` 即可。任意 OpenAI-compatible 端点也可通过改 `AI_BASE_URL` + Key 接入。

## Docker 与腾讯云部署

```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env，至少替换 ADMIN_PASSWORD、SESSION_SECRET 和可选 AI_API_KEY
docker compose --env-file backend/.env up -d --build
curl --fail http://127.0.0.1/api/health
```

Compose 仅发布 Nginx 端口，应用容器健康后 Web 容器才启动；SQLite 位于命名卷，重启应用不会清空。生产环境应在 Nginx 或云负载均衡处配置 HTTPS，并把 `COOKIE_SECURE=true`。

## 成本估算方法

不在仓库里写死易过期的云价格。PoC 月成本为“一台腾讯云轻量应用服务器当期套餐价 + 域名/证书（如需）+ 百炼（DashScope）实际输入输出 token 费用”。面试时展示云控制台当日价格与模型账单，并用运营页 token 总量代入；无 AI Key 的规则模式模型成本为 0。

## 测试与评测证据

```bash
npm test
npm run build
npm run evaluate
```

[固定 50 用例报告](docs/evaluation/latest.md)默认是确定性 CI 基线，不调用付费模型，也不把人工字段伪装成模型成绩。当前 runner 会拒绝把 `EVALUATION_LIVE_AI=true` 冒充 Live 评测；真实百炼调用结果需要补充经过审阅的适配器并人工复核事实一致性后，才能用于简历数字。

## 安全与隐私

- AI Key 只存在于后端环境变量；前端不依赖任何模型 SDK。
- 管理 Cookie 为 HttpOnly、SameSite=Lax、HMAC-SHA256 签名，最长 8 小时。
- 登录和 AI 接口有独立限流；生产 CORS 支持反向代理同源访问，并为前后端分离部署保留显式白名单。
- 公共分析接口只有聚合值，不返回联系方式、会话 ID、提示词、密码或供应商错误原文。

## 已知限制

- 单管理员密码适合 PoC，不适合正式多租户系统。
- SQLite 适合单机演示，不支持多实例并发写。
- 当前 RAG 语料是每个社团几段演示知识块（AI 生成后人工校对），真实部署应替换为社团真实资料并做更细的切块与重排。
- Provider 能接任意 OpenAI-compatible API；百炼的具体模型 ID、价格和限额以账号控制台为准。
- 仓库没有虚构公网 URL、客户数据或线上成功率；部署和 Live AI 评测完成后再补充。
