/**
 * 标签操作通用工具函数
 */

/**
 * 添加标签到标签数组（通用）
 * @param input 输入字符串
 * @param tags 标签数组
 * @returns 清空输入框返回空字符串
 */
export function addTag(input: string, tags: string[]): string {
  const trimmed = input.trim()
  if (trimmed && !tags.includes(trimmed)) {
    tags.push(trimmed)
  }
  return ''
}

/**
 * 从标签数组移除标签（通用）
 * @param tag 要移除的标签
 * @param tags 标签数组
 */
export function removeTag(tag: string, tags: string[]): void {
  const index = tags.indexOf(tag)
  if (index > -1) {
    tags.splice(index, 1)
  }
}
