import { describe, expect, it } from 'vitest'
import { getCategoryPresentation, NAV_ITEMS } from '../presentation'

describe('presentation metadata', () => {
  it('exposes every user-facing route once with user-facing labels', () => {
    expect(NAV_ITEMS.map(item => item.to)).toEqual(['/', '/clubs', '/matching', '/chat', '/admin'])
    expect(new Set(NAV_ITEMS.map(item => item.to)).size).toBe(NAV_ITEMS.length)
  })

  it('returns a stable fallback for unknown categories', () => {
    expect(getCategoryPresentation('技术')).toEqual({ shortLabel: '技', label: '技术', tone: 'green' })
    expect(getCategoryPresentation('未知')).toEqual({ shortLabel: '社', label: '未知', tone: 'slate' })
  })
})
