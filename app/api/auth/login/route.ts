import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth/password'
import { loadUserAuth } from '@/lib/auth/permissions'
import { setSessionCookies } from '@/lib/auth/session'
import { getRequestContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { checkLoginRateLimit, recordLoginAttempt } from '@/lib/auth/rate-limit'
import { loginSchema, formatZodError } from '@/lib/validation/auth'
import { ok, withErrorHandler, parseJsonBody } from '@/lib/api/response'
import {
  UnauthorizedError,
  RateLimitedError,
  ValidationError,
} from '@/lib/errors'

// ============================================================
// Tentukan redirect setelah login berdasarkan permission
//
// Urutan: paling SPESIFIK dulu, baru umum
// 1. Super Admin  → user.manage + role.manage    → /admin
// 2. Admin        → attendance.manage + user.read → /admin
// 3. Kasir Kantin → pos.kantin                     → /admin/pos/kantin
// 4. Kasir Pancing→ pos.pancing                    → /admin/pos/pancing
// 5. Default      → /absensi (karyawan/caddy)
// ============================================================

function getRedirectAfterLogin(permissions: string[]): string {
  // 1. SUPER_ADMIN — punya user.manage + role.manage
  if (
    permissions.includes('user.manage') &&
    permissions.includes('role.manage')
  ) {
    return '/admin'
  }

  // 2. ADMIN — punya attendance.manage + user.read (tapi tidak role.manage)
  if (
    permissions.includes('attendance.manage') &&
    permissions.includes('user.read')
  ) {
    return '/admin'
  }

  // 3. KASIR KANTIN
  if (permissions.includes('pos.kantin')) {
    return '/admin/pos/kantin'
  }

  // 4. KASIR PANCING
  if (permissions.includes('pos.pancing')) {
    return '/admin/pos/pancing'
  }

  // 5. Default: karyawan/caddy → absensi
  return '/absensi'
}

// ============================================================
// POST /api/auth/login
// ============================================================

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const ctx = await getRequestContext()
    const body = await parseJsonBody(req)

    // 1. Validasi input
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const { username, password } = parsed.data

    // 2. Rate limit
    const rateLimit = await checkLoginRateLimit(
      username,
      ctx.ipAddress ?? 'unknown',
    )
    if (!rateLimit.allowed) {
      throw new RateLimitedError(
        `Terlalu banyak percobaan. Coba lagi dalam ${rateLimit.retryAfterSeconds} detik.`,
      )
    }

    // 3. Cari user
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        passwordHash: true,
        isActive: true,
      },
    })

    if (!user || !user.isActive) {
      await recordLoginAttempt({
        email: username,
        ip: ctx.ipAddress ?? 'unknown',
        success: false,
        userAgent: ctx.userAgent,
      })
      throw new UnauthorizedError('Username atau password salah')
    }

    // 4. Verifikasi password
    const passwordValid = await verifyPassword(password, user.passwordHash)
    if (!passwordValid) {
      await recordLoginAttempt({
        email: username,
        ip: ctx.ipAddress ?? 'unknown',
        success: false,
        userAgent: ctx.userAgent,
      })
      throw new UnauthorizedError('Username atau password salah')
    }

    // 5. Load permission & role
    const authData = await loadUserAuth(user.id)
    if (!authData) {
      throw new UnauthorizedError('Akun tidak valid')
    }

    // 6. Set cookie session
    await setSessionCookies(authData)

    // 7. Update lastLoginAt + catat attempt sukses
    await Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      recordLoginAttempt({
        email: username,
        ip: ctx.ipAddress ?? 'unknown',
        success: true,
        userAgent: ctx.userAgent,
      }),
    ])

    // 8. Audit log
    await writeAudit({
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      module: 'auth',
      severity: 'INFO',
      context: {
        userId: user.id,
        userEmail: user.email,
        userRole: authData.roleCodes[0],
        ipAddress: ctx.ipAddress ?? undefined,
        userAgent: ctx.userAgent ?? undefined,
        requestId: ctx.requestId,
      },
    })

    // 9. Tentukan redirect
    const redirectTo = getRedirectAfterLogin(authData.permissions)

    return ok({
      userId: authData.userId,
      username: authData.username,
      name: authData.name,
      roleCodes: authData.roleCodes,
      permissions: authData.permissions,
      redirectTo,
    })
  }, { module: 'auth.login' })
}