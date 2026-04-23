/**
 * 表单验证工具
 */
import { VALIDATION_RULES } from './constants'

/**
 * 验证社团名称
 */
export function validateClubName(name: string): { valid: boolean; message?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, message: '社团名称不能为空' }
  }

  if (name.length < VALIDATION_RULES.CLUB_NAME_MIN_LENGTH) {
    return { valid: false, message: `社团名称至少${VALIDATION_RULES.CLUB_NAME_MIN_LENGTH}个字符` }
  }

  if (name.length > VALIDATION_RULES.CLUB_NAME_MAX_LENGTH) {
    return { valid: false, message: `社团名称不能超过${VALIDATION_RULES.CLUB_NAME_MAX_LENGTH}个字符` }
  }

  return { valid: true }
}

/**
 * 验证描述
 */
export function validateDescription(description: string): { valid: boolean; message?: string } {
  if (!description || description.trim().length === 0) {
    return { valid: false, message: '描述不能为空' }
  }

  if (description.length < VALIDATION_RULES.DESCRIPTION_MIN_LENGTH) {
    return { valid: false, message: `描述至少${VALIDATION_RULES.DESCRIPTION_MIN_LENGTH}个字符` }
  }

  if (description.length > VALIDATION_RULES.DESCRIPTION_MAX_LENGTH) {
    return { valid: false, message: `描述不能超过${VALIDATION_RULES.DESCRIPTION_MAX_LENGTH}个字符` }
  }

  return { valid: true }
}

/**
 * 验证标签
 */
export function validateTag(tag: string): { valid: boolean; message?: string } {
  if (!tag || tag.trim().length === 0) {
    return { valid: false, message: '标签不能为空' }
  }

  if (tag.length < VALIDATION_RULES.TAG_MIN_LENGTH) {
    return { valid: false, message: `标签至少${VALIDATION_RULES.TAG_MIN_LENGTH}个字符` }
  }

  if (tag.length > VALIDATION_RULES.TAG_MAX_LENGTH) {
    return { valid: false, message: `标签不能超过${VALIDATION_RULES.TAG_MAX_LENGTH}个字符` }
  }

  return { valid: true }
}

/**
 * 验证标签数组
 */
export function validateTags(tags: string[]): { valid: boolean; message?: string } {
  if (tags.length > VALIDATION_RULES.TAG_MAX_COUNT) {
    return { valid: false, message: `最多添加${VALIDATION_RULES.TAG_MAX_COUNT}个标签` }
  }

  return { valid: true }
}

/**
 * 验证成员数
 */
export function validateMemberCount(count: number): { valid: boolean; message?: string } {
  if (isNaN(count)) {
    return { valid: false, message: '成员数必须是数字' }
  }

  if (count < 0) {
    return { valid: false, message: '成员数不能为负数' }
  }

  return { valid: true }
}

/**
 * 验证联系方式
 */
export function validateContact(contact: string): { valid: boolean; message?: string } {
  if (!contact || contact.trim().length === 0) {
    return { valid: false, message: '联系方式不能为空' }
  }

  return { valid: true }
}

/**
 * 综合验证社团数据
 */
export interface ClubFormData {
  name: string
  category: string
  description: string
  requirements: string
  memberCount: number
  contact: string
  tags: string[]
}

export function validateClubForm(data: ClubFormData): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  const nameResult = validateClubName(data.name)
  if (!nameResult.valid) {
    errors.name = nameResult.message!
  }

  if (!data.category) {
    errors.category = '请选择分类'
  }

  const descResult = validateDescription(data.description)
  if (!descResult.valid) {
    errors.description = descResult.message!
  }

  const tagsResult = validateTags(data.tags)
  if (!tagsResult.valid) {
    errors.tags = tagsResult.message!
  }

  const memberResult = validateMemberCount(data.memberCount)
  if (!memberResult.valid) {
    errors.memberCount = memberResult.message!
  }

  const contactResult = validateContact(data.contact)
  if (!contactResult.valid) {
    errors.contact = contactResult.message!
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
