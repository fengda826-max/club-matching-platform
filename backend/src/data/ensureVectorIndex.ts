import type { PrismaClient } from '@prisma/client'
import { createEmbeddings } from '../ai/embeddings'
import { SqliteVecStore } from '../ai/vectorStore'
import { flattenKnowledge } from './clubKnowledge'

type EnsureOptions = {
  /** 为 true 时即使表非空也重建（脚本用）。 */
  force?: boolean
}

/**
 * 构建/重建社团知识的向量索引。
 * 仿 `ensureDemoData`：无 Key 或已建好则跳过（除非 force）。
 * @returns 写入的知识块数量（跳过时为 0）
 */
export async function ensureVectorIndex(
  prisma: PrismaClient,
  options: { enabled: boolean; apiKey: string } & EnsureOptions,
): Promise<number> {
  if (!options.enabled || !options.apiKey) return 0

  const store = new SqliteVecStore()
  try {
    if (!options.force && !store.isEmpty()) return 0

    const clubs = await prisma.club.findMany({ select: { id: true, name: true } })
    const clubsByName = new Map(clubs.map(club => [club.name, club.id]))
    const docs = flattenKnowledge(clubsByName)
    if (docs.length === 0) return 0

    const embeddings = createEmbeddings()
    const vectors = await embeddings.embedDocuments(docs.map(doc => doc.content))
    store.indexDocuments(docs, vectors)
    return docs.length
  } finally {
    store.close()
  }
}
