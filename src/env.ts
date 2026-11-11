import { config } from 'dotenv'
import { z } from 'zod'

// Nos testes (NODE_ENV=test, definido pelo Jest) usamos o .env.test
config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env', quiet: true })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.url({ message: 'DATABASE_URL precisa ser uma URL válida' }),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET é obrigatório'),
  JWT_EXPIRES_IN: z.string().default('1d'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:', z.flattenError(parsed.error).fieldErrors)
  throw new Error('Variáveis de ambiente inválidas.')
}

export const env = parsed.data
