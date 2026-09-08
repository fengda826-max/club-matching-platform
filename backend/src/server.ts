import { createApp } from './app'
import { env } from './lib/env'
import { prisma } from './lib/prisma'

const server = createApp().listen(env.PORT, () => {
  console.log(JSON.stringify({ event: 'server_started', port: env.PORT }))
})

async function shutdown(signal: string) {
  console.log(JSON.stringify({ event: 'server_stopping', signal }))
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
