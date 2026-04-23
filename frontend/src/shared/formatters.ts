/**
 * 数据格式化工具
 */
import { CATEGORY_EMOJI_MAP, SKILL_LEVEL_MAP } from './constants'

/**
 * 获取分类对应的emoji
 */
export function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJI_MAP[category] || '🎯'
}

/**
 * 获取技能水平对应的中文
 */
export function getSkillLevelLabel(skillLevel: string): string {
  return SKILL_LEVEL_MAP[skillLevel] || skillLevel
}

/**
 * 格式化成员数
 */
export function formatMemberCount(count: number | string): string {
  const num = typeof count === 'string' ? parseInt(count) : count
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`
  }
  return num.toString()
}

/**
 * 格式化日期
 */
export function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  if (days < 365) return `${Math.floor(days / 30)}月前`
  return `${Math.floor(days / 365)}年前`
}

import { MATCHING_CONFIG } from './constants'

/**
 * 格式化匹配分数
 */
export type ScoreColorFormat = 'hex' | 'css-var'

export function formatMatchScore(
  score: number,
  colorFormat: ScoreColorFormat = 'hex'
): { value: string; color: string } {
  const value = Math.round(score)
  const { HIGH, MEDIUM, LOW } = MATCHING_CONFIG.SCORE_THRESHOLDS

  let color: string

  if (value >= HIGH) {
    color = colorFormat === 'css-var' ? 'var(--color-primary)' : '#67c23a'
  } else if (value >= MEDIUM) {
    color = colorFormat === 'css-var' ? 'var(--color-secondary)' : '#e6a23c'
  } else if (value >= LOW) {
    color = colorFormat === 'css-var' ? 'var(--color-accent)' : '#f56c6c'
  } else {
    color = colorFormat === 'css-var' ? 'var(--color-gray-600)' : '#868E96'
  }

  return { value: value.toString(), color }
}

/**
 * 截断文本
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * 格式化标签显示
 */
export function formatTagsDisplay(tags: string[], maxShow: number = 3): {
  displayTags: string[]
  moreCount: number
} {
  if (tags.length <= maxShow) {
    return {
      displayTags: tags,
      moreCount: 0,
    }
  }

  return {
    displayTags: tags.slice(0, maxShow),
    moreCount: tags.length - maxShow,
  }
}

/**
 * 获取匹配分数等级
 */
export function getMatchScoreLevel(score: { valid: boolean; message: string }): {
  level: string
  label: string
} {
  const value = Math.round(score)

  if (value >= 90) {
    return { level: 'excellent', label: '极度匹配' }
  }
  if (value >= 80) {
    return { level: 'great', label: '非常匹配' }
  }
  if (value >= 70) {
    return { level: 'good', label: '较为匹配' }
  }
  if (value >= 60) {
    return { level: 'fair', label: '一般匹配' }
  }
  return { level: 'low', label: '匹配度较低' }
}
