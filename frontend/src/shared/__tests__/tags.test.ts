import { addTag, removeTag } from '../tags'

describe('tags utilities', () => {
  describe('addTag', () => {
    it('adds a non-empty tag that does not exist', () => {
      const tags: string[] = ['javascript']
      const result = addTag('typescript', tags)
      expect(tags).toEqual(['javascript', 'typescript'])
      expect(result).toBe('')
    })

    it('ignores empty input after trimming', () => {
      const tags: string[] = ['javascript']
      const result = addTag('   ', tags)
      expect(tags).toEqual(['javascript'])
      expect(result).toBe('')
    })

    it('ignores duplicate tags', () => {
      const tags: string[] = ['javascript', 'typescript']
      const result = addTag('javascript', tags)
      expect(tags).toEqual(['javascript', 'typescript'])
      expect(result).toBe('')
    })

    it('trims whitespace from input', () => {
      const tags: string[] = ['javascript']
      const result = addTag('  typescript  ', tags)
      expect(tags).toEqual(['javascript', 'typescript'])
      expect(result).toBe('')
    })
  })

  describe('removeTag', () => {
    it('removes existing tag correctly', () => {
      const tags = ['javascript', 'typescript', 'vue']
      removeTag('typescript', tags)
      expect(tags).toEqual(['javascript', 'vue'])
    })

    it('does nothing when tag does not exist', () => {
      const tags = ['javascript', 'typescript']
      removeTag('react', tags)
      expect(tags).toEqual(['javascript', 'typescript'])
    })

    it('does nothing when removing from empty array', () => {
      const tags: string[] = []
      removeTag('javascript', tags)
      expect(tags).toEqual([])
    })

    it('removes first tag correctly', () => {
      const tags = ['javascript', 'typescript', 'vue']
      removeTag('javascript', tags)
      expect(tags).toEqual(['typescript', 'vue'])
    })

    it('removes last tag correctly', () => {
      const tags = ['javascript', 'typescript', 'vue']
      removeTag('vue', tags)
      expect(tags).toEqual(['javascript', 'typescript'])
    })
  })
})
