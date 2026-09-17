# CampusMatch AI｜校园社团招新智能匹配平台

新生选社团常在几十篇推文里来回比较时间、费用、门槛；社团负责人发了招新推荐，却不知道有没有人真的因此报名。CampusMatch AI 用规则算法做出可复现、可解释的推荐，AI 负责把结果讲清楚，再用轻量运营看板展示转化效果。

## ✨ 亮点

- **可解释推荐，不是黑箱打分**：匹配分数（兴趣 40 / 目标 25 / 时间 20 / 技能 15）由确定性规则代码计算，AI 只写理由，不能改分、不能编造候选之外的社团。
- **真·混合检索（Hybrid RAG）**：LangChain + **sqlite-vec** 向量语义召回——"我喜欢拍照，周末有空"能命中"摄影协会"，这是纯关键词匹配做不到的语义理解。
- **安全边界清晰**：Key 只在后端；管理写接口 HMAC 签名 Cookie 鉴权；公开接口只返回聚合数据。
- **检索效果可量化、可复现**：三套评测脚本覆盖匹配召回、问答召回、端到端答案准确率。

## 💬 知识库问答（RAG Q&A）

学生问"编程俱乐部要交会费吗""哪个社团适合零基础学摄影"这类具体问题，`POST /api/ai/chat/stream`（SSE 流式）会：

1. 把问题 embed 成向量，在 sqlite-vec 里做 KNN 召回最相关的知识片段——知识库按「详细介绍/活动安排/入社流程/常见问答/往期活动/适合人群/培养收获」结构化分片，「常见问答」再按单个问答对拆成独立 chunk，避免多个问题挤在一起稀释向量；
2. 把召回的片段连同社团档案一起作为 grounding 喂给 qwen-flash，回答与命中的来源社团（`sources`）一起流式返回给前端（[Chat.vue](frontend/src/pages/Chat.vue) + `AnswerSources` 展示）；
3. 系统提示词强制"资料没写就明确说未说明，不能编造"，实测防幻觉 3/3；向量检索失败或未配置 Key 时自动退化为关键词检索，绝不报错（详见下方评测）。

## 📊 可量化的效果（实测，阿里云百炼）

用仓库内 `backend/scripts/` 下的评测脚本跑真实向量检索（30 社团 / 270 知识块）：

| 评测 | 脚本 | 关键指标 |
| --- | --- | --- |
| 匹配社团召回 | `eval_retrieval.py` | MAP **0.934**、nDCG@5 **0.943**、Recall@5 **0.939** |
| 问答段落召回 | `eval_qa_retrieval.py` | 章节 Hit@3 **0.921**、段落 MRR **0.899** |
| 端到端答案准确率 | `eval_qa_answer.py` | 单一事实/防幻觉 **7/7**、跨文档比较 **6/7** |

失败集中在"对找工作有帮助的社团""哪个会费最低"这类**模糊/跨文档**问题——这指明了查询改写、重排序等下一步优化方向。

工程优化：把「常见问答」按单个问答对分片（210→270 块）后问答召回 MRR 从 0.888 提升到 0.899；
给 LLM 只喂写理由所需的最小候选信息，匹配接口端到端延迟从 ~5.3s 降到 ~2.4s（−55%）。

## 🏗️ 架构

```text
浏览器 → Nginx（唯一公网入口、SSE 反向代理）→ FastAPI 模块化单体
  ├─ Auth / Intent / Analytics
  ├─ RuleMatchingService + VectorRetrievalService ── SQLite + sqlite-vec（同一文件）
  └─ Model Gateway ── 阿里云百炼（qwen-flash 对话 + text-embedding-v3 向量）
```

## 🛠️ 技术栈

Vue 3 + TypeScript + Vite + Pinia（前端）
Python + FastAPI + SQLAlchemy + SQLite（后端）
阿里云百炼 + LangChain + sqlite-vec（AI / RAG）
Docker Compose + Nginx（部署）

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

启动时会自动建表、注入社团、构建 sqlite-vec 向量索引。
前端：

```bash
cd frontend && npm install && npm run dev
```

前端 `http://localhost:5175`，后端健康检查 `http://localhost:3001/api/health`。
## 🐳 Docker 部署

```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env，至少替换 ADMIN_PASSWORD、SESSION_SECRET、AI_API_KEY
docker compose --env-file backend/.env up -d --build
curl --fail http://127.0.0.1/api/health
```

SQLite + 向量表在命名卷里持久化，重启容器不丢数据。
