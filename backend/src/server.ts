import { createApp } from './app'
import { env } from './lib/env'
import { prisma } from './lib/prisma'
import { ensureDemoData } from './data/ensureDemoData'

let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined

async function start() {
  const seeded = await ensureDemoData(prisma, env.SEED_DEMO_DATA)
  server = createApp().listen(env.PORT, () => console.log(JSON.stringify({ event: 'server_started', port: env.PORT, seeded })))
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
