import { describe, it, expect, beforeEach } from 'vitest'
import type { Club, ClubCategory } from '@/types'
import {
  initializeClubStore,
  getAllClubs,
  getClubById,
  addClub,
  updateClub,
  deleteClub,
  getFilteredClubs,
  getAllTags,
  getClubsByCategory,
  getFeaturedClubs,
  getAllCategories,
  getCategoryById,
  getTotalMemberCount,
  getClubsByCategoryName,
  searchClubs,
} from '../clubService'

const mockCategories: ClubCategory[] = [
  { id: 'technology', name: '技术', emoji: '💻' },
  { id: 'sports', name: '体育', emoji: '⚽' },
  { id: 'arts', name: '艺术', emoji: '🎨' },
]

const mockClubs: Club[] = [
  {
    id: 'club-1',
    name: '编程协会',
    category: 'technology',
    description: '这是一个致力于编程技术交流的社团',
    requirements: '对编程有兴趣',
    memberCount: 150,
    contact: 'QQ群: 123456',
    tags: ['编程', '技术', '开发'],
  },
  {
    id: 'club-2',
    name: '篮球社',
    category: 'sports',
    description: '喜欢篮球的同学一起来交流',
    requirements: '喜欢篮球运动',
    memberCount: 80,
    contact: '微信群: 篮球爱好者',
    tags: ['篮球', '运动', '体育'],
  },
  {
    id: 'club-3',
    name: '书法社',
    category: 'arts',
    description: '传承书法艺术，一起练字交流',
    requirements: '热爱书法',
    memberCount: 120,
    contact: '教室: 文艺楼101',
    tags: ['书法', '艺术', '传统文化'],
  },
]

describe('clubService', () => {
  beforeEach(() => {
    // Reset store before each test
    initializeClubStore({
      clubs: [...mockClubs],
      categories: [...mockCategories],
    })
  })

  it('initializes with correct data', () => {
    const clubs = getAllClubs()
    expect(clubs).toHaveLength(3)
  })

  describe('getClubById', () => {
    it('returns correct club by id', () => {
      const club = getClubById('club-1')
      expect(club).not.toBeUndefined()
      expect(club?.name).toBe('编程协会')
    })

    it('returns undefined for non-existent club', () => {
      const club = getClubById('non-existent')
      expect(club).toBeUndefined()
    })
  })

  describe('addClub', () => {
    it('adds a new club correctly', () => {
      const newClub: Club = {
        id: 'club-4',
        name: '绘画社',
        category: 'arts',
        description: '绘画爱好者交流',
        requirements: '喜欢绘画',
        memberCount: 40,
        contact: '美术楼202',
        tags: ['绘画', '艺术'],
      }

      const result = addClub(newClub)
      expect(result).toEqual(newClub)
      expect(getAllClubs()).toHaveLength(4)
      expect(getClubById('club-4')).toEqual(newClub)
    })
  })

  describe('updateClub', () => {
    it('updates existing club correctly', () => {
      const updates = {
        name: '编程与开发协会',
        memberCount: 160,
      }

      const result = updateClub('club-1', updates)
      expect(result).not.toBeUndefined()
      expect(result?.name).toBe('编程与开发协会')
      expect(result?.memberCount).toBe(160)
      // Original fields should remain
      expect(result?.category).toBe('technology')
      expect(result?.tags).toEqual(['编程', '技术', '开发'])
    })

    it('returns undefined for non-existent club', () => {
      const result = updateClub('non-existent', { name: 'New Name' })
      expect(result).toBeUndefined()
    })
  })

  describe('deleteClub', () => {
    it('deletes existing club correctly', () => {
      const deleted = deleteClub('club-2')
      expect(deleted).not.toBeUndefined()
      expect(deleted?.id).toBe('club-2')
      expect(getAllClubs()).toHaveLength(2)
      expect(getClubById('club-2')).toBeUndefined()
    })

    it('returns undefined when deleting non-existent club', () => {
      const result = deleteClub('non-existent')
      expect(result).toBeUndefined()
      expect(getAllClubs()).toHaveLength(3)
    })
  })

  describe('getFilteredClubs', () => {
    it('returns all clubs when no filters applied', () => {
      const result = getFilteredClubs({})
      expect(result).toHaveLength(3)
    })

    it('filters by category', () => {
      const result = getFilteredClubs({ category: 'technology' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('club-1')
    })

    it('filters by search query in name', () => {
      const result = getFilteredClubs({ searchQuery: '编程' })
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('编程协会')
    })

    it('filters by search query in description', () => {
      const result = getFilteredClubs({ searchQuery: '编程技术' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('club-1')
    })

    it('filters by search query in tags', () => {
      const result = getFilteredClubs({ searchQuery: '艺术' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('club-3')
    })

    it('filters by multiple tags (any match)', () => {
      const result = getFilteredClubs({ tags: ['艺术'] })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('club-3')
    })

    it('combines multiple filters correctly', () => {
      const result = getFilteredClubs({
        category: 'arts',
        searchQuery: '书法',
      })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('club-3')
    })
  })

  describe('getAllTags', () => {
    it('returns all unique tags sorted', () => {
      const tags = getAllTags()
      // Should have all 9 unique tags
      expect(tags).toHaveLength(9)
      // Check uniqueness
      expect(new Set(tags).size).toBe(tags.length)
      // Check all expected tags are present
      expect(tags).toEqual(expect.arrayContaining([
        '传统文化', '书法', '篮球', '开发', '技术', '体育', '编程', '运动', '艺术',
      ]))
    })
  })

  describe('getClubsByCategory', () => {
    it('groups clubs by category correctly', () => {
      const grouped = getClubsByCategory()
      expect(grouped.technology).toHaveLength(1)
      expect(grouped.sports).toHaveLength(1)
      expect(grouped.arts).toHaveLength(1)
    })
  })

  describe('getFeaturedClubs', () => {
    it('returns clubs with more than 100 members, max 4', () => {
      const featured = getFeaturedClubs()
      expect(featured).toHaveLength(2)
      // Should have club-1 (150) and club-3 (120)
      expect(featured.map(c => c.id)).toEqual(expect.arrayContaining(['club-1', 'club-3']))
    })
  })

  describe('getAllCategories', () => {
    it('returns all categories', () => {
      const categories = getAllCategories()
      expect(categories).toEqual(mockCategories)
      expect(categories).toHaveLength(3)
    })
  })

  describe('getCategoryById', () => {
    it('returns correct category by id', () => {
      const category = getCategoryById('sports')
      expect(category).not.toBeUndefined()
      expect(category?.name).toBe('体育')
    })

    it('returns undefined for non-existent category', () => {
      const category = getCategoryById('non-existent')
      expect(category).toBeUndefined()
    })
  })

  describe('getTotalMemberCount', () => {
    it('calculates total correctly across all clubs', () => {
      // 150 + 80 + 120 = 350
      const total = getTotalMemberCount()
      expect(total).toBe(350)
    })
  })

  describe('getClubsByCategoryName', () => {
    it('returns clubs for specific category name', () => {
      const clubs = getClubsByCategoryName('technology')
      expect(clubs).toHaveLength(1)
      expect(clubs[0].id).toBe('club-1')
    })
  })

  describe('searchClubs', () => {
    it('returns matching clubs by name', () => {
      const result = searchClubs('编程')
      expect(result).toHaveLength(1)
    })

    it('returns matching clubs by category', () => {
      const result = searchClubs('tech')
      expect(result).toHaveLength(1)
    })

    it('returns matching clubs by tag', () => {
      const result = searchClubs('艺术')
      expect(result).toHaveLength(1)
    })

    it('returns multiple matches when found', () => {
      // Both "编程协会" has "技术" tag and category "technology"
      // "书法社" has "艺术" tag
      const result = searchClubs('术')
      expect(result.length).toBeGreaterThan(1)
    })

    it('returns empty array when no matches', () => {
      const result = searchClubs('nonexistentkeyword')
      expect(result).toHaveLength(0)
    })
  })
})
