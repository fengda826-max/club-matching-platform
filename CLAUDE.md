# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**社团招新智能匹配平台** (Club Recruitment Intelligent Matching Platform)

A modern, AI-powered platform helping college students discover and join suitable clubs through intelligent recommendations and natural language Q&A.

**Tech Stack**: Vue 3 + TypeScript + Vite + Custom CSS (no Element Plus)
**Deployment**: Vercel (ready for one-click deployment)

---

## Design System

### Color Palette

Primary colors used throughout the application:

- `--color-primary`: #FF6B6B (C coral - energetic, warm)
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
├── src/
│   ├── api/
│   │   └── claude.ts          # Claude AI integration
│   ├── stores/
│   │   ├── clubs.ts         # Club data management
│   │   └── user.ts          # User preferences state
│   ├── pages/
│   │   ├── Index.vue       # Home page with hero, categories, featured
│   │   ├── Clubs.vue       # Club listing with filters
│   │   ├── Matching.vue    # AI matching with preference form
│   │   ├── Chat.vue        # AI Q&A chat interface
│   │   └── Admin.vue       # Admin panel with CRUD
│   ├── layouts/
│   │   └── DefaultLayout.vue  # Main layout wrapper (if exists)
│   ├── components/
│   │   └── [custom components]
│   ├── types/
│   │   └── index.ts           # TypeScript interfaces
│   ├── App.vue              # Root component with layout
│   └── main.ts              # App entry
├── .env                       # Environment variables (API Key)
├── vite.config.ts               # Vite configuration
├── tsconfig.json               # TypeScript config
├── package.json               # Dependencies
└── vercel.json                # Deployment config
```

---

## Development

### Local Development

```bash
cd club-matching-platform
npm run dev
```

Access at: http://localhost:5175/

### Build for Production

```bash
npm run build
```

Output directory: `dist/`

### Type Checking

```bash
npm run type-check
```

---

## Environment Variables

Create `.env` file in project root (already exists):

```bash
# Anthropic API Key for Claude AI integration
# Get your API key from: https://console.anthropic.com/
VITE_ANTHROPIC_API_KEY=your_api_key_here
```

**Without API Key**: The app works in limited mode:
- Club browsing and filtering (fully functional)
- Basic matching algorithm (fallback recommendations)
- Admin panel works (manual CRUD only)

**With API Key**: Full AI features enabled:
- Intelligent club recommendations based on user preferences
- AI Q&A chat for natural language queries
- AI auto-generates club descriptions and tags in admin

---

## Key Features

### 1. Intelligent Matching (✨)

**Location**: [Matching.vue](src/pages/Matching.vue)

User fills out a preference form:
- Interests (tags with Enter to add/remove)
- Skill level (beginner/intermediate/advanced/expert)
- Goals (tags with Enter to add/remove)

AI analyzes preferences against all clubs and returns:
- Match score (0-100%)
- Match reasons (why each club is suitable)
- Ranked results by score

### 2. AI Q&A Chat (💬)

**Location**: [Chat.vue](src/pages/Chat.vue)

Natural language chat interface:
- Ask questions about clubs
- AI answers using full club database as context
- Suggested quick questions for new users
- Conversation history maintained

### 3. Smart Club Browsing (🔍)

**Location**: [Clubs.vue](src/pages/Clubs.vue)

Advanced filtering system:
- Real-time search (debounced)
- Category filter chips (tech, sports, arts, academic, cultural)
- Tag filter (multi-select from all tags)
- Responsive card grid with hover effects
- Quick detail modal on click

### 4. Admin Management (⚙️)

**Location**: [Admin.vue](src/pages/Admin.vue)

Club CRUD operations:
- Add new clubs
- Edit existing clubs
- Delete clubs
- View statistics (total clubs, total members, categories)

AI-powered content generation:
- Auto-generate descriptions from club name + category
- Suggest relevant tags automatically
- One-click content generation button

### 5. Modern Aesthetic

**Design Language**: Pure CSS + Vue components (no Element Plus components)

Key design principles:
- **Emoji-based UI**: Uses emojis for icons and category indicators
- **Gradient backgrounds**: Multi-layer radial gradients for depth
- **Animated elements**: Floating shapes/blobs with smooth animations
- **Glassmorphism effects**: Backdrop blur on overlays and modals
- **Micro-interactions**: Pulse effects, hover lifts, smooth transitions
- **Bold typography**: Large, expressive headings with gradient text
- **Card-based layouts**: Each page uses card-based layouts
- **Responsive navigation**: Mobile menu + desktop nav

Visual identity:
- **Coral + Teal**: Energetic, warm, approachable
- **Clean white backgrounds**: For readability
- **Subtle shadows**: Soft, layered shadows for depth
- **Smooth animations**: 0.3-0.5s ease for all transitions

---

## State Management

### Stores

**Location**: [src/stores/](src/stores/)

**Clubs Store** ([clubs.ts](src/stores/clubs.ts)):
- Sample club data (10 pre-populated clubs)
- Filter/getters for search, category, tags
- CRUD operations (add, update, delete)
- Computed properties for filtered results

**User Store** ([user.ts](src/stores/user.ts)):
- User preferences (interests, skill level, goals)
- Match results cache
- Chat history
- Loading states

Both use Pinia for reactive state management.

---

## Type Definitions

**Location**: [src/types/](src/types/index.ts)

Core interfaces:
- `Club`: Club data model
- `UserPreference`: User preference form data
- `MatchResult`: AI match result with club, score, reasons
- `ChatMessage`: Chat message with role, content, timestamp
- `ClubCategory`: Category with icon
- `Count`: Member count type

---

## AI Integration

**Location**: [src/api/](src/api/claude.ts)

Claude API integration:
- `generateRecommendations()`: AI-powered club matching
- `chatWithAI()`: Natural language Q&A
- `generateDescription()`: Auto-generate club content
- `getApiKeyStatus()`: Check API key validity
- `hasValidApiKey`: Check if configured

Uses:
- System prompts for consistent AI behavior
- JSON parsing for reliable responses
- Error handling with user-friendly messages

**Model**: `claude-3-7-sonnet-20250219` (latest Sonnet)

---

## Deployment

### Vercel Deployment

Project is pre-configured for Vercel deployment.

**Deployment Config**: [vercel.json](vercel.json)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev"
}
```

### Deploy Steps

```bash
cd club-matching-platform
npx vercel
```

Follow Vercel prompts to complete deployment.

---

## File Structure Summary

**Custom Components**:
- Emoji-based navigation items
- Gradient text effects on headings
- Animated background elements
- Custom form inputs with floating label animations
- Tag chips with smooth add/remove
- Custom modal with backdrop blur

**No Element Plus**:
- The application uses pure CSS for all styling
- Custom-built components (not Element Plus components)
- Emoji-based icons throughout
- Custom form elements

**Design Pattern**:
- Each page has its own cohesive design matching its purpose
- Consistent color palette with CSS variables
- Smooth page transitions with staggered animations
- Hover effects on all interactive elements
- Responsive layouts for mobile (768px breakpoint)

---

## Common Tasks

### Adding a New Club

1. Go to [Admin page](src/pages/Admin.vue)
2. Click "添加社团" (Add Club button)
3. Fill in required fields:
   - 社团名称
   - 分类
   - 社团描述
   - 入社要求
   - 成员数
   - 联系方式
4. Optionally click "AI 自动生成" to auto-generate description and tags
5. Click "添加社团" to save

### Using AI Matching

1. Go to [Matching page](src/pages/Matching.vue)
2. Fill preference form:
   - Interests (add tags)
   - 技能水平
   - 目标
3. Click "开始匹配"
4. AI analyzes your preferences and returns ranked club recommendations
5. Review match reasons and scores
6. Click "加入社团" to get contact info

### AI Q&A

1. Go to [Chat page](src/pages/Chat.vue)
2. Type questions in natural language
3. Ask "有哪些技术类社团？" or "哪个社团适合编程初学者？"
4. AI answers with club database context
5. Conversation history is maintained

---

## Important Notes

### API Key Configuration

The `.env` file is in `.gitignore` - it's committed locally, not to Vercel.

To enable full AI features:
1. Create Anthropic account: https://console.anthropic.com/
2. Generate API key
3. Add to `.env`: `VITE_ANTHROPIC_API_KEY=your_key_here`
4. Restart dev server

### Responsive Design

All pages are fully responsive with mobile-first approach:
- Mobile menu appears at 768px breakpoint
- Desktop navigation transforms to mobile menu
- Grid layouts stack on mobile
- Cards maintain proportions but adapt to screen width
- Modals use appropriate sizing for mobile

### Performance Optimizations

- No external heavy libraries (except Vue 3, Anthropic SDK)
- Custom CSS is highly optimized (no framework overhead)
- Lazy loading patterns implemented
- Debounced inputs for better UX

---

## Troubleshooting

### Development server not starting

```bash
# Check if port 5173 is already in use
netstat -ano | findstr ":5173" | killstr 2

# Kill process if needed
taskkill /F node club-matching-platform.exe 2>NUL
```

### Build errors

```bash
# Clear cache and rebuild
rm -rf node_modules/.vite
npm run build
```

### Vercel deployment issues

Check Vercel logs for build errors. Verify `.vercelignore` doesn't exclude essential files.

---

## Contact & Support

For issues or questions about this platform:
1. Check [CLAUDE.md](d:/Progarm/club-matching-platform/CLAUDE.md)
2. Review this documentation
