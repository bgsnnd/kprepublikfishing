import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth/context'
import { verifyPassword, hashPassword } from '@/lib/auth/password'
import { writeAudit } from '@/lib/audit/log'
import { getRequestContext } from '@/lib/auth/context'
import { changePasswordSchema } from '@/lib/validation/auth'
import { formatZodError } from '@/lib/validation/auth'
import { ok, withErrorHandler, parseJsonBody } from '@/lib/api/response'
import { BadRequestError, ValidationError } from '@/lib/errors'

// ============================================================
// POST /api/auth/change-password
// ============================================================

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await requireSession()
    const ctx = await getRequestContext()
    const body = await parseJsonBody(req)

    // 1. Validasi input
    const parsed = changePasswordSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const { currentPassword, newPassword } = parsed.data

    // 2. Cari user
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        username: true,
        email: true,
        passwordHash: true,
      },
    })

    if (!user) {
      throw new BadRequestError('User tidak ditemukan')
    }

    // 3. Verifikasi password lama
    const valid = await verifyPassword(currentPassword, user.passwordHash)
    if (!valid) {
      throw new BadRequestError('Password lama salah')
    }

    // 4. Hash password baru
    const newHash = await hashPassword(newPassword)

    // 5. Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    })

    // 6. Audit log
    await writeAudit({
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      after: {
        passwordChanged: true,
        self: true,
      },
      module: 'auth',
      severity: 'WARNING',
      context: {
        userId: user.id,
        userEmail: user.email,
        ipAddress: ctx.ipAddress ?? undefined,
        userAgent: ctx.userAgent ?? undefined,
        requestId: ctx.requestId,
      },
    })

    return ok({
      message: 'Password berhasil diganti',
    })
  }, { module: 'auth.change-password' })
}