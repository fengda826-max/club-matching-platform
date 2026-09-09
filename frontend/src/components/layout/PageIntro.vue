<template>
  <header class="page-intro">
    <div class="intro-copy">
      <h1><slot /></h1>
      <div v-if="$slots.description" class="intro-description"><slot name="description" /></div>
    </div>
    <div v-if="$slots.aside" class="intro-aside"><slot name="aside" /></div>
  </header>
</template>

<style scoped>
.page-intro { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; padding-block: 40px 28px; }
.intro-copy { min-width: 0; }
h1 { margin: 0; color: var(--text-ink); font-size: clamp(36px, 4vw, 48px); font-weight: 800; line-height: 1.2; letter-spacing: -.04em; }
.intro-description { max-width: 72ch; margin-top: 14px; color: var(--text-muted); font-size: 16px; line-height: 1.75; }
.intro-description :deep(p) { margin: 0; }
.intro-aside { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; flex-shrink: 0; }
@media (max-width: 820px) { .page-intro { align-items: stretch; flex-direction: column; gap: 20px; padding-block: 28px 24px; } .intro-aside { flex-shrink: 1; } }
</style>
