import { prisma } from '../src/lib/prisma'
import { env } from '../src/lib/env'
import { ensureVectorIndex } from '../src/data/ensureVectorIndex'

/**
 * 全量重建社团知识的向量索引（force）。
 * 用法：npm run index:vectors --workspace backend
 */
async function main() {
  if (!env.AI_API_KEY) {
    console.error('AI_API_KEY 未配置，无法生成向量索引。请在 backend/.env 中设置后重试。')
    process.exitCode = 1
    return
  }
  const count = await ensureVectorIndex(prisma, { enabled: true, apiKey: env.AI_API_KEY, force: true })
  console.log(`Indexed ${count} knowledge passages into sqlite-vec.`)
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
