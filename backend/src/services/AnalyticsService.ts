import type { PrismaClient } from '@prisma/client'

function percent(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 1000) / 10
}

export class AnalyticsService {
  constructor(private readonly prisma: PrismaClient) {}

  async getSummary() {
    const [clubCount, categories, intentCount, matchingIntentCount, logs] = await Promise.all([
      this.prisma.club.count(),
      this.prisma.club.groupBy({ by: ['category'], _count: true, orderBy: { _count: { category: 'desc' } }, take: 5 }),
      this.prisma.recruitmentIntent.count(),
      this.prisma.recruitmentIntent.count({ where: { source: 'matching' } }),
      this.prisma.aIRequestLog.findMany({ select: {
        useCase: true, status: true, durationMs: true, inputTokens: true, outputTokens: true,
        fallbackUsed: true, errorCode: true,
      } }),
    ])
    const recommendationCount = logs.filter(log => log.useCase === 'recommendation').length
    const successful = logs.filter(log => log.status === 'success').length
    return {
      business: {
        clubCount, recommendationCount, intentCount,
        conversionRate: percent(matchingIntentCount, recommendationCount),
        topCategories: categories.map(item => ({ category: item.category, count: item._count })),
      },
      ai: {
        requestCount: logs.length,
        successRate: percent(successful, logs.length),
        averageDurationMs: logs.length ? Math.round(logs.reduce((sum, log) => sum + log.durationMs, 0) / logs.length) : 0,
        validationFailures: logs.filter(log => log.errorCode === 'INVALID_RESPONSE').length,
        fallbackCount: logs.filter(log => log.fallbackUsed).length,
        inputTokens: logs.reduce((sum, log) => sum + (log.inputTokens || 0), 0),
        outputTokens: logs.reduce((sum, log) => sum + (log.outputTokens || 0), 0),
      },
    }
  }
}
