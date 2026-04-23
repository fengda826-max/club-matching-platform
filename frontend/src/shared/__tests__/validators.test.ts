import { describe, it, expect } from 'vitest'
import {
  validateClubName,
  validateDescription,
  validateTag,
  validateTags,
  validateMemberCount,
  validateContact,
  validateClubForm,
} from '../validators'

describe('validateClubName', () => {
  it('returns invalid for empty name', () => {
    const result = validateClubName('')
    expect(result.valid).toBe(false)
    expect(result.message).toBe('社团名称不能为空')
  })

  it('returns invalid for name that is too short', () => {
    const result = validateClubName('A')
    expect(result.valid).toBe(false)
    expect(result.message).toContain('至少')
  })

  it('returns invalid for name that is too long', () => {
    const longName = 'A'.repeat(100)
    const result = validateClubName(longName)
    expect(result.valid).toBe(false)
    expect(result.message).toContain('不能超过')
  })

  it('returns valid for valid club name', () => {
    const result = validateClubName('编程协会')
    expect(result.valid).toBe(true)
    expect(result.message).toBeUndefined()
  })
})

describe('validateDescription', () => {
  it('returns invalid for empty description', () => {
    const result = validateDescription('')
    expect(result.valid).toBe(false)
    expect(result.message).toBe('描述不能为空')
  })

  it('returns invalid for description that is too short', () => {
    const result = validateDescription('短')
    expect(result.valid).toBe(false)
    expect(result.message).toContain('至少')
  })

  it('returns invalid for description that is too long', () => {
    const longDesc = 'A'.repeat(1000)
    const result = validateDescription(longDesc)
    expect(result.valid).toBe(false)
    expect(result.message).toContain('不能超过')
  })

  it('returns valid for valid description', () => {
    const result = validateDescription('这是一个关于编程技术交流的社团')
    expect(result.valid).toBe(true)
    expect(result.message).toBeUndefined()
  })
})

describe('validateTag', () => {
  it('returns invalid for empty tag', () => {
    const result = validateTag('')
    expect(result.valid).toBe(false)
    expect(result.message).toBe('标签不能为空')
  })

  it('returns invalid for tag that is too short', () => {
    const result = validateTag('a')
    expect(result.valid).toBe(false)
    expect(result.message).toContain('至少')
  })

  it('returns invalid for tag that is too long', () => {
    const longTag = 'a'.repeat(21)
    const result = validateTag(longTag)
    expect(result.valid).toBe(false)
    expect(result.message).toContain('不能超过')
  })

  it('returns valid for valid tag', () => {
    const result = validateTag('编程')
    expect(result.valid).toBe(true)
    expect(result.message).toBeUndefined()
  })
})

describe('validateTags', () => {
  it('returns invalid when exceeding maximum tag count', () => {
    const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`)
    const result = validateTags(tags)
    expect(result.valid).toBe(false)
    expect(result.message).toContain('最多添加')
  })

  it('returns valid when tag count is within limit', () => {
    const tags = Array.from({ length: 10 }, (_, i) => `tag${i}`)
    const result = validateTags(tags)
    expect(result.valid).toBe(true)
    expect(result.message).toBeUndefined()
  })
})

describe('validateMemberCount', () => {
  it('returns invalid for NaN', () => {
    const result = validateMemberCount(NaN)
    expect(result.valid).toBe(false)
    expect(result.message).toBe('成员数必须是数字')
  })

  it('returns invalid for negative count', () => {
    const result = validateMemberCount(-10)
    expect(result.valid).toBe(false)
    expect(result.message).toBe('成员数不能为负数')
  })

  it('returns valid for zero members', () => {
    const result = validateMemberCount(0)
    expect(result.valid).toBe(true)
    expect(result.message).toBeUndefined()
  })

  it('returns valid for positive count', () => {
    const result = validateMemberCount(50)
    expect(result.valid).toBe(true)
    expect(result.message).toBeUndefined()
  })
})

describe('validateContact', () => {
  it('returns invalid for empty contact', () => {
    const result = validateContact('')
    expect(result.valid).toBe(false)
    expect(result.message).toBe('联系方式不能为空')
  })

  it('returns valid for non-empty contact', () => {
    const result = validateContact('QQ群: 12345678')
    expect(result.valid).toBe(true)
    expect(result.message).toBeUndefined()
  })
})

describe('validateClubForm', () => {
  it('returns valid for complete valid form', () => {
    const formData = {
      name: '编程协会',
      category: 'technology',
      description: '这是一个致力于编程技术交流和分享的社团，欢迎所有对编程感兴趣的同学加入',
      requirements: '对编程有基本了解，愿意参与活动分享',
      memberCount: 50,
      contact: 'QQ群: 12345678',
      tags: ['编程', '技术', '开发'],
    }
    const result = validateClubForm(formData)
    expect(result.valid).toBe(true)
    expect(Object.keys(result.errors)).toHaveLength(0)
  })

  it('returns errors for invalid form with multiple issues', () => {
    const formData = {
      name: 'A', // too short
      category: '', // missing
      description: '短', // too short
      requirements: '',
      memberCount: -5, // negative
      contact: '', // missing
      tags: Array.from({ length: 21 }, (_, i) => `tag${i}`), // too many
    }
    const result = validateClubForm(formData)
    expect(result.valid).toBe(false)
    expect(Object.keys(result.errors)).toEqual(['name', 'category', 'description', 'tags', 'memberCount', 'contact'])
  })

  it('returns no errors when all fields are valid', () => {
    const formData = {
      name: '书法社',
      category: 'arts',
      description: '书法社致力于传承和发扬中国传统书法艺术，每周开展练字交流活动，欢迎热爱书法的同学加入我们一起学习',
      requirements: '热爱书法，有一定的耐心',
      memberCount: 30,
      contact: '微信群: 书法爱好者交流',
      tags: ['书法', '艺术', '传统文化'],
    }
    const result = validateClubForm(formData)
    expect(result.valid).toBe(true)
    expect(Object.keys(result.errors)).toHaveLength(0)
  })
})
