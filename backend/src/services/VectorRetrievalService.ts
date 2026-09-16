import type { Embeddings } from '@langchain/core/embeddings'
import { SqliteVecStore, type VectorHit } from '../ai/vectorStore'
import { createEmbeddings } from '../ai/embeddings'
import { env } from '../lib/env'

/**
 * 语义召回服务：把查询文本 embed 成向量，再用 sqlite-vec 做 KNN。
 *
 * 这是混合检索的“第一层”（语义相关），规则层仍是权威的“合格 + 打分”。
 * 任一步失败都会抛出，交由上层降级到关键词 / 规则逻辑。
 */
export class VectorRetrievalService {
  private readonly embeddings: Embeddings
  private readonly store: SqliteVecStore

  constructor(embeddings: Embeddings, store: SqliteVecStore) {
    this.embeddings = embeddings
    this.store = store
  }

  /**
   * 检索最相关的知识块（用于问答 grounding + 来源展示）。
   * 会多取一些候选块，让同一社团的多个段落都有机会命中。
   */
  async retrievePassages(queryText: string, k: number): Promise<VectorHit[]> {
    const trimmed = queryText.trim()
    if (!trimmed) return []
    const vector = await this.embeddings.embedQuery(trimmed)
    // 多取知识块（k 个社团 × 每社团若干段落），下游再按需去重
    return this.store.search(vector, Math.max(k * 3, k))
  }

  /**
   * 检索最相关的 clubId（用于匹配的向量召回层），按最小距离去重排序。
   */
  async retrieveClubIds(queryText: string, k: number): Promise<number[]> {
    const hits = await this.retrievePassages(queryText, k)
    const bestDistance = new Map<number, number>()
    for (const hit of hits) {
      const current = bestDistance.get(hit.clubId)
      if (current === undefined || hit.distance < current) {
        bestDistance.set(hit.clubId, hit.distance)
      }
    }
    return Array.from(bestDistance.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, k)
      .map(([clubId]) => clubId)
  }
}

/**
 * 依据环境构造检索服务：RAG 开启且有 API Key 时返回实例，否则返回 null
 * （上层据此回落到关键词 / 规则逻辑）。构造本身不触发网络请求。
 */
export function createVectorRetrieval(): VectorRetrievalService | null {
  if (!env.RAG_ENABLED || !env.AI_API_KEY) return null
  try {
    const store = new SqliteVecStore()
    return new VectorRetrievalService(createEmbeddings(), store)
  } catch {
    return null
  }
}
