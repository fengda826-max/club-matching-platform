<script setup lang="ts">
import type { Recommendation } from '@/api/client'
defineProps<{ item: Recommendation['matches'][number]; intentRecorded?: boolean }>()
defineEmits<{ intent: [] }>()
const dimensions = [
  ['interest', '兴趣', 40], ['goal', '目标', 25], ['schedule', '时间', 20], ['skill', '门槛', 15],
] as const
</script>

<template>
  <article class="match-card">
    <div class="score"><strong>{{ item.score }}</strong><span>/ 100</span></div>
    <div class="body">
      <div class="title-row"><h3>{{ item.club.name }}</h3><span>{{ item.club.category }}</span></div>
      <p class="reason">{{ item.reason }}</p>
      <div class="dimensions">
        <div v-for="[key,label,max] in dimensions" :key="key"><span>{{ label }}</span><b>{{ item.dimensions[key] }}/{{ max }}</b><i><em :style="{width:(item.dimensions[key]/max*100)+'%'}" /></i></div>
      </div>
      <div class="evidence"><span v-for="text in item.evidence" :key="text">依据：{{ text }}</span><span v-for="text in item.caveats" :key="text" class="caveat">注意：{{ text }}</span></div>
      <div class="facts"><span>{{ item.club.activityTime }}</span><span>每周 {{ item.club.weeklyHours }} 小时</span><span>{{ item.club.campus }}</span><span>{{ item.club.fee ? item.club.fee + ' 元' : '免费' }}</span></div>
      <button :disabled="intentRecorded || !item.club.isRecruiting" @click="$emit('intent')">{{ !item.club.isRecruiting ? '暂停招新' : intentRecorded ? '意向已记录' : '我想进一步了解' }}</button>
    </div>
  </article>
</template>

<style scoped>
.match-card{display:grid;grid-template-columns:120px 1fr;background:#fff;border:1px solid #dbe4e9;border-radius:18px;overflow:hidden}.score{background:#17324d;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center}.score strong{font-size:44px}.score span{opacity:.7}.body{padding:24px}.title-row{display:flex;align-items:center;gap:12px}.title-row h3{margin:0;color:#17324d;font-size:22px}.title-row span,.facts span{font-size:12px;padding:4px 8px;border-radius:20px;background:#edf3f6;color:#496272}.reason{line-height:1.7;color:#364f60}.dimensions{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.dimensions>div{display:grid;grid-template-columns:1fr auto;gap:6px;font-size:12px;color:#607482}.dimensions i{grid-column:1/-1;height:5px;background:#e6ecef;border-radius:5px;overflow:hidden}.dimensions em{display:block;height:100%;background:#ff6b6b}.evidence,.facts{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.evidence span{font-size:12px;color:#28705a}.evidence .caveat{color:#9a6414}.body button{margin-top:18px;padding:10px 16px;border:0;border-radius:9px;background:#ff6b6b;color:#fff;font-weight:700;cursor:pointer}.body button:disabled{background:#aebbc3;cursor:not-allowed}@media(max-width:650px){.match-card{grid-template-columns:1fr}.score{padding:14px;flex-direction:row;gap:5px}.score strong{font-size:30px}.dimensions{grid-template-columns:repeat(2,1fr)}}
</style>
