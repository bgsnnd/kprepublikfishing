import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { ok, withErrorHandler } from '@/lib/api/response'
import { NotFoundError } from '@/lib/errors'

type RouteContext = { params: Promise<{ id: string }> }

// ============================================================
// DELETE /api/salary-config/users/[id] — Hapus config user
// ============================================================

export async function DELETE(_req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('payroll.manage')
    const { id } = await ctx.params

    const before = await prisma.userSalaryConfig.findUnique({
      where: { id },
      select: {
        id: true,
        amount: true,
        user: { select: { username: true, name: true } },
        component: { select: { code: true, name: true } },
      },
    })

    if (!before) throw new NotFoundError('Config tidak ditemukan')

    await prisma.userSalaryConfig.delete({ where: { id } })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'DELETE',
      entity: 'UserSalaryConfig',
      entityId: id,
      before: {
        username: before.user.username,
        componentCode: before.component.code,
        amount: before.amount,
      },
      module: 'payroll',
      severity: 'WARNING',
      context: auditCtx,
    })

    return ok({ message: 'Override dihapus' })
  }, { module: 'salary-config.user-delete' })
}