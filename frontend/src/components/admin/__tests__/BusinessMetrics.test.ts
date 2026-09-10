// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BusinessMetrics from '../BusinessMetrics.vue'
import AiMetrics from '../AiMetrics.vue'

describe('Operations metrics', () => {
  it('renders business values as a labelled definition list', () => {
    const wrapper = mount(BusinessMetrics, { props: { data: {
      clubCount: 10, recommendationCount: 20, intentCount: 6, conversionRate: 30, topCategories: [],
    } } })
    expect(wrapper.find('dl[aria-label="业务指标"]').exists()).toBe(true)
    expect(wrapper.findAll('dt')).toHaveLength(4)
    expect(wrapper.findAll('dd').map(item => item.text())).toEqual(['10', '20', '6', '30%'])
  })

  it('names success, fallback and validation errors without inventing an error count', () => {
    const wrapper = mount(AiMetrics, { props: { data: {
      requestCount: 10, successRate: 70, averageDurationMs: 1240, validationFailures: 2,
      fallbackCount: 3, inputTokens: 100, outputTokens: 40,
    } } })
    expect(wrapper.find('dl[aria-label="AI 运行指标"]').exists()).toBe(true)
    expect(wrapper.findAll('dt').map(item => item.text())).toEqual(['成功率', '平均耗时', '降级 · 规则接管', '错误 · 结构校验失败', '累计 token', '调用总数'])
    expect(wrapper.findAll('dd').map(item => item.text())).toEqual(['70%', '1240 ms', '3 次', '2 次', '140', '10 次'])
  })
})
