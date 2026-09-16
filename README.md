# CampusMatch AI｜可解释的校园社团招新智能匹配平台

新生选社团常在几十篇推文里来回比较时间、费用、门槛；社团负责人发了招新推荐，却不知道有没有人真的因此报名。CampusMatch AI 用规则算法做出可复现、可解释的推荐，AI 只负责把结果讲清楚，再用轻量运营看板展示转化效果。

## ✨ 亮点

- **可解释推荐，不是黑箱打分**：匹配分数（兴趣 40 / 目标 25 / 时间 20 / 技能 15）由确定性规则代码计算，AI 只写理由，不能改分、不能编造候选之外的社团。
- **真·混合检索（Hybrid RAG）**：LangChain + **sqlite-vec** 向量语义召回——"我喜欢拍照，周末有空"能命中"摄影协会"，这是纯关键词匹配做不到的语义理解。
- **三层降级链，无 Key 也能跑**：未配置模型走规则/关键词兜底，调用失败有界重试，输出不合法则拒绝降级——全程不报错。
- **安全边界清晰**：Key 只在后端；管理写接口 HMAC 签名 Cookie 鉴权；公开接口只返回聚合数据。
- **工程判断而非堆砌技术**：单机 SQLite + sqlite-vec，没有过早引入 Redis/Kubernetes/独立向量库——是取舍，不是能力上限。

## 🏗️ 架构

```text
浏览器 → Nginx（唯一公网入口、SSE 反向代理）→ FastAPI 模块化单体
  ├─ Auth / Intent / Analytics
  ├─ RuleMatchingService + VectorRetrievalService ── SQLite + sqlite-vec（同一文件）
  └─ Model Gateway ── 阿里云百炼（qwen-flash 对话 + text-embedding-v3 向量）
```

## 🛠️ 技术栈

Vue 3 + TypeScript + Vite + Pinia（前端）｜Python + FastAPI + SQLAlchemy + SQLite（后端）｜阿里云百炼 + LangChain + sqlite-vec（AI / RAG）｜Docker Compose + Nginx（部署）

## 🚀 本地运行

后端要求 Python 3.12+，前端要求 Node.js 20+。

后端：

```bash
cd backend
python -m venv .venv && source .venv/Scripts/activate   # Windows Git Bash；Linux/macOS 用 source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # 填入 AI_API_KEY（阿里云百炼）、ADMIN_PASSWORD、SESSION_SECRET
python -m uvicorn app.main:app --reload --port 3001
```

启动时会自动建表、注入演示社团、构建 sqlite-vec 向量索引（有 Key 时）。前端：

```bash
cd frontend && npm install && npm run dev
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

## ⚠️ 已知限制

单管理员密码、SQLite 单机演示，适合 PoC 不适合正式多租户系统；RAG 语料是演示用的社团知识块，真实部署需替换为社团真实资料。

更多工程细节（目录结构、API 路由、AI provider 设计）见 [CLAUDE.md](CLAUDE.md)。
