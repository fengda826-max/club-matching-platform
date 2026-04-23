"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClubService = void 0;
/**
 * Club service - handles all club business logic
 */
class ClubService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Get all clubs
     */
    async getAllClubs() {
        return this.prisma.club.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }
    /**
     * Get club by ID
     */
    async getClubById(id) {
        return this.prisma.club.findUnique({
            where: { id },
        });
    }
    /**
     * Create new club
     */
    async createClub(data) {
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
        });
    }
    /**
     * Update existing club
     */
    async updateClub(id, data) {
        return this.prisma.club.update({
            where: { id },
            data,
        });
    }
    /**
     * Delete club
     */
    async deleteClub(id) {
        return this.prisma.club.delete({
            where: { id },
        });
    }
    /**
     * Get statistics
     */
    async getStatistics() {
        const totalClubs = await this.prisma.club.count();
        const categories = await this.prisma.club.groupBy({
            by: ['category'],
            _count: true,
        });
        const totalMembers = await this.prisma.club.aggregate({
            _sum: {
                memberCount: true,
            },
        });
        return {
            totalClubs,
            totalMembers: totalMembers._sum.memberCount || 0,
            categories: categories.map(c => ({
                category: c.category,
                count: c._count,
            })),
        };
    }
    /**
     * Search clubs by keyword
     */
    async searchClubs(keyword) {
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
        });
    }
    /**
     * Filter by category
     */
    async filterByCategory(category) {
        return this.prisma.club.findMany({
            where: { category },
        });
    }
    /**
     * Get all unique tags
     */
    async getAllTags() {
        const clubs = await this.prisma.club.findMany({
            select: { tags: true },
        });
        const tagSet = new Set();
        clubs.forEach(club => {
            club.tags.split(',').forEach(tag => {
                const trimmed = tag.trim();
                if (trimmed)
                    tagSet.add(trimmed);
            });
        });
        return Array.from(tagSet).sort();
    }
}
exports.ClubService = ClubService;
