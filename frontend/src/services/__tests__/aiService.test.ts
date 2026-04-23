import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Club, UserPreference } from '@/types'
import { ApiError } from '../apiClient'
import {
  generateRecommendations,
  chatWithAI,
  generateDescription,
} from '../aiService'

// Mock the anthropic client
const mockCreate = vi.fn()

vi.mock('../apiClient', async () => {
  const actual = await vi.importActual('../apiClient')
  return {
    ...actual,
    getAnthropicClient: vi.fn(() => ({
      messages: {
        create: mockCreate,
      },
    })),
  }
})

const { getAnthropicClient } = await import('../apiClient')

const mockClubs: Club[] = [
  {
    id: 'club-1',
    name: '编程协会',
    category: '技术',
    description: '这是一个致力于编程技术交流的社团',
    requirements: '对编程有兴趣',
    memberCount: 150,
    contact: 'QQ群: 123456',
    tags: ['编程', '技术', '开发'],
  },
  {
    id: 'club-2',
    name: '篮球社',
    category: '体育',
    description: '喜欢篮球的同学一起来交流',
    requirements: '喜欢篮球运动',
    memberCount: 80,
    contact: '微信群: 篮球爱好者',
    tags: ['篮球', '运动', '体育'],
  },
]

describe('aiService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateRecommendations', () => {
    it('returns parsed recommendations correctly', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: `{
              "matches": [
                {
                  "clubId": "club-1",
                  "score": 90,
                  "reasons": ["你对编程感兴趣", "符合技术社团定位"]
                },
                {
                  "clubId": "club-2",
                  "score": 30,
                  "reasons": ["匹配度较低"]
                }
              ]
            }`,
          },
        ],
      }

      ;(mockCreate as vi.Mock).mockResolvedValue(mockResponse)

      const preferences: UserPreference = {
        interests: ['编程', '开发'],
        skillLevel: 'beginner',
        goals: ['学习新技术'],
      }

      const result = await generateRecommendations({
        preferences,
        clubs: mockClubs,
      })

      expect(mockCreate).toHaveBeenCalled()
      expect(result.matches).toHaveLength(2)
      expect(result.matches[0].clubId).toBeUndefined() // We transform to MatchResult with club object
      expect(result.matches[0].club).toBeDefined()
      expect(result.matches[0].club.id).toBe('club-1')
      expect(result.matches[0].score).toBe(90)
    })

    it('throws error when cannot parse response', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: 'Invalid JSON response',
          },
        ],
      }

      ;(mockCreate as vi.Mock).mockResolvedValue(mockResponse)

      const preferences: UserPreference = {
        interests: ['编程'],
        skillLevel: 'beginner',
        goals: [],
      }

      await expect(generateRecommendations({
        preferences,
        clubs: mockClubs,
      })).rejects.toThrow('Failed to parse AI response')
    })

    it('filters out null results when club not found', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: `{
              "matches": [
                {
                  "clubId": "non-existent",
                  "score": 80,
                  "reasons": ["Some reason"]
                }
              ]
            }`,
          },
        ],
      }

      ;(mockCreate as vi.Mock).mockResolvedValue(mockResponse)

      const preferences: UserPreference = {
        interests: ['编程'],
        skillLevel: 'beginner',
        goals: [],
      }

      const result = await generateRecommendations({
        preferences,
        clubs: mockClubs,
      })

      expect(result.matches).toHaveLength(0)
    })
  })

  describe('chatWithAI', () => {
    it('returns answer correctly', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: '编程协会是一个技术类社团，适合对编程感兴趣的同学加入。',
          },
        ],
      }

      ;(mockCreate as vi.Mock).mockResolvedValue(mockResponse)

      const result = await chatWithAI({
        question: '介绍一下编程协会',
        clubs: mockClubs,
      })

      expect(mockCreate).toHaveBeenCalled()
      expect(result.answer).toBe('编程协会是一个技术类社团，适合对编程感兴趣的同学加入。')
    })

    it('throws error when response has no text', async () => {
      const mockResponse = {
        content: [],
      }

      ;(mockCreate as vi.Mock).mockResolvedValue(mockResponse)

      await expect(chatWithAI({
        question: 'Hello',
        clubs: mockClubs,
      })).rejects.toThrow('Failed to parse AI response')
    })
  })

  describe('generateDescription', () => {
    it('returns generated description and tags correctly', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: `{
              "description": "这是一个充满活力的编程社团，欢迎所有对编程开发感兴趣的同学加入我们，一起学习交流技术。",
              "suggestedTags": ["编程", "技术", "开发", "计算机"],
              "suggestedRequirements": "对编程有基本了解，愿意参与每周活动"
            }`,
          },
        ],
      }

      ;(mockCreate as vi.Mock).mockResolvedValue(mockResponse)

      const result = await generateDescription({
        clubName: '编程协会',
        category: '技术',
        keyActivities: ['编程交流', '技术分享'],
      })

      expect(mockCreate).toHaveBeenCalled()
      expect(result.description).toContain('编程社团')
      expect(result.suggestedTags).toEqual(['编程', '技术', '开发', '计算机'])
      expect(result.suggestedRequirements).toContain('对编程有基本了解')
    })

    it('throws error when cannot parse response', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: 'Not JSON',
          },
        ],
      }

      ;(mockCreate as vi.Mock).mockResolvedValue(mockResponse)

      await expect(generateDescription({
        clubName: '测试',
        category: 'test',
        keyActivities: [],
      })).rejects.toThrow('Failed to parse AI response')
    })
  })
})
