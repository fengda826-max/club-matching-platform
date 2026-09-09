import { describe, expect, it, vi } from 'vitest'
import { AnalyticsService } from '../AnalyticsService'

describe('AnalyticsService', () => {
  it('uses matching-origin intents for recommendation conversion', async () => {
    const logs = Array.from({ length: 10 }, () => ({ useCase:'recommendation',status:'success',durationMs:10,inputTokens:0,outputTokens:0,fallbackUsed:false,errorCode:null }))
    const prisma = {
      club: { count: vi.fn().mockResolvedValue(3), groupBy: vi.fn().mockResolvedValue([]) },
      recruitmentIntent: { count: vi.fn().mockImplementation(({ where } = {} as any) => Promise.resolve(where?.source === 'matching' ? 2 : 5)) },
      aIRequestLog: { findMany: vi.fn().mockResolvedValue(logs) },
    }
    const result = await new AnalyticsService(prisma as never).getSummary()
    expect(result.business.intentCount).toBe(5)
    expect(result.business.conversionRate).toBe(20)
  })
})
