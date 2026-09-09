import { PrismaClient } from '@prisma/client'
import { demoClubs } from '../src/data/demoClubs'

const prisma = new PrismaClient()

async function main() {
  await prisma.recruitmentIntent.deleteMany()
  await prisma.aIRequestLog.deleteMany()
  await prisma.club.deleteMany()
  await prisma.$transaction(demoClubs.map(data => prisma.club.create({ data })))
  console.log(`Seeded ${demoClubs.length} demo clubs`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
