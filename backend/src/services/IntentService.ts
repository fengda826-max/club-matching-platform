import { Prisma, type PrismaClient } from '@prisma/client'

export class IntentService {
  constructor(private readonly prisma: PrismaClient) {}

  async record(input: { clubId: number; source: string; matchScore?: number; sessionId: string }) {
    const club = await this.prisma.club.findUnique({ where: { id: input.clubId }, select: { id: true } })
    if (!club) return { created: false, reason: 'CLUB_NOT_FOUND' as const }
    try {
      await this.prisma.recruitmentIntent.create({ data: input })
      return { created: true }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { created: false }
      throw error
    }
  }
}
