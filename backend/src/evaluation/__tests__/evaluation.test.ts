import { describe, expect, it } from 'vitest'
import cases from '../cases.json'
import { buildEvaluationReport } from '../runEvaluation'

describe('portfolio evaluation report', () => {
  it('uses a fixed 50-case dataset and reports only measured fields', async () => {
    expect(cases).toHaveLength(50)
    const report = await buildEvaluationReport(cases, { model: 'deterministic-ci' })
    for (const label of ['模型','样本数','结构化输出成功率','硬约束违反率','事实一致率','无依据回答率','平均响应时间','P95 响应时间','规则降级成功率','输入 Token','输出 Token','估算成本']) {
      expect(report).toContain(label)
    }
    expect(report).toContain('deterministic-ci')
  })
})
