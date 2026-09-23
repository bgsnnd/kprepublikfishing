import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { hashPassword } from '@/lib/auth/password'
import { writeAudit } from '@/lib/audit/log'
import { resetUserPasswordSchema } from '@/lib/validation/user'
import { formatZodError } from '@/lib/validation/auth'
import { ok, withErrorHandler, parseJsonBody } from '@/lib/api/response'
import { NotFoundError, ValidationError } from '@/lib/errors'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('user.manage')
    const { id } = await ctx.params
    const body = await parseJsonBody(req)

    const parsed = resetUserPasswordSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!user) throw new NotFoundError('User tidak ditemukan')

    const passwordHash = await hashPassword(parsed.data.newPassword)

    await prisma.user.update({
      where: { id },
      data: { passwordHash, updatedById: session.userId },
    })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      after: { passwordReset: true },
      module: 'rbac',
      severity: 'WARNING',
      context: auditCtx,
    })

    return ok({ message: 'Password berhasil direset' })
  }, { module: 'users.reset-password' })
}