// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { Recommendation } from '@/api/client'
import MatchBreakdown from '../MatchBreakdown.vue'

const item: Recommendation['matches'][number] = {
  clubId: 1, score: 92,
  dimensions: { interest: 38, goal: 21, schedule: 20, skill: 13 },
  evidence: ['兴趣：编程'], caveats: ['每周投入 3 小时'], reason: '匹配你的兴趣与竞赛目标。',
  club: { id: 1, name: '编程俱乐部', category: '技术', description: '', requirements: '', memberCount: 128, contact: '', tags: '编程', activityTime: '周六', weeklyHours: 3, campus: '南校区', fee: 0, skillRequirement: 'beginner', isRecruiting: true, createdAt: '', updatedAt: '' },
}

describe('MatchBreakdown', () => {
  it('separates evidence from caveats and labels the score', () => {
    const wrapper = mount(MatchBreakdown, { props: { item, intentRecorded: false } })
    expect(wrapper.find('[aria-label="匹配分 92 分"]').exists()).toBe(true)
    expect(wrapper.get('[data-section="evidence"]').text()).toContain('兴趣：编程')
    expect(wrapper.get('[data-section="caveats"]').text()).toContain('每周投入 3 小时')
  })

  it('shows rule provenance and emits an intent without pretending AI succeeded', async () => {
    const wrapper = mount(MatchBreakdown, { props: { item, mode: 'rules-only', rank: 2 } })
    expect(wrapper.text()).toContain('规则结果')
    expect(wrapper.text()).toContain('第 2 名')
    expect(wrapper.text()).not.toContain('AI 解释')
    const button = wrapper.get('button')
    expect(button.text()).toBe('登记加入意向')
    await button.trigger('click')
    expect(wrapper.emitted('intent')).toHaveLength(1)
    await wrapper.setProps({ intentRecorded: true })
    expect(button.text()).toBe('已登记意向')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('keeps a completed intent visible even if recruitment has closed', () => {
    const wrapper = mount(MatchBreakdown, { props: { item: { ...item, club: { ...item.club, isRecruiting: false } }, intentRecorded: true } })
    expect(wrapper.get('button').text()).toBe('已登记意向')
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })
})
