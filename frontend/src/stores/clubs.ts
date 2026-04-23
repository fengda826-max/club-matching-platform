import { defineStore } from 'pinia'
import { apiClient, type Club, type Statistics } from '@/api/client'
import type { ClubCategory } from '@/types'

// Static categories (don't change)
const categories: ClubCategory[] = [
  { id: 'tech', name: '技术', icon: '💻' },
  { id: 'sports', name: '体育', icon: '⚽' },
  { id: 'arts', name: '艺术', icon: '🎨' },
  { id: 'academic', name: '学术', icon: '📚' },
  { id: 'cultural', name: '文化', icon: '🌍' },
]

// Convert backend Club type (number id) to frontend Club type (string id)
function convertClub(club: apiClient.Club): Club {
  return {
    id: String(club.id),
    name: club.name,
    category: club.category,
    description: club.description,
    requirements: club.requirements,
    memberCount: club.memberCount,
    contact: club.contact,
    tags: club.tags.split(',').map(t => t.trim()).filter(t => t),
  }
}

// Convert frontend Club to backend format
function convertClubToBackend(club: Omit<Club, 'id'>): Omit<apiClient.Club, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: club.name,
    category: club.category,
    description: club.description,
    requirements: club.requirements,
    memberCount: club.memberCount,
    contact: club.contact,
    tags: Array.isArray(club.tags) ? club.tags.join(',') : club.tags,
  }
}

export const useClubsStore = defineStore('clubs', {
  state: () => ({
    clubs: [] as Club[],
    categories: categories,
    searchQuery: '',
    selectedCategory: '',
    selectedTags: [] as string[],
    loading: false,
    statistics: null as Statistics | null,
  }),

  getters: {
    filteredClubs: (state) => {
      let result = state.clubs

      if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase()
        result = result.filter(
          (club) =>
            club.name.toLowerCase().includes(query) ||
            club.description.toLowerCase().includes(query) ||
            club.tags.some((tag) => tag.toLowerCase().includes(query)),
        )
      }

      if (state.selectedCategory) {
        result = result.filter((club) => club.category === state.selectedCategory)
      }

      if (state.selectedTags.length > 0) {
        result = result.filter((club) =>
          state.selectedTags.some((tag) => club.tags.includes(tag)),
        )
      }

      return result
    },

    allTags: (state) => {
      const tagSet = new Set<string>()
      state.clubs.forEach((club) => {
        club.tags.forEach((tag) => tagSet.add(tag))
      })
      return Array.from(tagSet).sort()
    },

    clubsByCategory: (state) => {
      const grouped: Record<string, Club[]> = {}
      state.clubs.forEach((club) => {
        if (!grouped[club.category]) {
          grouped[club.category] = []
        }
        grouped[club.category].push(club)
      })
      return grouped
    },

    getClubById: (state) => (id: string) => {
      return state.clubs.find((club) => club.id === id)
    },

    featuredClubs: (state) => {
      return state.clubs
        .filter((club) => {
          const count = typeof club.memberCount === 'number' ? club.memberCount : parseInt(club.memberCount as string) || 0
          return count > 100
        })
        .slice(0, 4)
    },
  },

  actions: {
    setSearchQuery(query: string) {
      this.searchQuery = query
    },

    setSelectedCategory(category: string) {
      this.selectedCategory = category
    },

    setSelectedTags(tags: string[]) {
      this.selectedTags = tags
    },

    toggleTag(tag: string) {
      const index = this.selectedTags.indexOf(tag)
      if (index > -1) {
        this.selectedTags.splice(index, 1)
      } else {
        this.selectedTags.push(tag)
      }
    },

    clearFilters() {
      this.searchQuery = ''
      this.selectedCategory = ''
      this.selectedTags = []
    },

    /**
     * Fetch all clubs from backend
     */
    async fetchClubs() {
      this.loading = true
      try {
        console.log('[clubsStore] Fetching clubs from backend...')
        const clubs = await apiClient.clubs.getAll()
        console.log(`[clubsStore] Received ${clubs.length} clubs from backend`)
        this.clubs = clubs.map(convertClub)
        console.log(`[clubsStore] Converted to ${this.clubs.length} frontend clubs`)
      } catch (err) {
        console.error('Failed to fetch clubs:', err)
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Fetch statistics from backend
     */
    async fetchStatistics() {
      try {
        console.log('[clubsStore] Fetching statistics...')
        this.statistics = await apiClient.clubs.getStatistics()
        console.log('[clubsStore] Statistics received:', this.statistics)
      } catch (err) {
        console.error('Failed to fetch statistics:', err)
        throw err
      }
    },

    /**
     * Add new club via backend API
     */
    async addClub(club: Omit<Club, 'id'>) {
      try {
        const backendData = convertClubToBackend(club)
        const created = await apiClient.clubs.create(backendData)
        const converted = convertClub(created)
        this.clubs.push(converted)
        return converted
      } catch (err) {
        console.error('Failed to add club:', err)
        throw err
      }
    },

    /**
     * Update existing club via backend API
     */
    async updateClub(id: string, updates: Partial<Club>) {
      try {
        const backendId = parseInt(id, 10)
        const backendData: any = {}
        if (updates.tags) {
          backendData.tags = Array.isArray(updates.tags) ? updates.tags.join(',') : updates.tags
        }
        // Copy other fields
        Object.keys(updates).forEach(key => {
          if (key !== 'tags' && key !== 'id') {
            backendData[key] = updates[key as keyof typeof updates]
          }
        })
        const updated = await apiClient.clubs.update(backendId, backendData)
        const converted = convertClub(updated)
        const index = this.clubs.findIndex((club) => club.id === id)
        if (index > -1) {
          this.clubs[index] = converted
        }
        return converted
      } catch (err) {
        console.error('Failed to update club:', err)
        throw err
      }
    },

    /**
     * Delete club via backend API
     */
    async deleteClub(id: string) {
      try {
        const backendId = parseInt(id, 10)
        await apiClient.clubs.delete(backendId)
        const index = this.clubs.findIndex((club) => club.id === id)
        if (index > -1) {
          this.clubs.splice(index, 1)
        }
      } catch (err) {
        console.error('Failed to delete club:', err)
        throw err
      }
    },
  },
})
