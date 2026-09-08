import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '../lib/prisma'

export type AIRequestLogEntry = Omit<Prisma.AIRequestLogUncheckedCreateInput, 'id' | 'createdAt'>

type AIRequestLogStore = Pick<PrismaClient, 'aIRequestLog'>

/** Best-effort telemetry. A logging outage must never become a user-facing outage. */
export class AIRequestLogger {
  constructor(private readonly store: AIRequestLogStore = prisma) {}

  async record(entry: AIRequestLogEntry): Promise<void> {
    try {
      await this.store.aIRequestLog.create({ data: entry })
    } catch {
      // Deliberately swallow telemetry failures; the business response has priority.
    }
  }
}
