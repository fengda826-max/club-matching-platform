<script setup lang="ts">
defineProps<{ score: number }>()
</script>

<template>
  <div class="score-ring" role="img" :aria-label="`匹配分 ${score} 分`">
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle class="track" cx="50" cy="50" r="43" />
      <circle class="fill" cx="50" cy="50" r="43" pathLength="100" :stroke-dasharray="`${Math.min(100, Math.max(0, score))} 100`" />
    </svg>
    <div aria-hidden="true"><strong>{{ score }}</strong><span>匹配分 / 100</span></div>
  </div>
</template>

<style scoped>
.score-ring { position: relative; width: 128px; height: 128px; flex-shrink: 0; }
svg { display: block; width: 100%; height: 100%; transform: rotate(-90deg); }
circle { fill: none; stroke-width: 5; }
.track { stroke: var(--border-moss); opacity: .3; }
.fill { stroke: var(--signal-lime); }
.score-ring > div { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
strong { color: var(--signal-lime); font-size: 38px; font-weight: 800; line-height: 1.2; font-variant-numeric: tabular-nums; }
span { color: var(--surface); font-size: 14px; }
</style>
