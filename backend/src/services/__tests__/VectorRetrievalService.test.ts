import { describe, expect, it } from 'vitest'
import type { Embeddings } from '@langchain/core/embeddings'
import { VectorRetrievalService } from '../VectorRetrievalService'
import type { SqliteVecStore, VectorHit } from '../../ai/vectorStore'

function fakeEmbeddings(vector: number[]): Embeddings {
  return { embedQuery: async () => vector } as unknown as Embeddings
}

function fakeStore(hits: VectorHit[]): SqliteVecStore {
  return { search: () => hits } as unknown as SqliteVecStore
}

describe('VectorRetrievalService', () => {
  it('dedupes clubIds by smallest distance and preserves relevance order', async () => {
    const hits: VectorHit[] = [
      { clubId: 6, section: 'FAQ', content: 'a', distance: 0.3 },
      { clubId: 1, section: '介绍', content: 'b', distance: 0.1 },
      { clubId: 6, section: '介绍', content: 'c', distance: 0.05 },
      { clubId: 3, section: '介绍', content: 'd', distance: 0.5 },
    ]
    const service = new VectorRetrievalService(fakeEmbeddings([1, 0, 0]), fakeStore(hits))
    const ids = await service.retrieveClubIds('我喜欢拍照', 3)
    // 6 的最小距离 0.05 < 1 的 0.1 < 3 的 0.5
    expect(ids).toEqual([6, 1, 3])
  })

  it('returns empty for blank query without embedding', async () => {
    let called = false
    const embeddings = { embedQuery: async () => { called = true; return [1, 0] } } as unknown as Embeddings
    const service = new VectorRetrievalService(embeddings, fakeStore([]))
    expect(await service.retrievePassages('   ', 5)).toEqual([])
    expect(called).toBe(false)
  })
})
