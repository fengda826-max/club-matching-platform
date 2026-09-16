import dotenv from 'dotenv'
import { z } from 'zod'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1).default('file:./dev.db'),
  CORS_ORIGIN: z.string().default('http://localhost:5175'),
  AI_PROVIDER: z.enum(['anthropic', 'openai-compat']).default('openai-compat'),
  AI_API_KEY: z.string().default(''),
  AI_BASE_URL: z.string().url().optional(),
  AI_MODEL: z.string().optional(),
  AI_TIMEOUT: z.coerce.number().int().positive().default(30000),
  AI_MAX_RETRIES: z.coerce.number().int().nonnegative().max(5).default(2),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).optional(),
  AI_EMBEDDING_MODEL: z.string().default('text-embedding-v3'),
  AI_EMBEDDING_DIM: z.coerce.number().int().positive().default(1024),
  RAG_ENABLED: z.enum(['true', 'false']).default('true'),
  RAG_TOP_K: z.coerce.number().int().positive().max(50).default(5),
  ADMIN_PASSWORD: z.string().default(''),
  SESSION_SECRET: z.string().default(''),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
  SEED_DEMO_DATA: z.enum(['true', 'false']).default('false'),
})

const parsed = rawEnvSchema.parse(process.env)
process.env.DATABASE_URL = parsed.DATABASE_URL

if (parsed.NODE_ENV === 'production' && (!parsed.ADMIN_PASSWORD || !parsed.SESSION_SECRET)) {
  throw new Error('ADMIN_PASSWORD and SESSION_SECRET are required in production')
}

export const env = {
  ...parsed,
  CORS_ORIGINS: parsed.CORS_ORIGIN.split(',').map(value => value.trim()).filter(Boolean),
  COOKIE_SECURE: parsed.COOKIE_SECURE === 'true',
  SEED_DEMO_DATA: parsed.SEED_DEMO_DATA === 'true',
  RAG_ENABLED: parsed.RAG_ENABLED === 'true',
}
