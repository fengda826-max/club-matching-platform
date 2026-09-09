<template>
  <footer class="app-footer">
    <div class="footer-inner">
      <div>
        <p class="footer-brand">CampusMatch</p>
        <p>让每一次社团选择，都有据可依。</p>
      </div>
      <div class="footer-meta">
        <p>AI + 云计算 · 校园产品实践</p>
        <p>Vue 3 · TypeScript · Node.js · Prisma</p>
        <p>演示作品，社团信息与招募安排请以实际通知为准。</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.app-footer { margin-top: auto; border-top: 1px solid var(--border-moss); background: var(--surface); }
.footer-inner { display: flex; justify-content: space-between; gap: 24px; width: min(calc(100% - 64px), var(--content-wide)); margin-inline: auto; padding-block: 28px; color: var(--text-muted); font-size: 14px; }
p { margin: 0; line-height: 1.8; }
.footer-brand { margin-bottom: 4px; color: var(--ink-forest); font-size: 18px; font-weight: 800; }
.footer-meta { text-align: right; }
@media (max-width: 820px) { .footer-inner { flex-direction: column; width: calc(100% - 36px); gap: 16px; } .footer-meta { text-align: left; } }
</style>
