export type CategoryPresentation = {
  shortLabel: string
  label: string
  tone: 'green' | 'blue' | 'amber' | 'plum' | 'slate'
}

export const NAV_ITEMS = [
  { to: '/', label: '首页' },
  { to: '/clubs', label: '发现社团' },
  { to: '/matching', label: '智能匹配' },
  { to: '/chat', label: 'AI 问答' },
  { to: '/admin', label: '运营看板' },
] as const

const categories: Record<string, Omit<CategoryPresentation, 'label'>> = {
  技术: { shortLabel: '技', tone: 'green' },
  体育: { shortLabel: '体', tone: 'blue' },
  艺术: { shortLabel: '艺', tone: 'plum' },
  学术: { shortLabel: '学', tone: 'amber' },
  文化: { shortLabel: '文', tone: 'slate' },
}

export function getCategoryPresentation(category: string): CategoryPresentation {
  const known = categories[category]
  return { shortLabel: known?.shortLabel ?? '社', label: category, tone: known?.tone ?? 'slate' }
}
