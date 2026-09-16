# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**CampusMatch AI｜社团招新智能匹配平台**

A production-grade PoC for club recruitment: students get explainable AI-assisted recommendations (rules decide the score, AI only writes the reason), club operators see anonymized conversion metrics, and admins get an authenticated management panel.

**Architecture**: Monorepo with separate frontend and backend npm workspaces
- **Frontend**: Vue 3 + TypeScript + Vite + Pinia + Vue Router + Vitest
- **Backend**: Node.js + Express + TypeScript + Prisma ORM + SQLite (compiled with `tsc`, run as `node dist/server.js`; dev uses `ts-node-dev`)
- **AI provider**: hand-written gateway (`AIProvider` interface) — `AnthropicProvider` and `OpenAICompatProvider`. Default: **阿里云百炼 (DashScope)** OpenAI-compatible endpoint — `qwen-flash` chat + `text-embedding-v3` embeddings (1024 dims)
- **混合检索 (hybrid retrieval)**: 向量语义召回 (LangChain.js `OpenAIEmbeddings` + **sqlite-vec** `vec0` 虚拟表，和业务库共用同一个 SQLite 文件) → 规则层确定性打分（兴趣 40/目标 25/时间 20/技能 15，权重固定不可由 AI 改动）→ AI 只写推荐理由。`RAG_ENABLED` 开关控制；检索/模型失败时自动降级（问答退关键词检索，匹配退纯规则结果）
- **Deployment**: single server — Docker Compose (`app` container + `web` Nginx container), backend serves the built frontend static files, SQLite + sqlite-vec share one file in a named volume. See `README.md` for the full deployment guide.

---

## Design System

### Color Palette

Primary colors used throughout the application:

- `--color-primary`: #FF6B6B (coral - energetic, warm)
- `--color-primary-dark`: #EE5A5A (darker coral for gradients)
- `--color-secondary`: #2E86AB (Cyan/teal - vibrant, youthful)
- `--color-secondary-dark`: #256B8F (deep teal for gradients)
- `--color-accent`: #FFD93D (orange - playful accents)
- `--color-accent-dark`: #F0C929 (deep orange for gradients)
- `--color-dark`: #2D3436 (deep blue-gray for text)
- `--color-light`: #F8F9FA (off-white for backgrounds)
- `--color-white`: #FFFFFF (pure white for cards/modals)
- `--color-gray-100`: #F1F3F5 (light gray for borders)
- `--color-gray-200`: #E9ECEF (medium gray)
- `--color-gray-300`: #DEE2E6 (darker gray)
- `--color-gray-600`: #868E96 (text gray)

### Typography

- `--font-display`: 'Nunito' - Bold, expressive display font for headings
- `--font-body`: 'Inter' - Clean, readable body font for content

### Border Radius

- `--radius-sm`: 8px - Small borders/tags
- `--radius-md`: 12px - Medium components
- `--radius-lg`: 16px - Large cards
- `--radius-xl`: 24px - Extra large modals
- `--radius-full`: 9999px - Pill/round buttons

### Shadows

- `--shadow-sm`: 0 2px 8px rgba(45, 52, 54, 0.08)
- `--shadow-md`: 0 8px 24px rgba(45, 52, 54, 0.12)
- `--shadow-lg`: 0 16px 48px rgba(45, 52, 54, 0.16)

---

## Architecture

```
club-matching-platform/
├── docker-compose.yml                 # app (Express) + web (Nginx) containers
├── deploy/
│   ├── Dockerfile.web                 # Nginx image serving frontend/dist + reverse proxy
│   └── nginx.conf
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma              # Club / RecruitmentIntent / AIRequestLog (SQLite)
│   │   └── seed.ts                    # Seeds demo clubs
│   ├── scripts/
│   │   └── index-vectors.ts           # Rebuild the sqlite-vec knowledge index
│   ├── src/
│   │   ├── ai/                        # embeddings.ts (LangChain), vectorStore.ts (sqlite-vec)
│   │   ├── providers/                 # AIProvider interface, Anthropic/OpenAI-compat implementations
│   │   ├── services/
│   │   │   ├── AIService.ts               # groundedChat (RAG Q&A), chatComplete, description/tags
│   │   │   ├── RecommendationService.ts   # vector recall → RuleMatchingService → AI reasons
│   │   │   ├── RuleMatchingService.ts     # deterministic hard filters + 4-dimension scoring
│   │   │   ├── VectorRetrievalService.ts  # embed query → sqlite-vec KNN
│   │   │   ├── ClubService.ts, AnalyticsService.ts, IntentService.ts, AIRequestLogger.ts
│   │   ├── routes/                    # ai.ts, matching.ts, clubs.ts, auth.ts, analytics.ts, intents.ts
│   │   ├── middleware/                # adminAuth.ts (HMAC-signed cookie), rateLimits.ts, errorHandler.ts
│   │   ├── data/                      # demoClubs.ts, clubKnowledge.ts (RAG corpus), ensureDemoData.ts, ensureVectorIndex.ts
│   │   ├── schemas/                   # Zod schemas (chat, club, matching)
│   │   ├── app.ts, server.ts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/client.ts              # Typed backend API client — single source of truth
│   │   ├── router/index.ts            # 5 routes: / /clubs /matching /chat /admin
│   │   ├── stores/                    # clubs.ts, user.ts (Pinia)
│   │   ├── pages/                     # Index, Clubs, Matching, Chat, Admin
│   │   ├── components/                # layout/, matching/, chat/, admin/, ui/
│   │   ├── shared/                    # tags.ts, validators.ts, constants.ts
│   │   └── types/index.ts
│   ├── vite.config.ts
│   └── package.json
├── package.json                       # npm workspaces root (frontend, backend)
├── README.md                          # interview-facing PoC narrative, deployment guide
└── CLAUDE.md                          # this file
```

---

## Development

### Install Dependencies

```bash
cd club-matching-platform
npm install               # npm workspaces auto-installs frontend/ and backend/
```

### First-time setup (database + RAG index)

```bash
cd backend
npx prisma migrate deploy
npm run seed              # inserts demo clubs
npm run index:vectors     # embeds club knowledge into sqlite-vec (needs AI_API_KEY)
```

`index:vectors` can be skipped — the server auto-builds the index on startup if it's empty and a key is configured.

### Local Development

```bash
cd club-matching-platform
npm run dev                # concurrently runs backend (ts-node-dev) + frontend (vite)
```

- Frontend: http://localhost:5175/
- Backend: http://localhost:3001/
- Backend health check: http://localhost:3001/api/health
- AI health check: http://localhost:3001/api/ai/health

### Build for Production

```bash
npm run build              # builds frontend/dist and backend/dist (tsc)
```

The backend is compiled and started with `node dist/server.js` in production (not `tsx`/`ts-node`).

---

## Deployment

**Only supported path: Docker Compose on a persistent-filesystem host** (Alibaba Cloud / Tencent Cloud ECS, or any VM with Docker). SQLite + the sqlite-vec vector table need a real filesystem — this is **not** compatible with serverless/edge platforms (Vercel, Render's ephemeral free tier, etc.).

```bash
cp backend/.env.example backend/.env
# edit backend/.env — set ADMIN_PASSWORD, SESSION_SECRET, and AI_API_KEY
docker compose --env-file backend/.env up -d --build
curl --fail http://127.0.0.1/api/health
```

- `web` (Nginx) is the only container exposing a port (default 80); `app` (Express) is internal-only.
- Data (SQLite + sqlite-vec) lives in the named volume `campusmatch_data` — restarting containers doesn't lose data.
- Full step-by-step guide, security-group notes, and the 5-minute demo script are in `README.md` and `docs/demo-script.md`.

---

## Environment Variables

**Backend (`backend/.env`):** (see `backend/.env.example`)
```bash
DATABASE_URL="file:./dev.db"          # SQLite; sqlite-vec table shares this file

PORT=3001
CORS_ORIGIN=http://localhost:517*,https://localhost:517*
NODE_ENV=development

# AI — 阿里云百炼 (DashScope, OpenAI-compatible)
AI_PROVIDER=openai-compat             # anthropic | openai-compat
AI_API_KEY=your_dashscope_key_here
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL=qwen-flash
AI_TIMEOUT=30000
AI_MAX_RETRIES=2
AI_TEMPERATURE=0.3

# RAG — hybrid retrieval (vector semantic recall + rule scoring); shares the chat endpoint/key
AI_EMBEDDING_MODEL=text-embedding-v3
AI_EMBEDDING_DIM=1024
RAG_ENABLED=true
RAG_TOP_K=5

ADMIN_PASSWORD=replace_with_a_strong_demo_password
SESSION_SECRET=replace_with_a_long_random_secret
COOKIE_SECURE=false
SEED_DEMO_DATA=true
```

> **Security**: `backend/.env` is gitignored — never commit the real key. If a key is ever pasted into chat/logs, rotate it in the Alibaba Cloud console.

**Frontend (`frontend/.env`):**
```bash
VITE_BACKEND_URL=/api     # or an absolute URL for a separately hosted backend
```

**Without a valid AI Key**: AI endpoints report `configured: false`; club browsing, structured-form matching (rules-only) still work.
**With a valid key**: full hybrid RAG + AI reasoning is enabled.

---

## Key Features

### 1. Hybrid AI Matching (✨)

**Backend**: `POST /api/matching/extract-preferences` (optional NL→preferences) + `POST /api/matching/recommend` via `RecommendationService`

**Frontend**: [Matching.vue](frontend/src/pages/Matching.vue)

Pipeline: vector recall orders the candidate pool (semantic) → `RuleMatchingService` applies hard constraints and computes the deterministic score (interest 40 / goal 25 / schedule 20 / skill 15) → AI (`qwen-flash`) writes a short reason per candidate only, via `withStructuredOutput`-style Zod validation. Hallucinated or duplicate club IDs are rejected and the response falls back to `rules-only` mode. The model can never change a score.

### 2. Streaming AI Q&A Chat (💬) — RAG-grounded

**Backend**: `POST /api/ai/chat/stream` (SSE), `POST /api/ai/chat` (non-streaming) via `AIService.groundedChat`

**Frontend**: [Chat.vue](frontend/src/pages/Chat.vue), sources rendered by `AnswerSources.vue`

The question is embedded and matched against `club_doc_vectors` (sqlite-vec) for the top-k relevant knowledge passages; those are injected as grounding and returned as `sources` in the first SSE frame. Falls back to keyword retrieval if vector search fails or isn't configured.

### 3. AI Content Generation for Admin (⚡)

- `POST /api/ai/generate-description`, `POST /api/ai/suggest-tags` (both require admin auth)

### 4. Smart Club Browsing (🔍)

[Clubs.vue](frontend/src/pages/Clubs.vue) — search, category/tag filters, detail modal.

### 5. Admin Management (⚙️)

[Admin.vue](frontend/src/pages/Admin.vue) + `/api/clubs` CRUD. Write endpoints (`POST`/`PUT`/`DELETE`) require `requireAdmin` — an HMAC-SHA256-signed, HttpOnly session cookie set by `POST /api/auth/login`.

### 6. Operations Dashboard

`GET /api/analytics/summary` — aggregated business metrics (conversion, top categories) and AI run metrics (token cost, fallback rate). Only aggregates are exposed; no PII, prompts, or raw model output.

---

## AI Integration Architecture

- `src/providers/` — hand-written `AIProvider` interface (`initialize/generateStructured/chat/chatComplete/checkHealth/getProviderInfo`), implemented by `AnthropicProvider` and `OpenAICompatProvider`. No embedding method here — embeddings are a separate concern.
- `src/ai/embeddings.ts` — `createEmbeddings()` returns a LangChain `OpenAIEmbeddings` pointed at the same DashScope base URL/key.
- `src/ai/vectorStore.ts` — `SqliteVecStore`: opens a second `better-sqlite3` connection to the same SQLite file as Prisma (Prisma can't load native extensions), loads `sqlite-vec`, manages the `club_doc_vectors` virtual table. **Binding gotcha**: integer aux columns must be bound as `BigInt`, embeddings as JSON strings — plain JS numbers/Float32Array cause a "type mismatch" error.
- `src/services/VectorRetrievalService.ts` — embeds the query, runs KNN, dedupes by clubId (closest distance wins).
- Structured output: Zod schemas validated at runtime (no TS-cast-as-validation).
- Reliability: per-call timeout, caller-side `AbortSignal` cancellation, bounded retry on 429/502/503/504, deterministic rule/keyword fallback on any AI or vector failure.
- Observability (`AIRequestLog`): useCase, provider, model, status, duration, tokens, error code, fallback flag only — never raw prompts, answers, or student identity.

**Current default**: 阿里云百炼 (DashScope) — `qwen-flash` chat + `text-embedding-v3` embeddings. Swappable via `.env` (`AI_PROVIDER`/`AI_BASE_URL`/`AI_MODEL` — any OpenAI-compatible endpoint works).

---

## Database (Prisma ORM, SQLite)

**Schema**: [backend/prisma/schema.prisma](backend/prisma/schema.prisma)

```prisma
model Club {
  id               Int      @id @default(autoincrement())
  name             String   @unique
  category         String
  description      String
  requirements     String
  memberCount      Int
  contact          String
  tags             String   // comma-separated
  activityTime     String   @default("")
  weeklyHours      Int      @default(0)
  campus           String   @default("")
  fee              Int      @default(0)
  skillRequirement String   @default("beginner")
  isRecruiting     Boolean  @default(true)
  intents          RecruitmentIntent[]
}

model RecruitmentIntent {   // anonymized, deduped per (clubId, sessionId)
  clubId Int
  source String
  matchScore Int?
  sessionId String
}

model AIRequestLog {        // AI run metrics only — no prompts/answers
  useCase String
  provider String
  model String
  status String
  durationMs Int
  fallbackUsed Boolean
}
```

The sqlite-vec `club_doc_vectors` virtual table lives in the **same SQLite file** but is managed by a separate `better-sqlite3` connection (`src/ai/vectorStore.ts`), not by Prisma.

---

## API Endpoints

### Clubs
- `GET /api/clubs`, `GET /api/clubs/:id`
- `POST /api/clubs`, `PUT /api/clubs/:id`, `DELETE /api/clubs/:id` — admin only
- `GET /api/clubs/statistics/summary`, `GET /api/clubs/search/:keyword`, `GET /api/clubs/category/:category`, `GET /api/clubs/tags/all`

### Matching
- `POST /api/matching/extract-preferences` — NL → structured preferences (AI, user must confirm)
- `POST /api/matching/recommend` — hybrid matching (vector recall + rule scoring + AI reasons)

### AI
- `GET /api/ai/health`
- `POST /api/ai/chat/stream` (SSE), `POST /api/ai/chat`
- `POST /api/ai/generate-description`, `POST /api/ai/suggest-tags` — admin only

### Auth / Intents / Analytics
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/status`
- `POST /api/intents` — anonymized, deduped intent recording
- `GET /api/analytics/summary` — aggregated dashboard metrics

### Health
- `GET /api/health`

---

## Testing

```bash
npm test                    # frontend (Vitest) + backend (Vitest + Supertest)
npm run build                # tsc (backend) + vite build (frontend)
npm run evaluate --workspace backend   # deterministic CI evaluation, see docs/evaluation/latest.md
```

---

## Important Notes

### Responsive Design
Mobile-first; mobile nav breakpoint at 768px; grids stack on small screens.

### Known limitations
See `README.md` → "已知限制" for the current, authoritative list (single admin password, SQLite single-writer, demo RAG corpus, etc.) — don't duplicate it here to avoid drift.

---

## Troubleshooting

### Database / migration issues
```bash
cd backend && npx prisma migrate dev
```

### Vector search returns nothing / stale
```bash
cd backend && npm run index:vectors
```

### Frontend can't connect to backend
1. Backend running on port 3001?
2. `VITE_BACKEND_URL` in `frontend/.env` correct?
3. CORS_ORIGIN in `backend/.env` includes the frontend origin?

### AI API errors
1. `AI_API_KEY` set correctly in `backend/.env`?
2. Key has quota on 阿里云百炼?
3. Network can reach `https://dashscope.aliyuncs.com/compatible-mode/v1`?
4. `GET /api/ai/health` reports `healthy: true`?

> Windows Git Bash note: inline `curl -d '{...中文...}'` mangles UTF-8. Put the body in a file and use `curl --data-binary @body.json` when testing endpoints with Chinese payloads.

---

## Contact & Support

1. Check `README.md` for the full interview-facing narrative and deployment guide.
2. Check this file for engineering/architecture details.
