import { PrismaClient, Club } from '@prisma/client'

/**
 * Club data transfer object
 */
export type ClubDTO = {
  id?: number
  name: string
  category: string
  description: string
  requirements: string
  memberCount: number
  contact: string
  tags: string
}

/**
 * Club service - handles all club business logic
 */
export class ClubService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Get all clubs
   */
  async getAllClubs(): Promise<Club[]> {
    return this.prisma.club.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Get club by ID
   */
  async getClubById(id: number): Promise<Club | null> {
    return this.prisma.club.findUnique({
      where: { id },
    })
  }

  /**
   * Create new club
   */
  async createClub(data: ClubDTO): Promise<Club> {
    return this.prisma.club.create({
      data: {
        name: data.name,
        category: data.category,
        description: data.description,
        requirements: data.requirements,
        memberCount: data.memberCount,
        contact: data.contact,
        tags: data.tags,
      },
    })
  }

  /**
   * Update existing club
   */
  async updateClub(id: number, data: Partial<ClubDTO>): Promise<Club> {
    return this.prisma.club.update({
      where: { id },
      data,
    })
  }

  /**
   * Delete club
   */
  async deleteClub(id: number): Promise<Club> {
    return this.prisma.club.delete({
      where: { id },
    })
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    const totalClubs = await this.prisma.club.count()
    const categories = await this.prisma.club.groupBy({
      by: ['category'],
      _count: true,
    })
    const totalMembers = await this.prisma.club.aggregate({
      _sum: {
        memberCount: true,
      },
    })

    return {
      totalClubs,
      totalMembers: totalMembers._sum.memberCount || 0,
      categories: categories.map(c => ({
        category: c.category,
        count: c._count,
      })),
    }
  }

  /**
   * Search clubs by keyword
   */
  async searchClubs(keyword: string): Promise<Club[]> {
    // SQLite doesn't have full-text search built-in, so we use contains
    return this.prisma.club.findMany({
      where: {
        OR: [
          { name: { contains: keyword } },
          { description: { contains: keyword } },
          { tags: { contains: keyword } },
          { category: { contains: keyword } },
        ],
      },
    })
  }

  /**
   * Filter by category
   */
  async filterByCategory(category: string): Promise<Club[]> {
    return this.prisma.club.findMany({
      where: { category },
    })
  }

  /**
   * Get all unique tags
   */
  async getAllTags(): Promise<string[]> {
    const clubs = await this.prisma.club.findMany({
      select: { tags: true },
    })
    const tagSet = new Set<string>()
    clubs.forEach(club => {
      club.tags.split(',').forEach(tag => {
        const trimmed = tag.trim()
        if (trimmed) tagSet.add(trimmed)
      })
    })
    return Array.from(tagSet).sort()
  }
}
