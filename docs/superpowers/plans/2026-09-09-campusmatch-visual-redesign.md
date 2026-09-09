# CampusMatch Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current gradient-and-emoji interface with the approved “Campus Signal” design while preserving every existing user and admin workflow.

**Architecture:** Introduce a small presentation layer containing design tokens, navigation/category metadata, and reusable display components. Migrate the application shell first, then each route independently so that business stores and API contracts stay untouched. Validate behavior with Vitest component tests and validate visual quality with desktop/mobile browser passes against the Docker deployment.

**Tech Stack:** Vue 3, TypeScript, Vue Router, Pinia, Element Plus, Vitest, `@vue/test-utils`, happy-dom, Vite, Docker Compose

**Spec:** `docs/superpowers/specs/2026-09-09-campusmatch-visual-redesign-design.md`

## Global Constraints

- Preserve routes `/`, `/clubs`, `/matching`, `/chat`, and `/admin` and all current API contracts.
- Use Ink Forest `#173F38`, Campus Green `#176956`, Signal Lime `#D9F26B`, Field Paper `#F2F6F3`, Surface `#FFFFFF`, Border Moss `#D5DFD9`, Text Ink `#142522`, and Text Muted `#647870`.
- Signal Lime is reserved for scores, key progress, online state, and primary emphasis; it is not a page background.
- Remove decorative radial gradients, floating Emoji, glassmorphism, and non-functional looping motion.
- Keep touch targets at least 44×44px, visible `:focus-visible` styles, text/status labels that do not depend on color alone, and `prefers-reduced-motion` support.
- Do not introduce a new production UI framework or icon dependency; use CSS, text labels, and the existing Element Plus dependency.
- Do not change backend logic, database schema, matching weights, authentication rules, or environment handling.
- Keep real DeepSeek, rules-only fallback, SSE streaming, club filtering, intent recording, and admin CRUD behavior intact.

---

### Task 1: Presentation metadata and test environment

**Files:**
- Create: `frontend/src/shared/presentation.ts`
- Create: `frontend/src/shared/__tests__/presentation.test.ts`
- Modify: `frontend/package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `NAV_ITEMS: readonly NavItem[]`
- Produces: `getCategoryPresentation(category: string): CategoryPresentation`
- Produces: `CategoryPresentation = { shortLabel: string; label: string; tone: 'green' | 'blue' | 'amber' | 'plum' | 'slate' }`
- Consumes: existing route paths and Chinese category names.

- [ ] **Step 1: Write the failing presentation metadata test**

```ts
import { describe, expect, it } from 'vitest'
import { getCategoryPresentation, NAV_ITEMS } from '../presentation'

describe('presentation metadata', () => {
  it('exposes every user-facing route once with user-facing labels', () => {
    expect(NAV_ITEMS.map(item => item.to)).toEqual(['/', '/clubs', '/matching', '/chat', '/admin'])
    expect(new Set(NAV_ITEMS.map(item => item.to)).size).toBe(NAV_ITEMS.length)
  })

  it('returns a stable fallback for unknown categories', () => {
    expect(getCategoryPresentation('技术')).toEqual({ shortLabel: '技', label: '技术', tone: 'green' })
    expect(getCategoryPresentation('未知')).toEqual({ shortLabel: '社', label: '未知', tone: 'slate' })
  })
})
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run: `npm test --workspace frontend -- src/shared/__tests__/presentation.test.ts`

Expected: FAIL because `../presentation` does not exist.

- [ ] **Step 3: Implement the metadata module**

```ts
export type CategoryPresentation = {
  shortLabel: string
  label: string
  tone: 'green' | 'blue' | 'amber' | 'plum' | 'slate'
}

export const NAV_ITEMS = [
  { to: '/', label: '首页' },
  { to: '/clubs', label: '发现社团' },
  { to: '/matching', label: '智能匹配' },
  { to: '/chat', label: 'AI 问答' },
  { to: '/admin', label: '运营看板' },
] as const

const categories: Record<string, Omit<CategoryPresentation, 'label'>> = {
  技术: { shortLabel: '技', tone: 'green' },
  体育: { shortLabel: '体', tone: 'blue' },
  艺术: { shortLabel: '艺', tone: 'plum' },
  学术: { shortLabel: '学', tone: 'amber' },
  文化: { shortLabel: '文', tone: 'slate' },
}

export function getCategoryPresentation(category: string): CategoryPresentation {
  const known = categories[category]
  return { shortLabel: known?.shortLabel ?? '社', label: category, tone: known?.tone ?? 'slate' }
}
```

- [ ] **Step 4: Install the component-test dependencies**

Run: `npm install -D @vue/test-utils happy-dom --workspace frontend`

Expected: `frontend/package.json` and root `package-lock.json` record both packages.

- [ ] **Step 5: Run the focused test**

Run: `npm test --workspace frontend -- src/shared/__tests__/presentation.test.ts`

Expected: 2 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/presentation.ts frontend/src/shared/__tests__/presentation.test.ts frontend/package.json package-lock.json
git commit -m "test: add presentation metadata contract"
```

---

### Task 2: Global tokens, primitives, and application shell

**Files:**
- Create: `frontend/src/components/ui/StatusPill.vue`
- Create: `frontend/src/components/ui/CategoryMark.vue`
- Create: `frontend/src/components/ui/DecisionFact.vue`
- Create: `frontend/src/components/ui/EmptyState.vue`
- Create: `frontend/src/components/layout/AppHeader.vue`
- Create: `frontend/src/components/layout/AppFooter.vue`
- Create: `frontend/src/components/layout/PageIntro.vue`
- Create: `frontend/src/components/layout/__tests__/AppHeader.test.ts`
- Modify: `frontend/src/style.css`
- Modify: `frontend/src/App.vue`

**Interfaces:**
- Consumes: `NAV_ITEMS` and `getCategoryPresentation()` from Task 1.
- `AppHeader` props: `aiOnline?: boolean`; internal state: `menuOpen: boolean`.
- `StatusPill` props: `tone: 'success' | 'warning' | 'danger' | 'neutral'`, `label: string`.
- `CategoryMark` props: `category: string`, `size?: 'sm' | 'md' | 'lg'`.
- `DecisionFact` props: `label: string`, `value: string | number`.
- `PageIntro` slots: default title, `description`, `aside`.

- [ ] **Step 1: Write the failing application-header behavior test**

```ts
// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import AppHeader from '../AppHeader.vue'

describe('AppHeader', () => {
  it('shows every route and toggles the mobile menu accessibly', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/clubs', component: { template: '<div />' } },
      { path: '/matching', component: { template: '<div />' } },
      { path: '/chat', component: { template: '<div />' } },
      { path: '/admin', component: { template: '<div />' } },
    ] })
    const wrapper = mount(AppHeader, { global: { plugins: [router] } })
    expect(wrapper.findAll('nav a')).toHaveLength(5)
    const toggle = wrapper.get('[aria-controls="mobile-navigation"]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test --workspace frontend -- src/components/layout/__tests__/AppHeader.test.ts`

Expected: FAIL because `AppHeader.vue` does not exist.

- [ ] **Step 3: Add the global “Campus Signal” token system**

Replace legacy root variables and generic animation rules in `frontend/src/style.css` with:

```css
:root {
  --ink-forest: #173f38;
  --campus-green: #176956;
  --signal-lime: #d9f26b;
  --field-paper: #f2f6f3;
  --surface: #fff;
  --border-moss: #d5dfd9;
  --text-ink: #142522;
  --text-muted: #647870;
  --warning: #a76416;
  --danger: #b44343;
  --radius-control: 6px;
  --radius-card: 10px;
  --radius-panel: 14px;
  --content-wide: 1240px;
  --content-app: 1180px;
  font-family: Inter, "Microsoft YaHei", "PingFang SC", sans-serif;
  color: var(--text-ink);
  background: var(--field-paper);
}

* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; background: var(--field-paper); }
button, input, textarea, select { font: inherit; }
:focus-visible { outline: 3px solid rgba(23,105,86,.28); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
```

- [ ] **Step 4: Implement the primitive components**

Use semantic markup: `StatusPill` renders `<span role="status">`, `CategoryMark` renders an `aria-hidden` short label plus visible category text, `DecisionFact` renders `<dt>/<dd>`, and `EmptyState` renders a heading, guidance text, and optional action slot. Style them only with the tokens from Step 3.

```vue
<!-- StatusPill.vue -->
<template><span role="status" class="status-pill" :class="`is-${tone}`">{{ label }}</span></template>
<script setup lang="ts">defineProps<{ tone: 'success'|'warning'|'danger'|'neutral'; label: string }>()</script>
```

- [ ] **Step 5: Implement the application shell**

`AppHeader.vue` uses `NAV_ITEMS`, a real `<nav>`, `RouterLink`, and an accessible menu button with `aria-controls="mobile-navigation"`. `AppFooter.vue` contains the product statement and stack summary. `PageIntro.vue` establishes the shared inner-page title layout. Replace the 500-line legacy shell in `App.vue` with:

```vue
<template>
  <div class="app-shell">
    <AppHeader />
    <RouterView />
    <AppFooter />
  </div>
</template>
```

- [ ] **Step 6: Run the header test and complete styles until it passes**

Run: `npm test --workspace frontend -- src/components/layout/__tests__/AppHeader.test.ts`

Expected: PASS; the menu button changes `aria-expanded` and five route links are present.

- [ ] **Step 7: Run frontend type-check and build**

Run: `npm run type-check --workspace frontend`

Expected: exit 0.

Run: `npm run build --workspace frontend`

Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/App.vue frontend/src/style.css frontend/src/components/ui frontend/src/components/layout
git commit -m "feat: establish Campus Signal design system"
```

---

### Task 3: Rebuild the homepage as a live product demonstration

**Files:**
- Modify: `frontend/src/pages/Index.vue`
- Create: `frontend/src/pages/__tests__/Index.test.ts`

**Interfaces:**
- Consumes: clubs Pinia store, `CategoryMark`, `DecisionFact`, and existing router routes.
- Preserves: search text navigation to `/clubs`, CTA navigation to `/matching` and `/chat`, real club/statistics rendering.
- Produces: one hero requirement form and a non-interactive recommendation example that explains rule + AI behavior.

- [ ] **Step 1: Write the failing homepage behavior test**

```ts
// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Index from '../Index.vue'

vi.mock('@/stores/clubs', () => ({ useClubsStore: () => ({
  clubs: [], featuredClubs: [], categories: [],
  statistics: { totalClubs: 10, totalMembers: 1089, categories: [] },
  fetchClubs: vi.fn(), fetchStatistics: vi.fn(),
}) }))

describe('Index page', () => {
  beforeEach(() => setActivePinia(createPinia()))
  it('sends the written requirement to the matching route', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/', component: Index }, { path: '/matching', component: { template: '<div />' } },
    ] })
    const wrapper = mount(Index, { global: { plugins: [router] } })
    await wrapper.get('textarea[name="requirement"]').setValue('周末有空，零基础，想学编程')
    await wrapper.get('form[aria-label="描述匹配需求"]').trigger('submit')
    expect(router.currentRoute.value.path).toBe('/matching')
    expect(router.currentRoute.value.query.need).toBe('周末有空，零基础，想学编程')
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails on the missing form contract**

Run: `npm test --workspace frontend -- src/pages/__tests__/Index.test.ts`

Expected: FAIL because the old hero does not expose `textarea[name="requirement"]` and the accessible form.

- [ ] **Step 3: Replace the homepage template**

Build these sections in order: split hero, recommendation demonstration card, three trust commitments, “how it works” rail, current recruiting clubs, final matching CTA. Use one `<h1>`, real statistics, and no floating decorations.

```vue
<form aria-label="描述匹配需求" class="requirement-form" @submit.prevent="startMatching">
  <label for="home-requirement">告诉我你的时间、兴趣和目标</label>
  <textarea id="home-requirement" v-model="requirement" name="requirement" rows="3" />
  <button type="submit">分析我的需求</button>
</form>
```

`startMatching()` pushes `{ path: '/matching', query: { need: requirement.value.trim() } }` when non-empty and otherwise pushes `/matching`.

- [ ] **Step 4: Implement the approved visual hierarchy**

Use a 1.1/0.9 hero grid, a dark Ink Forest recommendation card offset by an 8px Signal Lime edge, border-led content sections, and category marks instead of Emoji. At `max-width: 820px`, stack the hero and keep the form before the example card.

- [ ] **Step 5: Run focused and full frontend tests**

Run: `npm test --workspace frontend -- src/pages/__tests__/Index.test.ts`

Expected: PASS.

Run: `npm test --workspace frontend`

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Index.vue frontend/src/pages/__tests__/Index.test.ts
git commit -m "feat: turn homepage into product demonstration"
```

---

### Task 4: Redesign club discovery and detail flow

**Files:**
- Modify: `frontend/src/pages/Clubs.vue`
- Create: `frontend/src/pages/__tests__/Clubs.test.ts`

**Interfaces:**
- Consumes: existing clubs store filtering state and `getCategoryPresentation()`.
- Preserves: keyword search, category filters, tag filters, recruiting status, detail modal, and contact display.
- Produces: filter summary text and compact decision facts for time, campus, fee, and skill requirement.

- [ ] **Step 1: Write the failing filter accessibility test**

```ts
// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import Clubs from '../Clubs.vue'

describe('Clubs page', () => {
  beforeEach(() => setActivePinia(createPinia()))
  it('labels the search and reports active filters', async () => {
    const wrapper = mount(Clubs, { global: { stubs: ['RouterLink'] } })
    const search = wrapper.get('input[type="search"]')
    expect(search.attributes('aria-label')).toBe('搜索社团')
    await search.setValue('编程')
    expect(wrapper.get('[aria-live="polite"]').text()).toContain('编程')
  })
})
```

- [ ] **Step 2: Run the test and verify the old page fails the accessible contract**

Run: `npm test --workspace frontend -- src/pages/__tests__/Clubs.test.ts`

Expected: FAIL because the old search and live filter summary do not satisfy the contract.

- [ ] **Step 3: Replace decorative card content with decision facts**

Each card renders category mark, recruiting status, name, description, and a `<dl>` containing activity time, campus, fee (`免费` for zero), and skill requirement. Keep exactly one primary card action: `查看详情`.

- [ ] **Step 4: Rebuild filter and empty states**

Use a desktop filter sidebar and mobile collapsible filter panel. Add `aria-live="polite"` summary text such as `“编程” · 技术 · 2 个结果`. Render `EmptyState` with a “清除筛选” action when no clubs match.

- [ ] **Step 5: Rebuild the detail modal semantics**

Use `role="dialog"`, `aria-modal="true"`, an accessible close label, Escape handling, and visible focus. Preserve contact and recruitment details. Do not expose admin-only actions.

- [ ] **Step 6: Run tests and build**

Run: `npm test --workspace frontend -- src/pages/__tests__/Clubs.test.ts`

Expected: PASS.

Run: `npm run build --workspace frontend`

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Clubs.vue frontend/src/pages/__tests__/Clubs.test.ts
git commit -m "feat: clarify club discovery decisions"
```

---

### Task 5: Unify matching input, evidence, and fallback states

**Files:**
- Modify: `frontend/src/pages/Matching.vue`
- Modify: `frontend/src/components/matching/PreferenceReview.vue`
- Modify: `frontend/src/components/matching/MatchBreakdown.vue`
- Create: `frontend/src/components/matching/__tests__/MatchBreakdown.test.ts`

**Interfaces:**
- Consumes: `need` query from Task 3, existing matching API methods, `Recommendation`, `UserPreference`, and intent API.
- Preserves: AI extraction, manual preference review, recommendation, rule fallback, and intent recording.
- Produces: `MatchBreakdown` with accessible score label and explicit evidence/caveat sections.

- [ ] **Step 1: Write the failing match-result semantics test**

```ts
// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MatchBreakdown from '../MatchBreakdown.vue'

describe('MatchBreakdown', () => {
  it('separates evidence from caveats and labels the score', () => {
    const wrapper = mount(MatchBreakdown, { props: { item: {
      clubId: 1, score: 92,
      dimensions: { interest: 38, goal: 21, schedule: 20, skill: 13 },
      evidence: ['兴趣：编程'], caveats: ['每周投入 3 小时'], reason: '匹配你的兴趣与竞赛目标。',
      club: { id: 1, name: '编程俱乐部', category: '技术', description: '', requirements: '', memberCount: 128, contact: '', tags: '编程', activityTime: '周六', weeklyHours: 3, campus: '南校区', fee: 0, skillRequirement: 'beginner', isRecruiting: true, createdAt: '', updatedAt: '' },
    }, intentRecorded: false } })
    expect(wrapper.get('[aria-label="匹配分 92 分"]').exists()).toBe(true)
    expect(wrapper.get('[data-section="evidence"]').text()).toContain('兴趣：编程')
    expect(wrapper.get('[data-section="caveats"]').text()).toContain('每周投入 3 小时')
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test --workspace frontend -- src/components/matching/__tests__/MatchBreakdown.test.ts`

Expected: FAIL because the old component does not expose the score/evidence section contract.

- [ ] **Step 3: Accept the homepage requirement query**

In `Matching.vue`, read `useRoute().query.need` on setup and use the first string value as `naturalText`; retain the current example only when the query is absent.

- [ ] **Step 4: Rebuild matching as a visible three-stage flow**

Render a compact stage rail, then the two-column requirement/preference workspace, then result cards. Use `StatusPill` labels `AI 已连接`, `规则模式可用`, `规则评分 + AI 解释`, and `已降级为规则结果`.

- [ ] **Step 5: Rebuild preference and result components**

`PreferenceReview` groups interests, goals, schedule, and hard limits with persistent labels and field-level warnings. `MatchBreakdown` uses a score block, four dimension bars with text values, evidence list, caveat list, decision facts, and a consistent `登记加入意向` / `已登记意向` button.

- [ ] **Step 6: Run focused and full tests**

Run: `npm test --workspace frontend -- src/components/matching/__tests__/MatchBreakdown.test.ts`

Expected: PASS.

Run: `npm test --workspace frontend`

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Matching.vue frontend/src/components/matching
git commit -m "feat: make matching evidence visually explicit"
```

---

### Task 6: Turn AI chat into a stable decision workspace

**Files:**
- Modify: `frontend/src/pages/Chat.vue`
- Modify: `frontend/src/components/chat/AnswerSources.vue`
- Create: `frontend/src/pages/__tests__/Chat.test.ts`

**Interfaces:**
- Consumes: existing user store, clubs store, `streamChat()`, model metadata, sources, duration, and abort controller.
- Preserves: suggested questions, SSE chunks, auto-scroll, stop generation, error display, and clear history.
- Produces: semantic transcript (`role="log"`, `aria-live="polite"`) and an accessible fixed composer.

- [ ] **Step 1: Write the failing composer contract test**

```ts
// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import Chat from '../Chat.vue'

describe('Chat page', () => {
  beforeEach(() => setActivePinia(createPinia()))
  it('provides a labeled transcript and composer', () => {
    const wrapper = mount(Chat)
    expect(wrapper.get('[role="log"]').attributes('aria-live')).toBe('polite')
    expect(wrapper.get('textarea[aria-label="向 AI 社团顾问提问"]').exists()).toBe(true)
    expect(wrapper.get('button[type="submit"]').text()).toContain('发送')
  })
})
```

- [ ] **Step 2: Run the test and verify the old markup fails**

Run: `npm test --workspace frontend -- src/pages/__tests__/Chat.test.ts`

Expected: FAIL because the old chat uses an unlabeled text input and no log region.

- [ ] **Step 3: Rebuild the page header and transcript**

Use `PageIntro` with model status. Remove floating elements and bouncing Emoji. Render user and assistant entries as semantic `<article>` elements with plain role labels. Keep source chips under assistant content using `AnswerSources`.

- [ ] **Step 4: Replace the composer**

Use a `<form>` with a multi-line `<textarea>`, explicit label, `Ctrl+Enter` helper, text button `发送`, and a separate `停止生成` action while streaming. Keep the composer sticky inside the chat panel, not fixed to the viewport.

- [ ] **Step 5: Improve error and empty states without changing data flow**

Group suggested prompts under `你可以这样问`. Preserve partial model output after SSE errors and show the existing error metadata directly below the affected answer. The disconnected state uses `EmptyState` and disables only sending.

- [ ] **Step 6: Run tests and build**

Run: `npm test --workspace frontend -- src/pages/__tests__/Chat.test.ts`

Expected: PASS.

Run: `npm run build --workspace frontend`

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Chat.vue frontend/src/components/chat/AnswerSources.vue frontend/src/pages/__tests__/Chat.test.ts
git commit -m "feat: refine AI chat decision workspace"
```

---

### Task 7: Redesign the operations dashboard and dialogs

**Files:**
- Modify: `frontend/src/pages/Admin.vue`
- Modify: `frontend/src/components/admin/AiMetrics.vue`
- Modify: `frontend/src/components/admin/BusinessMetrics.vue`
- Create: `frontend/src/components/admin/__tests__/BusinessMetrics.test.ts`

**Interfaces:**
- Consumes: existing authentication, analytics, clubs CRUD, description generation, and tag suggestion methods in `Admin.vue`.
- Preserves: login, logout, metrics refresh, create/edit/delete, AI description generation, and AI tag suggestion.
- Produces: consistent metric groups and semantic data table/dialog presentation.

- [ ] **Step 1: Write the failing metrics accessibility test**

```ts
// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BusinessMetrics from '../BusinessMetrics.vue'

describe('BusinessMetrics', () => {
  it('renders metrics as a labelled definition list', () => {
    const wrapper = mount(BusinessMetrics, { props: { data: {
      clubCount: 10, recommendationCount: 20, intentCount: 6, conversionRate: 30, topCategories: [],
    } } })
    expect(wrapper.get('dl[aria-label="业务指标"]').exists()).toBe(true)
    expect(wrapper.findAll('dt').length).toBeGreaterThan(0)
    expect(wrapper.findAll('dt')).toHaveLength(wrapper.findAll('dd').length)
  })
})
```

- [ ] **Step 2: Run the test and verify it fails on the old generic div structure**

Run: `npm test --workspace frontend -- src/components/admin/__tests__/BusinessMetrics.test.ts`

Expected: FAIL because no labelled definition list exists.

- [ ] **Step 3: Rebuild business and AI metric groups**

Use `<dl>` with clear `dt`/`dd` pairs. Business metrics use white surfaces; AI request status uses a dark Ink Forest panel with success/fallback/error text labels. Do not show decorative trend arrows unless the backend supplies a comparison.

- [ ] **Step 4: Rebuild the table and page actions**

Use `PageIntro`, put refresh/logout in quiet actions, and keep `新增社团` as the single primary action. Add table `<caption class="sr-only">社团运营列表</caption>`, scoped column headers, recruiting status text, and compact edit/delete controls.

- [ ] **Step 5: Rebuild login and edit dialogs**

Keep current authentication and form methods. Add `role="dialog"`, `aria-modal`, associated labels, visible focus, Escape close when safe, and a dedicated footer. Disable submit during requests and retain entered values on recoverable failures.

- [ ] **Step 6: Run focused tests and the full frontend suite**

Run: `npm test --workspace frontend -- src/components/admin/__tests__/BusinessMetrics.test.ts`

Expected: PASS.

Run: `npm test --workspace frontend`

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Admin.vue frontend/src/components/admin
git commit -m "feat: increase operations dashboard clarity"
```

---

### Task 8: Responsive browser critique, workflow validation, and Docker handoff

**Files:**
- Modify only files implicated by observed defects in Tasks 2–7.
- Do not create screenshot artifacts in the repository.

**Interfaces:**
- Consumes: the complete redesigned frontend and unchanged backend APIs.
- Produces: a Docker Desktop deployment at `http://127.0.0.1/` with the full user workflow verified.

- [ ] **Step 1: Run the complete automated verification**

Run: `npm test`

Expected: frontend and backend suites PASS with zero failed tests.

Run: `npm run build`

Expected: frontend Vite build and backend TypeScript build exit 0.

- [ ] **Step 2: Stop the old native-WSL Compose deployment to release port 80**

Run from PowerShell:

```powershell
wsl -d Ubuntu -- bash -lc 'cd /mnt/d/Progarm/club-matching-platform/.worktrees/campusmatch-ai-portfolio && /usr/bin/docker compose --env-file backend/.env down'
```

Expected: only `campusmatch-ai-portfolio-app-1` and `campusmatch-ai-portfolio-web-1` from the native Ubuntu engine stop; the named volume remains.

- [ ] **Step 3: Build and run through Docker Desktop**

Run:

```powershell
docker context use desktop-linux
docker compose --env-file backend/.env up -d --build
docker compose --env-file backend/.env ps
```

Expected: `app` reports healthy and `web` is running on port 80; both appear in Docker Desktop GUI.

- [ ] **Step 4: Critique the desktop viewport as a first-time student**

At 1440×900, traverse `/`, `/clubs`, `/matching`, and `/chat`. Verify the primary action is visible without scrolling, headings do not wrap awkwardly, no text line exceeds the intended reading width, the matching score/evidence hierarchy is obvious, and chat input remains visible during streaming.

- [ ] **Step 5: Critique tablet and mobile viewports**

At 1024×768 and 390×844, verify navigation toggle, filter panel, modal, matching form, result cards, chat composer, admin table scroll, 44px controls, and absence of horizontal document overflow.

- [ ] **Step 6: Execute the real user flow**

Use this requirement: `周末有时间，零基础但喜欢编程，希望参加比赛，每周最多投入 4 小时`.

Verify:

- Homepage passes the requirement into `/matching`.
- DeepSeek extraction returns editable structured preferences.
- Recommendation returns `hybrid` or visibly labelled `rules-only` fallback.
- The top recommendation exposes score, evidence, reason, caveats, and intent action.
- Intent recording changes the action to completed and survives refresh.
- AI chat streams an answer, shows sources, and supports stop.
- Club keyword/category filters and detail close behavior work.
- Admin login, metrics load, create/edit validation, and cancel behavior work without committing unnecessary demo data.

- [ ] **Step 7: Inspect browser and container diagnostics**

Expected browser console: no uncaught errors.  
Expected network: no unexpected 4xx/5xx during the user flow.  
Expected API checks:

```powershell
Invoke-RestMethod http://127.0.0.1/api/health
Invoke-RestMethod http://127.0.0.1/api/ai/health
docker compose --env-file backend/.env ps
```

- [ ] **Step 8: Fix observed usability or visual defects one at a time**

For each defect, record the exact page, viewport, action, and observed result. Add a failing component test when the defect is behavioral; for a purely visual defect, reproduce it in the affected viewport before changing only the implicated CSS. Re-run the focused test/build and revisit that viewport after every fix.

- [ ] **Step 9: Run final verification and commit**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run build`

Expected: exit 0.

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only intentional files are present before commit.

```bash
git add frontend package-lock.json
git commit -m "feat: complete CampusMatch visual redesign"
```
