import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import cases from './cases.json'

export type EvaluationCase = {
  id: string
  type: 'matching' | 'extraction' | 'chat'
  structuredValid: boolean
  hardConstraintViolation: boolean
  factual: boolean
  ungrounded: boolean
  fallbackSuccessful: boolean
  durationMs: number
  inputTokens: number
  outputTokens: number
}

const pct = (count: number, total: number) => total ? `${(count / total * 100).toFixed(1)}%` : '0.0%'

export async function buildEvaluationReport(data: EvaluationCase[], options: { model: string }): Promise<string> {
  const durations = data.map(item => item.durationMs).sort((a,b)=>a-b)
  const sum = (field: 'inputTokens'|'outputTokens') => data.reduce((total,item)=>total+item[field],0)
  const inputTokens=sum('inputTokens'), outputTokens=sum('outputTokens')
  const cost = 0 // Deterministic CI never calls a paid model.
  const deterministic = options.model === 'deterministic-ci'
  return `# CampusMatch AI 评测报告

> 本报告由固定数据集自动生成。事实一致与无依据回答属于人工复核字段；CI 默认只验证规则和报告管线，不冒充线上模型效果。

| 指标 | 结果 |
| --- | ---: |
| 模型 | ${options.model} |
| 样本数 | ${data.length} |
| 结构化输出成功率 | ${deterministic ? '不适用（未调用模型）' : pct(data.filter(item=>item.structuredValid).length,data.length)} |
| 硬约束违反率 | ${pct(data.filter(item=>item.hardConstraintViolation).length,data.length)} |
| 事实一致率（人工复核） | ${deterministic ? '待 Live AI 运行后复核' : pct(data.filter(item=>item.factual).length,data.length)} |
| 无依据回答率（人工复核） | ${deterministic ? '待 Live AI 运行后复核' : pct(data.filter(item=>item.ungrounded).length,data.length)} |
| 平均响应时间 | ${deterministic ? '不适用（未调用模型）' : `${data.length ? Math.round(durations.reduce((a,b)=>a+b,0)/data.length) : 0} ms`} |
| P95 响应时间 | ${deterministic ? '不适用（未调用模型）' : `${durations[Math.max(0,Math.ceil(durations.length*.95)-1)] || 0} ms`} |
| 规则降级成功率 | ${pct(data.filter(item=>item.fallbackSuccessful).length,data.length)} |
| 输入 Token | ${inputTokens} |
| 输出 Token | ${outputTokens} |
| 估算成本 | ¥${cost.toFixed(4)}（确定性 CI） |

生成时间：${new Date().toISOString()}
`
}

async function main() {
  if (process.env.EVALUATION_LIVE_AI === 'true') {
    throw new Error('Live AI evaluation requires a reviewed adapter and is intentionally not inferred from CI fixtures.')
  }
  const report = await buildEvaluationReport(cases as EvaluationCase[], { model: 'deterministic-ci' })
  const outputDir = path.resolve(process.cwd(), '../docs/evaluation')
  await mkdir(outputDir, { recursive: true })
  await writeFile(path.join(outputDir, 'latest.md'), report, 'utf8')
  console.log(report)
}

if (require.main === module) void main()
