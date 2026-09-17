# CampusMatch AI｜校园社团招新智能匹配平台

大学社团招新季，新生面对几十个社团，只能一篇篇翻推文、海报自己比较，遇到问题也无处集中查询；社团负责人发了招新，同样看不清真实效果。
CampusMatch AI 用「可解释的规则推荐 + 有来源的 RAG 问答 + 轻量转化看板」一站式解决：学生选得准、问得清，负责人看得见转化。

## 🎯 功能

- **混合 AI 匹配**：向量语义召回 → 规则打分 → AI 写理由，可解释、可复现。
- **流式 AI 问答**：SSE 流式输出，RAG 检索知识库给出带来源的答案。
- **社团浏览**：搜索、分类 / 标签筛选、详情弹窗。
- **管理后台**：社团 CRUD + AI 生成描述 / 标签（HMAC Cookie 鉴权）。
- **运营看板**：转化率、AI 成功率、Token 消耗等聚合指标。
- **匿名意向追踪**：记录匹配 / 浏览意向（去重），支撑转化分析。

## ✨ 亮点

- **可解释推荐，不是黑箱打分**：匹配分（兴趣 40 / 目标 25 / 时间 20 / 技能 15）由规则代码计算，AI 只写理由、不能改分，结果可复现、可追溯。
- **混合检索，语义更准**：LangChain + sqlite-vec 向量召回，"我喜欢拍照"能命中"摄影协会"，纯关键词做不到。
- **知识库问答，有来源、不编造**：SSE 流式回答，命中来源社团随答案返回；资料没写就明确说"未说明"。
- **安全边界清晰**：Key 只在后端；管理写接口 HMAC 签名 Cookie 鉴权；公开接口只返回聚合数据。
- **效果可量化**：三套评测脚本覆盖匹配召回（MAP 0.934）、问答召回（MRR 0.899）、答案准确率（防幻觉 7/7）。

## 📊 实测效果

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

## 🌐 在线演示

<http://8.218.137.190>

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
