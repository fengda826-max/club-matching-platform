/**
 * 应用全局常量定义
 */

// API配置
export const API_CONFIG = {
  MAX_RETRIES: 2,
  TIMEOUT: 30000, // 30秒
} as const

// 匹配配置
export const MATCHING_CONFIG = {
  MIN_SCORE: 50,
  MAX_SCORE: 100,
  DEFAULT_REASON_COUNT: 3,
  SCORE_THRESHOLDS: {
    HIGH: 85,
    MEDIUM: 70,
    LOW: 50,
  },
} as const

// 分页配置
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 12,
  MAX_PAGE_SIZE: 50,
} as const

// 动画配置
export const ANIMATION_CONFIG = {
  DEFAULT_DURATION: 300, // ms
  STAGGER_DELAY: 100, // ms
  FLOAT_ANIMATION_DURATION: 6000, // ms
} as const

// 存储键
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'club_platform_user_preferences',
  MATCH_RESULTS: 'club_platform_match_results',
  CHAT_HISTORY: 'club_platform_chat_history',
} as const

// 社团分类映射
export const CATEGORY_EMOJI_MAP: Record<string, string> = {
  '技术': '💻',
  '体育': '⚽',
  '艺术': '🎨',
  '学术': '📚',
  '文化': '🌍',
} as const

// 技能水平映射
export const SKILL_LEVEL_MAP: Record<string, string> = {
  'beginner': '初学者',
  'intermediate': '有一定基础',
  'advanced': '熟练掌握',
  'expert': '专家水平',
} as const

// 表单验证规则
export const VALIDATION_RULES = {
  CLUB_NAME_MIN_LENGTH: 2,
  CLUB_NAME_MAX_LENGTH: 50,
  DESCRIPTION_MIN_LENGTH: 10,
  DESCRIPTION_MAX_LENGTH: 500,
  TAG_MAX_COUNT: 20,
  TAG_MAX_LENGTH: 20,
  TAG_MIN_LENGTH: 2,
} as const
