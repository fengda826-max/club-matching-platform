<script setup lang="ts">
import { computed } from 'vue'
import type { UserPreference } from '@/api/client'

const props = defineProps<{ modelValue: UserPreference; warnings?: string[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: UserPreference] }>()

function listField(field: 'interests' | 'goals' | 'availableTimes') {
  return computed({
    get: () => props.modelValue[field].join('、'),
    set: (value: string) => emit('update:modelValue', { ...props.modelValue, [field]: value.split(/[、,，]/).map(v => v.trim()).filter(Boolean).slice(0, 10) }),
  })
}
const interests = listField('interests')
const goals = listField('goals')
const availableTimes = listField('availableTimes')
</script>

<template>
  <section class="review" aria-label="确认偏好">
    <div class="review-heading"><h2>先确认条件，再计算匹配</h2><span>分数由规则计算，AI 不改分</span></div>
    <div class="grid">
      <label>兴趣<input v-model="interests" placeholder="编程、摄影" /></label>
      <label>目标<input v-model="goals" placeholder="比赛、交友" /></label>
      <label>可参加时间<input v-model="availableTimes" placeholder="周末、周三晚" /></label>
      <label>当前水平<select :value="modelValue.skillLevel" @change="emit('update:modelValue', { ...modelValue, skillLevel: ($event.target as HTMLSelectElement).value as UserPreference['skillLevel'] })"><option value="beginner">零基础</option><option value="intermediate">有基础</option><option value="advanced">熟练</option><option value="expert">专家</option></select></label>
      <label>校区<input :value="modelValue.campus || ''" @input="emit('update:modelValue', { ...modelValue, campus: ($event.target as HTMLInputElement).value || undefined })" placeholder="可不填" /></label>
      <label>每周最多小时<input type="number" min="0" :value="modelValue.maxWeeklyHours" @input="emit('update:modelValue', { ...modelValue, maxWeeklyHours: Number(($event.target as HTMLInputElement).value) || undefined })" /></label>
      <label>费用上限（元）<input type="number" min="0" :value="modelValue.maxFee" @input="emit('update:modelValue', { ...modelValue, maxFee: ($event.target as HTMLInputElement).value === '' ? undefined : Number(($event.target as HTMLInputElement).value) })" /></label>
    </div>
    <div v-if="warnings?.length" class="warnings">待确认：{{ warnings.join('；') }}</div>
  </section>
</template>

<style scoped>
.review { padding: 26px; background: #fff; border: 1px solid #dfe6ea; border-radius: 18px; }
.review-heading { display:flex; justify-content:space-between; gap:20px; align-items:baseline; margin-bottom:20px; }
h2 { margin:0; color:#17324d; font-size:22px; } .review-heading span,.warnings { color:#687987; font-size:13px; }
.grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
label { display:grid; gap:7px; color:#425466; font-size:13px; font-weight:650; }
input,select { width:100%; box-sizing:border-box; padding:11px 12px; border:1px solid #cad5dc; border-radius:9px; background:#fbfcfc; color:#17324d; font:inherit; }
input:focus,select:focus { outline:3px solid rgba(255,107,107,.18); border-color:#ff6b6b; }
.warnings { margin-top:15px; padding:10px 12px; background:#fff8e3; border-left:3px solid #e6ad20; }
@media(max-width:700px){.grid{grid-template-columns:1fr}.review-heading{display:block}.review-heading span{display:block;margin-top:6px}}
</style>
