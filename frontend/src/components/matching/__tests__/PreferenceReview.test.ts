// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PreferenceReview from '../PreferenceReview.vue'

describe('PreferenceReview', () => {
  it('keeps explicit zero limits and removes the field warning after a value is supplied', async () => {
    const preference = { interests: [], goals: [], availableTimes: [], skillLevel: 'beginner' as const }
    const wrapper = mount(PreferenceReview, { props: { modelValue: preference, warnings: ['未指定每周投入时间'] } })
    expect(wrapper.get('#hours-warning').text()).toContain('未指定每周投入时间')
    await wrapper.get('input[name="maxWeeklyHours"]').setValue('0')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([{ ...preference, maxWeeklyHours: 0 }])
    await wrapper.setProps({ modelValue: { ...preference, maxWeeklyHours: 0 } })
    expect(wrapper.find('#hours-warning').exists()).toBe(false)
  })
})
