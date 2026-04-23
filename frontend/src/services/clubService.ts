/**
 * Club Service
 * Handles club data CRUD operations and filtering
 */

import type { Club, ClubCategory } from '@/types'

/**
 * Filter parameters for clubs
 */
export interface ClubFilters {
  searchQuery?: string
  category?: string
  tags?: string[]
}

/**
 * In-memory club storage (will be replaced with Pinia store integration)
 * This is a temporary fallback until store is properly integrated
 */
let clubsStore: {
  clubs: Club[]
  categories: ClubCategory[]
} = {
  clubs: [],
  categories: [],
}

/**
 * Initialize club service with store data
 * @param store - Store data from Pinia
 */
export function initializeClubStore(
  store: typeof clubsStore,
): void {
  clubsStore = store
}

/**
 * Get all clubs
 * @returns Array of all clubs
 */
export function getAllClubs(): Club[] {
  return clubsStore.clubs
}

/**
 * Get club by ID
 * @param id - Club ID
 * @returns Club or undefined if not found
 */
export function getClubById(id: string): Club | undefined {
  return clubsStore.clubs.find((club) => club.id === id)
}

/**
 * Add new club
 * @param club - Club data to add
 * @returns Added club
 */
export function addClub(club: Club): Club {
  clubsStore.clubs.push(club)
  return club
}

/**
 * Update existing club
 * @param id - Club ID to update
 * @param updates - Partial club data to update
 * @returns Updated club or undefined if not found
 */
export function updateClub(
  id: string,
  updates: Partial<Club>,
): Club | undefined {
  const index = clubsStore.clubs.findIndex((club) => club.id === id)
  if (index > -1) {
    clubsStore.clubs[index] = {
      ...clubsStore.clubs[index],
      ...updates,
    }
    return clubsStore.clubs[index]
  }
  return undefined
}

/**
 * Delete club by ID
 * @param id - Club ID to delete
 * @returns Deleted club or undefined if not found
 */
export function deleteClub(id: string): Club | undefined {
  const index = clubsStore.clubs.findIndex((club) => club.id === id)
  if (index > -1) {
    const deleted = clubsStore.clubs[index]
    clubsStore.clubs.splice(index, 1)
    return deleted
  }
  return undefined
}

/**
 * Get filtered clubs based on search, category, and tags
 * @param filters - Filter parameters
 * @returns Array of filtered clubs
 */
export function getFilteredClubs(filters: ClubFilters): Club[] {
  let result = clubsStore.clubs

  // Apply search query filter
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase()
    result = result.filter(
      (club) =>
        club.name.toLowerCase().includes(query) ||
        club.description.toLowerCase().includes(query) ||
        club.tags.some((tag) => tag.toLowerCase().includes(query)),
    )
  }

  // Apply category filter
  if (filters.category) {
    result = result.filter((club) => club.category === filters.category)
  }

  // Apply tags filter (any tag match)
  if (filters.tags && filters.tags.length > 0) {
    result = result.filter((club) =>
      filters.tags!.some((tag) => club.tags.includes(tag)),
    )
  }

  return result
}

/**
 * Get all unique tags from all clubs
 * @returns Sorted array of unique tags
 */
export function getAllTags(): string[] {
  const tagSet = new Set<string>()
  clubsStore.clubs.forEach((club) => {
    club.tags.forEach((tag) => tagSet.add(tag))
  })
  return Array.from(tagSet).sort()
}

/**
 * Get clubs grouped by category
 * @returns Record mapping category names to club arrays
 */
export function getClubsByCategory(): Record<string, Club[]> {
  const grouped: Record<string, Club[]> = {}
  clubsStore.clubs.forEach((club) => {
    if (!grouped[club.category]) {
      grouped[club.category] = []
    }
    grouped[club.category].push(club)
  })
  return grouped
}

/**
 * Get featured clubs (those with >100 members)
 * @returns Array of featured clubs (max 4)
 */
export function getFeaturedClubs(): Club[] {
  return clubsStore.clubs
    .filter((club) => {
      const count = typeof club.memberCount === 'number'
        ? club.memberCount
        : parseInt(club.memberCount as string) || 0
      return count > 100
    })
    .slice(0, 4)
}

/**
 * Get all categories
 * @returns Array of categories
 */
export function getAllCategories(): ClubCategory[] {
  return clubsStore.categories
}

/**
 * Get category by ID
 * @param id - Category ID
 * @returns Category or undefined if not found
 */
export function getCategoryById(id: string): ClubCategory | undefined {
  return clubsStore.categories.find((cat) => cat.id === id)
}

/**
 * Get total member count across all clubs
 * @returns Total number of members
 */
export function getTotalMemberCount(): number {
  return clubsStore.clubs.reduce((total, club) => {
    const count = typeof club.memberCount === 'number'
      ? club.memberCount
      : parseInt(club.memberCount as string) || 0
    return total + count
  }, 0)
}

/**
 * Get clubs by category name
 * @param category - Category name
 * @returns Array of clubs in that category
 */
export function getClubsByCategoryName(category: string): Club[] {
  return clubsStore.clubs.filter((club) => club.category === category)
}

/**
 * Search clubs by text query
 * @param query - Search query
 * @returns Array of matching clubs
 */
export function searchClubs(query: string): Club[] {
  const normalizedQuery = query.toLowerCase()
  return clubsStore.clubs.filter(
    (club) =>
      club.name.toLowerCase().includes(normalizedQuery) ||
      club.description.toLowerCase().includes(normalizedQuery) ||
      club.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
      club.category.toLowerCase().includes(normalizedQuery),
  )
}
