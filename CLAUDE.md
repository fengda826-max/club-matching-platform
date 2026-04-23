# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**社团招新智能匹配平台** (Club Recruitment Intelligent Matching Platform)

A modern, full-stack AI-powered platform helping college students discover and join suitable clubs through intelligent recommendations and natural language Q&A.

**Architecture**: Monorepo with separate frontend and backend workspaces
- **Frontend**: Vue 3 + TypeScript + Vite + Pinia + Vue Router + Element Plus + Vitest (testing)
- **Backend**: Node.js + Express + TypeScript + Prisma ORM + SQLite
- **AI**: Provider abstraction - supports Anthropic Claude native, and OpenAI-compatible APIs (火山引擎方舟, 火山引擎豆包, OpenAI, Azure OpenAI, self-hosted open-source models)
- **Default**: 火山引擎(Volcano Engine) 字节方舟 API - `ark-code-latest` model
- **Deployment**: Supports two models:
  - **Single-server**: Backend hosts built frontend static files (ideal for Alibaba Cloud/Tencent Cloud ECS)
  - **Separate**: Frontend on Vercel/Netlify + Backend on any Node.js hosting

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
├── backend/                          # Node.js backend
│   ├── prisma/
│   │   └── schema.prisma            # Database schema (Club model)
│   ├── src/
│   │   ├── providers/               # AI provider abstraction layer
│   │   │   ├── AnthropicProvider.ts    # Anthropic Claude native
│   │   │   ├── OpenAICompatProvider.ts # OpenAI-compatible endpoints
│   │   │   ├── BaseProvider.ts         # Base class with shared utilities
│   │   │   ├── index.ts                # Provider factory
│   │   │   └── types.ts               # TypeScript interfaces
│   │   ├── services/
│   │   │   ├── AIService.ts          # AI business logic
│   │   │   └── ClubService.ts        # Club data operations
│   │   ├── routes/
│   │   │   ├── ai.ts                # AI endpoints (matching, chat, generation)
│   │   │   └── clubs.ts             # Club CRUD endpoints
│   │   └── app.ts                   # Express app entry
│   └── package.json
├── frontend/                         # Vue 3 frontend
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts            # Backend API client (type-safe)
│   │   ├── router/
│   │   │   └── index.ts             # Vue Router configuration (5 routes)
│   │   ├── services/               # Business logic layer
│   │   │   ├── aiService.ts        # AI interaction + SSE streaming handling
│   │   │   ├── apiClient.ts        # API wrapper
│   │   │   ├── clubService.ts       # Club data operations
│   │   │   └── __tests__/          # Vitest unit tests
│   │   ├── shared/                 # Shared utilities
│   │   │   ├── tags.ts             # Tag parsing/validation
│   │   │   ├── validators.ts        # Input validation
│   │   │   ├── constants.ts         # App constants
│   │   │   └── __tests__/          # Utility tests
│   │   ├── stores/
│   │   │   ├── clubs.ts            # Club data state (Pinia)
│   │   │   └── user.ts             # User preferences + chat history (Pinia)
│   │   ├── pages/
│   │   │   ├── Index.vue          # Home page
│   │   │   ├── Clubs.vue          # Club listing with filters
│   │   │   ├── Matching.vue       # AI matching page
│   │   │   ├── Chat.vue           # AI Q&A streaming chat
│   │   │   └── Admin.vue          # Admin management panel
│   │   ├── types/
│   │   │   └── index.ts            # TypeScript interfaces
│   │   ├── App.vue                 # Root component
│   │   └── main.ts                 # App entry (Element Plus registration)
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── package.json                      # Workspace root
├── vercel.json                       # Vercel deployment config
└── .env                              # Environment variables
```

---

## Development

### Install Dependencies

```bash
cd club-matching-platform
npm run install-all
```

### Local Development

```bash
cd club-matching-platform
npm run dev
```

- Frontend: http://localhost:5175/
- Backend: http://localhost:3001/
- Backend health check: http://localhost:3001/api/health

### Build for Production

```bash
npm run build
```

Output: `frontend/dist/` (frontend), `backend/dist/` (backend)

---

## Deployment

### Single-Server Deployment (Alibaba Cloud/Tencent Cloud ECS)

**Recommended for cloud virtual server deployment.** When `NODE_ENV=production`, the backend automatically serves the built frontend static files from `frontend/dist`. This allows you to deploy everything on a single server with just Node.js.

**Steps for Alibaba Cloud/Tencent Cloud:**

1. Push code to your cloud server
2. Install dependencies:
   ```bash
   npm run install-all
   ```
3. Build:
   ```bash
   npm run build
   ```
4. Generate Prisma client:
   ```bash
   cd backend && npx prisma generate
   ```
5. Configure environment:
   - Copy `backend/.env.example` to `backend/.env`
   - Set `NODE_ENV=production`
   - Set your `AI_API_KEY` and other config
   - Set `PORT=3001` (or your preferred port)
6. Start the server with PM2 (recommended):
   ```bash
   cd backend
   pm2 start dist/app.js --name club-matching
   ```
7. Configure security group/firewall to open port 3001
8. Access at: `http://<your-server-ip>:3001`

**For production with domain:** Use Nginx as reverse proxy with SSL:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_http_version 1.1;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Separate Deployment

- **Frontend**: Can be deployed to Vercel, Netlify, or any static hosting
- **Backend**: Can be deployed to any Node.js hosting (Render, Fly.io, etc.)
- Update `VITE_API_URL` in `frontend/.env` to point to your backend domain

### Quick Demo Deployment (for 展示 / 一次性演示)

If you just need to **show the project** for an interview or demonstration (not permanent production), use this simplified method:

```bash
# 1. Install dependencies
cd club-matching-platform
npm run install-all

# 2. Build frontend + backend
npm run build

# 3. Generate Prisma client
cd backend && npx prisma generate

# 4. Make sure your AI_API_KEY is set in backend/.env
# Already configured: NODE_ENV=production, so backend will serve frontend automatically

# 5. Start server directly (no need for PM2 for temporary demo)
cd backend && npm start

# Server running at: http://<your-server-ip>:3001
```

**Notes for demo:**
- Just open port 3001 in your cloud server security group/firewall
- No need for domain name or SSL certificate during demo (use IP + port directly)
- When demo ends, just Ctrl+C to stop

### Render Deployment

**Recommended for free-tier demo hosting.** Render is perfect for this project because:
- Free tier available for demo
- Supports monorepo with workspaces
- Auto-deploys from GitHub

**Render Configuration:**

- **Root directory**: `./` (project root)
- **Build command**: `npm run install-all && npm run build && cd backend && npx prisma generate`
- **Start command**: `cd backend && npm start`
- **Environment variables** to set in Render dashboard:
  ```
  NODE_ENV=production
  PORT=10000
  AI_PROVIDER=openai-compat
  AI_API_KEY=your_actual_api_key_here
  AI_BASE_URL=https://ark.cn-beijing.volces.com/api/coding/v3
  AI_MODEL=ark-code-latest
  AI_TIMEOUT=30000
  AI_MAX_RETRIES=2
  DATABASE_URL=file:./dev.db
  ```

**Notes for Render:**
- Render's filesystem is ephemeral (data resets on restart) - acceptable for demo/portfolio
- Free tier spins down after inactivity - normal behavior for free tier
- Build may take 2-5 minutes on free tier - be patient

---

## Environment Variables

**Backend (`backend/.env`):**
```bash
# Database
DATABASE_URL="file:./dev.db"

# Server
PORT=3001
CORS_ORIGIN=http://localhost:517*,https://localhost:517*

# AI Configuration
AI_PROVIDER=openai-compat        # Options: anthropic | openai-compat
AI_API_KEY=your_api_key_here
AI_BASE_URL=https://ark.cn-beijing.volces.com/api/coding/v3  # 火山引擎方舟
AI_MODEL=ark-code-latest
AI_TIMEOUT=30000
AI_MAX_RETRIES=2
# AI_TEMPERATURE=0.7

# For Anthropic native use:
# AI_PROVIDER=anthropic
# AI_API_KEY=your_anthropic_key
# AI_MODEL=claude-3-7-sonnet-20250219
# AI_BASE_URL=https://api.anthropic.com
```

**Frontend (`frontend/.env`):**
```bash
# Backend API URL
VITE_API_URL=http://localhost:3001/api
```

**Without AI API Key**: App works in limited mode (browsing only).
**With API Key**: Full AI features enabled.

**Default Configuration**: Uses **火山引擎(Volcano Engine) 字节方舟** with OpenAI-compatible API.

---

## Key Features

### 1. AI Intelligent Matching (✨)

**Backend**: `POST /api/ai/matching` via `AIService.generateMatching()`

**Frontend**: [Matching.vue](frontend/src/pages/Matching.vue)

User fills out a preference form:
- Interests (tags with Enter to add/remove)
- Skill level (beginner/intermediate/advanced/expert)
- Goals (tags with Enter to add/remove)

AI analyzes preferences against all clubs and returns:
- Top 5 matches ranked by match score (0-100)
- Explicit match reasons (why each club is suitable)
- Structured JSON output for reliable parsing

### 2. Streaming AI Q&A Chat (💬)

**Backend**: `POST /api/ai/chat/stream` (SSE streaming), `POST /api/ai/chat` (non-streaming)

**Frontend**: [Chat.vue](frontend/src/pages/Chat.vue)

Natural language chat interface:
- Ask questions about clubs in natural language
- AI answers using full club database as context
- Server-Sent Events (SSE) for real-time streaming response
- Suggested quick questions for new users
- Conversation history maintained

Example questions:
- "有哪些技术类社团？"
- "哪个社团适合编程初学者？"
- "我喜欢摄影，应该加哪个社团？"

### 3. AI Content Generation for Admin (⚡)

**Backend endpoints**:
- `POST /api/ai/generate-description` - Auto-generate club description
- `POST /api/ai/suggest-tags` - Suggest relevant tags

**Frontend**: [Admin.vue](frontend/src/pages/Admin.vue)

AI-powered content generation:
- Auto-generate descriptions from club name + category
- Suggest relevant tags automatically
- One-click generation, editable before saving
- Reduces admin content creation effort

### 4. Smart Club Browsing (🔍)

**Frontend**: [Clubs.vue](frontend/src/pages/Clubs.vue)

Advanced filtering system:
- Real-time search (debounced)
- Category filter chips (tech, sports, arts, academic, cultural)
- Tag filter (multi-select from all tags)
- Responsive card grid with hover effects
- Quick detail modal on click

### 5. Admin Management (⚙️)

**Frontend**: [Admin.vue](frontend/src/pages/Admin.vue)
**Backend**: `GET/POST/PUT/DELETE /api/clubs/*`

Complete club CRUD operations:
- Add new clubs
- Edit existing clubs
- Delete clubs
- View statistics (total clubs, by category)

### 6. Modern Aesthetic

**Design Language**: Element Plus components + custom CSS theme

Key design principles:
- **Emoji-based UI**: Uses emojis for icons and category indicators
- **Gradient backgrounds**: Multi-layer radial gradients for depth
- **Animated elements**: Floating shapes/blobs with smooth animations
- **Glassmorphism effects**: Backdrop blur on overlays and modals
- **Micro-interactions**: Pulse effects, hover lifts, smooth transitions
- **Bold typography**: Large, expressive headings with gradient text
- **Card-based layouts**: Each page uses card-based layouts
- **Responsive navigation**: Mobile menu + desktop nav
- **Chinese locale**: Element Plus configured for Simplified Chinese

Visual identity:
- **Coral + Teal**: Energetic, warm, approachable
- **Clean white backgrounds**: For readability
- **Subtle shadows**: Soft, layered shadows for depth
- **Smooth animations**: 0.3-0.5s ease for all transitions

---

## AI Integration Architecture

### Provider Abstraction

The backend implements a clean provider abstraction pattern:
- `AIProvider` interface defines common methods
- `AnthropicProvider` - Native Anthropic Claude integration
- `OpenAICompatProvider` - Works with any OpenAI-compatible API
- Easy to add new providers

### AI Capabilities

1. **Structured Output Generation**
   - System prompt engineering enforces JSON format
   - Automatic JSON extraction from model output
   - Type-safe parsing

2. **Streaming Chat**
   - Server-Sent Events (SSE) for real-time streaming
   - Full conversation history support
   - Temperature configurable per request

3. **Different System Prompts per Use Case**
   - Matching: focused on pairwise comparison and scoring
   - Chat: focused on helpful, context-aware answers
   - Content generation: focused on concise, engaging copy
   - Tag suggestion: focused on relevant keywords

**Supported Providers**:
- `anthropic` - Native Anthropic Claude (default model: `claude-3-7-sonnet-20250219`)
- `openai-compat` - OpenAI-compatible endpoints:
  - ✅ 火山引擎(Volcano Engine) 字节方舟 - current default
  - ✅ 火山引擎豆包
  - ✅ OpenAI official
  - ✅ Azure OpenAI
  - ✅ Self-hosted open-source models (e.g., Llama, Qwen, etc.)

**Current Default**: 火山引擎字节方舟 `ark-code-latest`

---

## Database (Prisma ORM)

**Schema**: [backend/prisma/schema.prisma](backend/prisma/schema.prisma)

```prisma
model Club {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  category    String
  description String
  requirements String
  memberCount Int
  contact     String
  tags        String   // Comma-separated tags
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## State Management (Frontend)

**Pinia Stores**:

**Clubs Store** ([clubs.ts](frontend/src/stores/clubs.ts)):
- Fetch all clubs from backend
- Filtered getters for search, category, tags
- CRUD operations (add, update, delete)
- Loading states

**User Store** ([user.ts](frontend/src/stores/user.ts)):
- User preferences (interests, skill level, goals)
- Match results cache
- Chat history
- Loading states

---

## API Endpoints

### Clubs
- `GET /api/clubs` - Get all clubs
- `GET /api/clubs/:id` - Get club by ID
- `POST /api/clubs` - Create new club
- `PUT /api/clubs/:id` - Update club
- `DELETE /api/clubs/:id` - Delete club
- `GET /api/clubs/stats` - Get statistics

### AI
- `GET /api/ai/health` - Check AI provider health
- `POST /api/ai/matching` - Generate matching recommendations
- `POST /api/ai/chat/stream` - Streaming chat (SSE)
- `POST /api/ai/chat` - Non-streaming chat completion
- `POST /api/ai/generate-description` - Generate club description
- `POST /api/ai/suggest-tags` - Suggest tags for club

### Health
- `GET /api/health` - Backend health check

---

## Key Technical Features

### 1. AI Provider Abstraction
- Clean separation of business logic and AI implementation
- Easy to swap between different LLM providers
- Supports Anthropic Claude and OpenAI-compatible APIs out of the box

### 2. Streaming Response
- Server-Sent Events (SSE) for real-time streaming chat
- Better UX than waiting for full completion
- Progressive display of AI response

### 3. Structured Output via Prompt Engineering
- System prompts enforce JSON output format
- Robust extraction handles extra text before/after JSON
- Consistent schema for reliable parsing

### 4. Error Handling
- Classification of AI errors (invalid key, rate limit, network, etc.)
- Proper HTTP status codes
- Development mode exposes error details

### 5. Full TypeScript
- All code typed
- Interfaces defined for all API contracts
- Type safety across full stack

### 6. Unit Testing
- Frontend utilities and services unit-tested with Vitest
- Tag parsing, validation, API client have test coverage
- Easy to add more tests as features grow

---

## File Structure Summary

**Backend Highlights**:
- Provider factory pattern for AI providers (easy to swap)
- Service layer separates business logic from routes
- Prisma ORM for type-safe database access
- Express with proper middleware and centralized error handling
- Complete CRUD with search, filter, statistics endpoints

**Frontend Highlights**:
- Element Plus UI framework with Chinese locale
- Custom CSS theme with CSS variables for consistent design
- Vue Router for SPA routing
- Pinia for simple, reactive state management
- Service layer separates business logic from components
- Vitest for unit testing utilities and services
- Full TypeScript end-to-end

---

## Common Tasks

### Adding a New Club

1. Go to Admin page
2. Click "添加社团" (Add Club button)
3. Fill in required fields:
   - 社团名称
   - 分类
   - 社团描述
   - 入社要求
   - 成员数
   - 联系方式
4. Optionally click "AI 自动生成描述" or "AI 推荐标签"
5. Click "添加社团" to save

### Using AI Matching

1. Go to Matching page
2. Fill preference form:
   - Interests (add tags)
   - 技能水平
   - 目标
3. Click "开始匹配"
4. AI analyzes preferences and returns ranked recommendations
5. Review match reasons and scores
6. Click "联系社团" to get contact info

---

## Important Notes

### Responsive Design

All pages are fully responsive with mobile-first approach:
- Mobile menu appears at 768px breakpoint
- Desktop navigation transforms to mobile menu
- Grid layouts stack on mobile
- Cards maintain proportions but adapt to screen width
- Modals use appropriate sizing for mobile

### Performance Optimizations

- No external heavy UI frameworks (custom lightweight CSS)
- Debounced inputs for better UX
- Lazy loading where appropriate
- Static typing catches errors early

---

## Troubleshooting

### Database migration issues

```bash
cd backend
npx prisma migrate dev
```

### Frontend can't connect to backend

Check:
1. Backend is running on port 3001
2. `VITE_API_URL` in `frontend/.env` points to correct backend URL
3. CORS configuration in backend allows frontend origin

### AI API errors

Check:
1. API key is correctly set in `backend/.env`
2. API key has sufficient quota
3. Network can reach your configured AI API endpoint (Anthropic or Volcano Engine)

---

## Contact & Support

For issues or questions about this platform:
1. Check [CLAUDE.md](CLAUDE.md)
2. Review this documentation
