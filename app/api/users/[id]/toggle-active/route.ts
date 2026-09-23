import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { ok, withErrorHandler } from '@/lib/api/response'
import { NotFoundError, BadRequestError } from '@/lib/errors'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('user.manage')
    const { id } = await ctx.params

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, isActive: true },
    })

    if (!user) throw new NotFoundError('User tidak ditemukan')
    if (user.username === session.username) {
      throw new BadRequestError('Tidak bisa mengubah status akun sendiri')
    }

    const newStatus = !user.isActive

    await prisma.user.update({
      where: { id },
      data: { isActive: newStatus, updatedById: session.userId },
    })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      before: { isActive: user.isActive },
      after: { isActive: newStatus },
      module: 'rbac',
      severity: 'INFO',
      context: auditCtx,
    })

    return ok({ isActive: newStatus })
  }, { module: 'users.toggle-active' })
}