import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { ok, withErrorHandler } from '@/lib/api/response'
import { NotFoundError } from '@/lib/errors'

type RouteContext = { params: Promise<{ id: string }> }

// ============================================================
// DELETE /api/salary-config/[id] — Hapus config role
// ============================================================

export async function DELETE(_req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('payroll.manage')
    const { id } = await ctx.params

    const before = await prisma.roleSalaryConfig.findUnique({
      where: { id },
      select: {
        id: true,
        amount: true,
        role: { select: { code: true, name: true } },
        component: { select: { code: true, name: true } },
      },
    })

    if (!before) throw new NotFoundError('Config tidak ditemukan')

    await prisma.roleSalaryConfig.delete({ where: { id } })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'DELETE',
      entity: 'RoleSalaryConfig',
      entityId: id,
      before: {
        roleCode: before.role.code,
        componentCode: before.component.code,
        amount: before.amount,
      },
      module: 'payroll',
      severity: 'WARNING',
      context: auditCtx,
    })

    return ok({ message: 'Config dihapus' })
  }, { module: 'salary-config.delete' })
}