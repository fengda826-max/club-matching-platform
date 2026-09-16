import { OpenAIEmbeddings } from '@langchain/openai'
import { env } from '../lib/env'

/**
 * 通过 LangChain.js 的 OpenAIEmbeddings 连接百炼（DashScope）兼容端点。
 * 只做“把文本变成向量”这一件事——对话仍走既有的 provider 抽象层。
 *
 * 百炼 text-embedding-v3：1024 维，批量上限 10，与 OpenAI /embeddings 协议兼容。
 */
export function createEmbeddings(): OpenAIEmbeddings {
  if (!env.AI_API_KEY) {
    throw new Error('AI_API_KEY is required to create embeddings')
  }
  return new OpenAIEmbeddings({
    apiKey: env.AI_API_KEY,
    model: env.AI_EMBEDDING_MODEL,
    dimensions: env.AI_EMBEDDING_DIM,
    batchSize: 10,
    configuration: {
      baseURL: env.AI_BASE_URL,
    },
  })
}
