<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { NAV_ITEMS } from '@/shared/presentation'
import StatusPill from '@/components/ui/StatusPill.vue'

const props = withDefaults(defineProps<{ aiOnline?: boolean }>(), { aiOnline: undefined })
const menuOpen = ref(false)
const menuToggle = ref<HTMLButtonElement | null>(null)
const aiStatus = computed(() => props.aiOnline === undefined
  ? { tone: 'neutral' as const, label: 'AI 状态未确认' }
  : props.aiOnline
    ? { tone: 'success' as const, label: 'AI 在线' }
    : { tone: 'warning' as const, label: 'AI 暂不可用' })

function closeWithEscape() {
  if (!menuOpen.value) return
  menuOpen.value = false
  menuToggle.value?.focus()
}
</script>

<template>
  <header class="app-header" @keydown.esc="closeWithEscape">
    <div class="header-inner">
      <RouterLink class="brand" to="/" aria-label="CampusMatch 首页" @click="menuOpen = false">
        <span class="brand-mark" aria-hidden="true">C<span></span></span>
        <span>CampusMatch</span>
      </RouterLink>
      <div class="header-actions">
        <StatusPill :tone="aiStatus.tone" :label="aiStatus.label" />
        <RouterLink class="button-primary header-cta" to="/matching">开始匹配</RouterLink>
      </div>
      <button
        ref="menuToggle"
        type="button"
        class="menu-toggle"
        :aria-label="menuOpen ? '关闭导航菜单' : '打开导航菜单'"
        aria-controls="mobile-navigation"
        :aria-expanded="menuOpen"
        @click="menuOpen = !menuOpen"
      >
        <span aria-hidden="true">{{ menuOpen ? '关闭' : '菜单' }}</span>
      </button>
      <nav id="mobile-navigation" class="navigation" :class="{ 'is-open': menuOpen }" aria-label="主导航">
        <RouterLink v-for="item in NAV_ITEMS" :key="item.to" :to="item.to" @click="menuOpen = false">
          {{ item.label }}
        </RouterLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.app-header { position: sticky; top: 0; z-index: 100; border-bottom: 1px solid var(--border-moss); background: var(--surface); }
.header-inner { display: grid; grid-template-areas: 'brand nav actions'; grid-template-columns: auto 1fr auto; align-items: center; gap: 28px; width: min(calc(100% - 64px), var(--content-wide)); min-height: 68px; margin-inline: auto; }
.brand { grid-area: brand; display: inline-flex; align-items: center; gap: 10px; min-height: 44px; color: var(--ink-forest); text-decoration: none; font-size: 19px; font-weight: 800; letter-spacing: -.7px; }
.brand-mark { position: relative; display: grid; place-items: center; width: 32px; height: 32px; border-radius: var(--radius-control); background: var(--ink-forest); color: var(--surface); font-size: 23px; line-height: 1; }
.brand-mark > span { position: absolute; right: 5px; top: 6px; width: 5px; height: 5px; background: var(--signal-lime); }
.navigation { grid-area: nav; display: flex; align-items: center; justify-content: center; gap: 18px; }
.navigation a { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; padding: 10px 0 7px; border-bottom: 3px solid transparent; color: var(--text-muted); text-decoration: none; font-size: 14px; font-weight: 600; white-space: nowrap; }
.navigation a:hover { color: var(--campus-green); }
.navigation .router-link-exact-active { border-bottom-color: var(--campus-green); color: var(--campus-green); }
.header-actions { grid-area: actions; display: flex; align-items: center; gap: 14px; }
.header-actions :deep(.status-pill) { white-space: nowrap; }
.menu-toggle { display: none; min-width: 44px; min-height: 44px; padding: 0 6px; border: 1px solid var(--border-moss); border-radius: var(--radius-control); background: var(--surface); color: var(--ink-forest); font-size: 14px; font-weight: 600; cursor: pointer; }
@media (max-width: 1100px) {
  .header-inner { gap: 18px; }
  .navigation { gap: 12px; }
  .header-actions { gap: 10px; }
  .header-cta { display: none; }
}
@media (max-width: 820px) {
  .header-inner { grid-template-areas: 'brand actions toggle' 'nav nav nav'; grid-template-columns: 1fr auto auto; gap: 0 10px; width: calc(100% - 36px); }
  .brand, .header-actions, .menu-toggle { margin-block: 12px; }
  .brand { gap: 8px; font-size: 17px; }
  .brand-mark { width: 28px; height: 30px; font-size: 21px; }
  .menu-toggle { grid-area: toggle; display: block; }
  .navigation { display: none; align-items: stretch; padding: 0 0 14px; gap: 2px; }
  .navigation.is-open { display: flex; flex-direction: column; }
  .navigation a { justify-content: flex-start; padding-inline: 12px; border-radius: var(--radius-control); }
  .navigation .router-link-exact-active { background: var(--field-paper); }
}
@media (max-width: 380px) {
  .brand { gap: 6px; font-size: 16px; }
  .brand-mark { display: none; }
  .header-inner { column-gap: 6px; }
  .header-actions :deep(.status-pill) { padding-inline: 6px; gap: 5px; }
}
</style>
