import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL harus URL valid'),
  DIRECT_URL: z.string().url().optional(),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET minimal 32 karakter'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET minimal 32 karakter'),

  // S3 / Neon Object Storage
  AWS_ENDPOINT_URL_S3: z.string().url('AWS_ENDPOINT_URL_S3 harus URL valid'),
  AWS_REGION: z.string().min(1, 'AWS_REGION wajib diisi'),
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID wajib diisi'),
  AWS_SECRET_ACCESS_KEY: z
    .string()
    .min(1, 'AWS_SECRET_ACCESS_KEY wajib diisi'),
  AWS_BUCKET_PUBLIC: z.string().min(1, 'AWS_BUCKET_PUBLIC wajib diisi'),
  AWS_BUCKET_PRIVATE: z.string().min(1, 'AWS_BUCKET_PRIVATE wajib diisi'),
  AWS_PUBLIC_URL: z.string().url('AWS_PUBLIC_URL harus URL valid'),

  // App
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  ALLOWED_ORIGIN: z.string().url().optional(),
  APP_NAME: z.string().default('KP Republik Fishing'),
})

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    const message = Object.entries(errors)
      .map(([key, val]) => `  - ${key}: ${val?.join(', ')}`)
      .join('\n')

    console.error('❌ Environment variable tidak valid:\n' + message)
    throw new Error('Environment variable validation failed')
  }

  return parsed.data
}

export const env = validateEnv()