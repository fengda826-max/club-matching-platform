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
const campusWarning = computed(() => !props.modelValue.campus && props.warnings?.includes('未指定校区'))
const hoursWarning = computed(() => props.modelValue.maxWeeklyHours === undefined && props.warnings?.includes('未指定每周投入时间'))
const feeWarning = computed(() => props.modelValue.maxFee === undefined && props.warnings?.includes('未指定费用上限'))
const otherWarnings = computed(() => props.warnings?.filter(text => !['未指定校区', '未指定每周投入时间', '未指定费用上限'].includes(text)) || [])
function updateLimit(field: 'maxWeeklyHours' | 'maxFee', event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', { ...props.modelValue, [field]: value === '' ? undefined : Number(value) })
}
</script>

<template>
  <section class="review" aria-label="确认偏好">
    <header><span class="step-label">02 / 确认条件</span><h2>把偏好变成可比较的条件</h2><p>可直接填写，也可先提取后修正。多项内容用顿号或逗号分隔，最多 10 项。</p></header>
    <fieldset>
      <legend>兴趣与目标</legend>
      <div class="grid">
        <label>兴趣<input name="interests" v-model="interests" placeholder="编程、摄影" /></label>
        <label>希望收获<input name="goals" v-model="goals" placeholder="比赛、交友" /></label>
      </div>
    </fieldset>
    <fieldset>
      <legend>时间与水平</legend>
      <div class="grid">
        <label>可参加时间<input name="availableTimes" v-model="availableTimes" placeholder="周末、周三晚" /></label>
        <label>当前水平<select :value="modelValue.skillLevel" @change="emit('update:modelValue', { ...modelValue, skillLevel: ($event.target as HTMLSelectElement).value as UserPreference['skillLevel'] })"><option value="beginner">零基础</option><option value="intermediate">有基础</option><option value="advanced">熟练</option><option value="expert">专家</option></select></label>
      </div>
    </fieldset>
    <fieldset>
      <legend>硬性限制 <span>留空表示不限制</span></legend>
      <div class="grid limits">
        <label>校区<input name="campus" :value="modelValue.campus || ''" maxlength="100" :aria-describedby="campusWarning ? 'campus-warning' : undefined" @input="emit('update:modelValue', { ...modelValue, campus: ($event.target as HTMLInputElement).value.trim() || undefined })" placeholder="不限校区" /><span v-if="campusWarning" id="campus-warning" class="warning">未指定校区，将不限制校区。</span></label>
        <label>每周最多投入（小时）<input name="maxWeeklyHours" type="number" min="0" max="168" step="1" :value="modelValue.maxWeeklyHours" :aria-describedby="hoursWarning ? 'hours-warning' : 'hours-help'" @input="updateLimit('maxWeeklyHours', $event)" placeholder="不限制" /><span id="hours-help" class="field-help">0–168 小时，填整数。</span><span v-if="hoursWarning" id="hours-warning" class="warning">未指定每周投入时间，请确认是否不设上限。</span></label>
        <label>费用上限（元）<input name="maxFee" type="number" min="0" max="100000" step="1" :value="modelValue.maxFee" :aria-describedby="feeWarning ? 'fee-warning' : 'fee-help'" @input="updateLimit('maxFee', $event)" placeholder="不限制" /><span id="fee-help" class="field-help">填 0 表示只考虑免费社团。</span><span v-if="feeWarning" id="fee-warning" class="warning">未指定费用上限，请确认是否接受付费社团。</span></label>
      </div>
    </fieldset>
    <p v-for="warning in otherWarnings" :key="warning" class="warning">待确认：{{ warning }}</p>
  </section>
</template>

<style scoped>
.review { min-width: 0; padding: 26px; background: var(--surface); border: 1px solid var(--border-moss); border-radius: var(--radius-panel); }
.step-label { color: var(--campus-green); font-size: 14px; font-weight: 700; }
h2 { margin: 8px 0; font-size: 23px; line-height: 1.4; letter-spacing: -.02em; }
header p { margin: 0; color: var(--text-muted); font-size: 14px; line-height: 1.7; }
fieldset { min-width: 0; margin: 24px 0 0; padding: 16px 0 0; border: 0; border-top: 1px solid var(--border-moss); }
legend { padding-right: 10px; font-size: 15px; font-weight: 700; }
legend span { color: var(--text-muted); font-size: 14px; font-weight: 400; margin-left: 8px; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
label { display: flex; flex-direction: column; gap: 7px; min-width: 0; font-size: 14px; font-weight: 600; }
input, select { width: 100%; min-width: 0; min-height: 44px; padding: 10px 12px; border: 1px solid var(--border-moss); border-radius: var(--radius-control); background: var(--surface); color: var(--text-ink); font: inherit; }
input:focus-visible, select:focus-visible { outline: 3px solid var(--campus-green); outline-offset: 2px; }
.warning { color: var(--warning); font-size: 14px; font-weight: 400; line-height: 1.6; }
.field-help { font-size: 14px; font-weight: 400; color: var(--text-muted); }
@media (max-width: 540px) { .review { padding: 20px 18px; } .grid { grid-template-columns: 1fr; } }
</style>
