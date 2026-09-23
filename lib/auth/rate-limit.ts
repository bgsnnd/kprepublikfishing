import { prisma } from '@/lib/prisma'

const MAX_ATTEMPTS = 5
const WINDOW_MINUTES = 15

type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds?: number
}

/**
 * Cek apakah email+IP masih boleh login.
 * Logika: hitung percobaan GAGAL dalam window 15 menit terakhir.
 */
export async function checkLoginRateLimit(
  email: string,
  ip: string,
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000)

  const failedCount = await prisma.loginAttempt.count({
    where: {
      email: email.toLowerCase(),
      ip,
      success: false,
      createdAt: { gte: windowStart },
    },
  })

  if (failedCount >= MAX_ATTEMPTS) {
    // Cari attempt terakhir untuk hitung retry after
    const oldest = await prisma.loginAttempt.findFirst({
      where: {
        email: email.toLowerCase(),
        ip,
        success: false,
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    })

    const retryAfter = oldest
      ? Math.ceil(
          (oldest.createdAt.getTime() +
            WINDOW_MINUTES * 60 * 1000 -
            Date.now()) /
            1000,
        )
      : WINDOW_MINUTES * 60

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(retryAfter, 1),
    }
  }

  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - failedCount,
  }
}

/**
 * Catat percobaan login (berhasil atau gagal).
 */
export async function recordLoginAttempt(params: {
  email: string
  ip: string
  success: boolean
  userAgent?: string | null
}): Promise<void> {
  await prisma.loginAttempt.create({
    data: {
      email: params.email.toLowerCase(),
      ip: params.ip,
      success: params.success,
      userAgent: params.userAgent ?? null,
    },
  })
}

/**
 * Bersihkan log lama (>30 hari). Panggil dari cron / scheduled job.
 */
export async function cleanupOldLoginAttempts(): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const result = await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })
  return result.count
}