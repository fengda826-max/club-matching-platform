/**
 * 共享模块导出
 */

// 常量
export * from './constants'
export { API_CONFIG, MATCHING_CONFIG, PAGINATION_CONFIG, ANIMATION_CONFIG, STORAGE_KEYS, CATEGORY_EMOJI_MAP, SKILL_LEVEL_MAP, VALIDATION_RULES } from './constants'

// 类型
export type * from './types'
export type { ApiResponse, PaginationParams, PaginationResult, FormState, LoadingState, LoadingStateWith, TagAction, TagOperation, ModalState, TabOption, StatCard } from './types'

// 格式化工具
export * from './formatters'
export { getCategoryEmoji, getSkillLevelLabel, formatMemberCount, formatDate, formatMatchScore, truncateText, formatTagsDisplay, getMatchScoreLevel, type ScoreColorFormat } from './formatters'

// 标签工具
export * from './tags'
export { addTag, removeTag } from './tags'

// 验证工具
export * from './validators'
export { validateClubName, validateDescription, validateTag, validateTags, validateMemberCount, validateContact, validateClubForm } from './validators'
