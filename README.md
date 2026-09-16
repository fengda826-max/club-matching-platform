# CampusMatch AI｜可解释的校园社团招新智能匹配平台

新生选社团常在几十篇推文里来回比较时间、费用、门槛；社团负责人发了招新推荐，却不知道有没有人真的因此报名。CampusMatch AI 用规则算法做出可复现、可解释的推荐，AI 只负责把结果讲清楚，再用轻量运营看板展示转化效果。

## ✨ 亮点

- **可解释推荐，不是黑箱打分**：匹配分数（兴趣 40 / 目标 25 / 时间 20 / 技能 15）由确定性规则代码计算，AI 只写理由，不能改分、不能编造候选之外的社团。
- **真·混合检索（Hybrid RAG）**：LangChain.js + **sqlite-vec** 向量语义召回——"我喜欢拍照，周末有空"能命中"摄影协会"，这是纯关键词匹配做不到的语义理解。
- **三层降级链，无 Key 也能跑**：未配置模型走规则/关键词兜底，调用失败有界重试，输出不合法则拒绝降级——全程不报错。
- **安全边界清晰**：Key 只在后端；管理写接口 HMAC 签名 Cookie 鉴权；公开接口只返回聚合数据。
- **工程判断而非堆砌技术**：单机 SQLite + sqlite-vec，没有过早引入 Redis/Kubernetes/独立向量库——是取舍，不是能力上限。
- **可验证**：150 个自动化测试覆盖规则打分、降级路径、鉴权、向量检索。

## 🏗️ 架构

```text
浏览器 → Nginx（唯一公网入口、SSE 反向代理）→ Express 模块化单体
  ├─ Auth / Intent / Analytics
  ├─ RuleMatchingService + VectorRetrievalService ── SQLite + sqlite-vec（同一文件）
  └─ Model Gateway ── 阿里云百炼（qwen-flash 对话 + text-embedding-v3 向量）
```

## 🛠️ 技术栈

Vue 3 + TypeScript + Vite + Pinia（前端）｜Node.js + Express + Prisma + SQLite（后端）｜阿里云百炼 + LangChain.js + sqlite-vec（AI / RAG）｜Vitest + Supertest（测试）｜Docker Compose + Nginx（部署）

## 🚀 本地运行

要求 Node.js 22+（better-sqlite3 / LangChain.js 依赖要求）。

```bash
npm install
cp backend/.env.example backend/.env      # 填入 AI_API_KEY（阿里云百炼）
npm exec --workspace backend prisma migrate deploy
npm run seed --workspace backend
npm run index:vectors --workspace backend  # 可省略，启动时会自动构建
npm run dev
```

前端 `http://localhost:5175`，后端健康检查 `http://localhost:3001/api/health`。没有 AI Key 时仍可浏览社团、用结构化表单做规则匹配。

## 🐳 Docker 部署

```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env，至少替换 ADMIN_PASSWORD、SESSION_SECRET、AI_API_KEY
docker compose --env-file backend/.env up -d --build
curl --fail http://127.0.0.1/api/health
```

SQLite + 向量表在命名卷里持久化，重启容器不丢数据。

## ✅ 测试

```bash
npm test    # 150 个测试：规则打分、降级路径、鉴权、向量检索
npm run build
```

## ⚠️ 已知限制

单管理员密码、SQLite 单机演示，适合 PoC 不适合正式多租户系统；RAG 语料是演示用的社团知识块，真实部署需替换为社团真实资料。

更多工程细节（目录结构、API 路由、AI provider 设计）见 [CLAUDE.md](CLAUDE.md)。
