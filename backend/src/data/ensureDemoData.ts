import type { PrismaClient } from '@prisma/client'
import { demoClubs } from './demoClubs'

export async function ensureDemoData(prisma: PrismaClient, enabled: boolean): Promise<number> {
  if (!enabled || await prisma.club.count() > 0) return 0
  await prisma.$transaction(demoClubs.map(data => prisma.club.create({ data })))
  return demoClubs.length
}
