import { createApp } from './app'
import { env } from './lib/env'
import { prisma } from './lib/prisma'
import { ensureDemoData } from './data/ensureDemoData'
import { ensureVectorIndex } from './data/ensureVectorIndex'

let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined

async function start() {
  const seeded = await ensureDemoData(prisma, env.SEED_DEMO_DATA)
  // 向量索引空且有 Key 时自动构建，docker compose up 开箱即用；失败不阻断启动。
  let indexed = 0
  try {
    indexed = await ensureVectorIndex(prisma, { enabled: env.RAG_ENABLED, apiKey: env.AI_API_KEY })
  } catch (error) {
    console.error(JSON.stringify({ event: 'vector_index_failed', message: error instanceof Error ? error.message : String(error) }))
  }
  server = createApp().listen(env.PORT, () => console.log(JSON.stringify({ event: 'server_started', port: env.PORT, seeded, indexed })))
}

async function shutdown(signal: string) {
  console.log(JSON.stringify({ event: 'server_stopping', signal }))
  if (!server) { await prisma.$disconnect(); return process.exit(0) }
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
void start()
