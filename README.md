# CampusMatch AI｜可解释的校园社团招新智能匹配平台

新生选社团常常要在几十个公众号推文里来回比较时间、费用、门槛；社团负责人发了招新推荐，却不知道有没有人真的因此报名。**CampusMatch AI 把这两件事都解决了**：用规则算法做出可复现、可解释的推荐，用大模型只负责把结果讲清楚，再用一套轻量运营看板告诉负责人转化效果。

这是一个**两天独立完成、可本地运行、可 Docker 一键部署**的全栈 AI 工程作品，重点不是"调用了大模型 API"，而是**如何在真实约束下把 AI 用得可靠、可控、成本透明**。

---

## ✨ 项目亮点

- **可解释推荐，而不是黑箱打分**：匹配分数（兴趣 40 / 目标 25 / 时间 20 / 技能 15）**全部由确定性规则代码计算**，AI 只负责把已经算好的结果写成自然语言理由——同样的输入永远得到同样的分数，模型不能偷偷改分、也不能编造候选之外的社团（程序会校验并拒绝）。
- **真·混合检索（Hybrid RAG），不是把全部数据塞进 prompt**：接入 LangChain.js + **sqlite-vec** 做向量语义召回——"我喜欢拍照，周末有空"能命中"摄影协会"，这是纯关键词匹配做不到的语义理解，再经规则层筛选排序，两层结合。
- **三层降级链，无 Key 也能跑**：模型未配置 → 走规则/关键词结果；调用超时或 429/502/503 → 有界重试；输出格式不合法或编造 ID → 校验拒绝并降级。全程页面不报错，只是明确告知"当前为规则模式"。
- **安全边界清晰**：API Key 只存在于后端环境变量，浏览器不触碰任何模型 SDK；管理写接口用 HMAC-SHA256 签名的 HttpOnly Cookie 鉴权；公开的运营指标接口只返回聚合数字，不泄露会话 ID、提示词或联系方式。
- **有工程判断，不盲目上重架构**：单机 SQLite + sqlite-vec 而不是独立向量库/Redis/Kubernetes/微服务——不是不会用，是当前业务量真不需要，README 里写明了"什么条件下该升级"。这是刻意的取舍，不是能力上限。
- **可验证，不是自吹**：150 个自动化测试（规则打分、降级路径、鉴权、向量检索全覆盖），固定 50 用例的确定性评测报告，以及一份可以直接照着讲的 5 分钟面试演示脚本。

---

## 🧭 30 秒了解这个项目

| 角色 | 痛点 | CampusMatch 怎么解决 |
| --- | --- | --- |
| 学生 | 社团太多，条件分散在各处 | 自然语言描述需求 → AI 提取结构化条件（可编辑确认）→ 硬约束过滤 + 四维打分 |
| 学生 | 不知道推荐依不依据 | 每条推荐都能展开看规则证据、注意事项；模型不能改分 |
| 社团负责人 | 不知道招新推荐有没有效果 | 匿名去重的意向记录 + 转化率看板 |
| 技术面试官 | 想看到底是不是"套壁纸调 API" | 确定性打分、结构化校验、降级链、鉴权、成本日志——工程细节都在代码里 |

**业务流程**：自然语言/表单输入 → AI 提取偏好（用户确认）→ 向量语义召回候选池 → 规则硬过滤 + 打分排序 → AI 写推荐理由（不改分）→ 用户确认意向（匿名去重）→ 运营看板展示转化率与模型运行指标。

---

## 🏗️ 架构

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

部署目标是一台云轻量应用服务器：只开放 SSH 与 HTTP/HTTPS，Node 端口和 SQLite 文件不对外暴露。这个规模下，模块化单体比微服务更便宜、更容易演示和排障。

### 为什么用 sqlite-vec，而不是独立向量库 / Kubernetes / Redis / 微服务

向量表与业务库落在同一个 SQLite 文件里，`docker compose up` 即开箱可用，不需要额外的向量库服务，也补齐了关键词检索命不中的语义召回。其余重组件按明确的触发条件再演进，不提前引入：

- 多实例写入或数据量进入万级 → SQLite 迁移到云数据库；向量层可平滑换成 pgvector / 专用向量库。
- 高频会话、分布式限流或任务异步化 → 引入 Redis 与队列。
- 资料从社团知识块扩展到大量规章、PDF 和历史问答 → 增加更细的切块策略与重排。

---

## 🧠 AI 设计：边界在哪、为什么可靠

- **大模型只做**：偏好提取、推荐理由撰写、问答、后台文案生成——都是"表达"类任务。
- **代码只做**：硬过滤、打分、排序、意向去重、指标计算、权限判断——都是"决策"类任务，必须确定性、可复现。
- **结构化输出**：Zod 在运行时校验模型返回的 JSON，不是简单的 TypeScript 类型断言冒充验证。
- **事实约束（RAG）**：问答先用向量语义检索命中至多 5 条社团知识块（LangChain 嵌入 + sqlite-vec），SSE 首帧就把回答依据的来源发给前端展示；检索失败时降级到关键词检索。
- **可靠性**：调用超时、前端可主动取消（AbortSignal）、429/502/503/504 有界重试、任意环节失败都有对应的确定性降级路径。
- **可观测性**：只记录用例、模型、状态、耗时、token 数、错误码和是否降级；**不记录**原始提示词、模型回答或学生身份——运营指标和隐私保护同时满足。

---

## 🛠️ 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | Vue 3 + TypeScript + Vite + Pinia + Vue Router + Vitest |
| 后端 | Node.js + Express + TypeScript + Prisma ORM + SQLite |
| AI / RAG | 阿里云百炼（qwen-flash + text-embedding-v3）+ LangChain.js（嵌入）+ sqlite-vec（向量检索）|
| 测试 | Vitest + Supertest，150 个自动化测试 |
| 部署 | Docker Compose + Nginx，云轻量应用服务器 |

---

## 🚀 本地运行

要求 Node.js 20+。

```bash
npm install
cp backend/.env.example backend/.env
npm exec --workspace backend prisma migrate deploy
npm run seed --workspace backend
npm run index:vectors --workspace backend   # 生成社团知识的向量索引（需 AI Key）
npm run dev
```

- 前端：`http://localhost:5175`　后端健康检查：`http://localhost:3001/api/health`
- 没有 AI Key 时仍可浏览社团、用结构化表单做规则匹配；问答自动降级为关键词检索。
- `index:vectors` 可以省略——服务启动时若向量表为空且已配置 Key，会自动构建一次。

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

作品演示默认使用响应快、成本低的 `qwen-flash`；任意 OpenAI-compatible 端点都能通过改 `AI_BASE_URL` + Key 接入。

## 🐳 Docker 部署

```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env，至少替换 ADMIN_PASSWORD、SESSION_SECRET 和可选 AI_API_KEY
docker compose --env-file backend/.env up -d --build
curl --fail http://127.0.0.1/api/health
```

Compose 只发布 Nginx 端口，应用容器健康后 Web 容器才启动；SQLite 位于命名卷，重启应用不会清空数据。生产环境应在 Nginx 或云负载均衡处配置 HTTPS，并把 `COOKIE_SECURE=true`。

---

## ✅ 测试与工程质量证据

```bash
npm test        # 前后端共 150 个自动化测试：规则打分、降级路径、鉴权、向量检索
npm run build    # tsc（后端）+ vite build（前端）
npm run evaluate --workspace backend   # 确定性 CI 评测，见 docs/evaluation/latest.md
```

不在仓库里写死易过期的云价格。真实成本 = "云服务器当期套餐价 + 域名/证书（如需）+ 百炼实际 token 费用"；无 AI Key 的规则模式模型成本为 0。

**面试演示**：[5 分钟演示脚本](docs/demo-script.md) —— 从客户问题到云架构取舍，按时间轴给出了完整的讲解路径和故障恢复预案。

---

## 🔒 安全与隐私

- AI Key 只存在于后端环境变量；前端不依赖任何模型 SDK。
- 管理 Cookie 为 HttpOnly、SameSite=Lax、HMAC-SHA256 签名，最长 8 小时。
- 登录和 AI 接口有独立限流；生产 CORS 默认同源，也支持前后端分离部署的显式白名单。
- 公共分析接口只返回聚合值，不返回联系方式、会话 ID、提示词或供应商错误原文。

## ⚠️ 已知限制（诚实披露，而不是回避）

- 单管理员密码适合 PoC 演示，不适合正式多租户系统。
- SQLite 适合单机演示，不支持多实例并发写。
- 当前 RAG 语料是每个社团几段演示知识块（AI 生成、人工校对），真实部署应替换为社团真实资料。
- 仓库没有虚构公网地址、客户数据或线上转化率；这些指标只在真实部署后才会补充。

---

## 📄 更多文档

- [CLAUDE.md](CLAUDE.md) —— 面向工程细节的架构参考（目录结构、API 路由、AI provider 设计要点）
- [docs/demo-script.md](docs/demo-script.md) —— 5 分钟面试演示脚本
- [docs/evaluation/latest.md](docs/evaluation/latest.md) —— 确定性 CI 评测报告
