import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { approvePayrollSchema } from '@/lib/validation/payroll'
import { getPayrollDetail } from '@/lib/payroll/queries'
import { ok, withErrorHandler, parseJsonBody } from '@/lib/api/response'
import {
  BadRequestError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors'
import { formatZodError } from '@/lib/validation/auth'

type RouteContext = { params: Promise<{ id: string }> }

// ============================================================
// GET /api/payroll/[id]
// ============================================================

export async function GET(_req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    await requirePermission('payroll.read')
    const { id } = await ctx.params

    const payroll = await getPayrollDetail(id)
    if (!payroll) throw new NotFoundError('Payroll tidak ditemukan')

    return ok(payroll)
  }, { module: 'payroll.detail' })
}

// ============================================================
// PATCH /api/payroll/[id] — approve / pay
// ============================================================

export async function PATCH(req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('payroll.manage')
    const { id } = await ctx.params
    const body = await parseJsonBody(req)

    const parsed = approvePayrollSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const before = await prisma.payroll.findUnique({
      where: { id },
      select: { id: true, status: true, notes: true },
    })

    if (!before) throw new NotFoundError('Payroll tidak ditemukan')

    if (before.status === 'CANCELLED') {
      throw new BadRequestError('Payroll sudah dibatalkan')
    }

    if (before.status === 'PAID') {
      throw new BadRequestError('Payroll sudah dibayar')
    }

    // Approve
    const updated = await prisma.payroll.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: session.userId,
        approvedAt: new Date(),
        notes: parsed.data.notes || before.notes,
      },
      select: {
        id: true,
        status: true,
        approvedAt: true,
      },
    })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'UPDATE',
      entity: 'Payroll',
      entityId: id,
      before: { status: before.status },
      after: { status: 'APPROVED' },
      module: 'payroll',
      severity: 'INFO',
      context: auditCtx,
    })

    return ok(updated)
  }, { module: 'payroll.approve' })
}

// ============================================================
// DELETE /api/payroll/[id]
// ============================================================

export async function DELETE(_req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('payroll.manage')
    const { id } = await ctx.params

    const before = await prisma.payroll.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        user: { select: { username: true, name: true } },
        periodMonth: true,
        periodYear: true,
        netSalary: true,
      },
    })

    if (!before) throw new NotFoundError('Payroll tidak ditemukan')

    if (before.status === 'PAID') {
      throw new BadRequestError('Payroll yang sudah dibayar tidak bisa dihapus')
    }

    await prisma.payroll.delete({ where: { id } })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'DELETE',
      entity: 'Payroll',
      entityId: id,
      before: {
        username: before.user.username,
        name: before.user.name,
        period: `${before.periodMonth}/${before.periodYear}`,
        netSalary: before.netSalary,
        status: before.status,
      },
      module: 'payroll',
      severity: 'WARNING',
      context: auditCtx,
    })

    return ok({ message: 'Payroll dihapus' })
  }, { module: 'payroll.delete' })
}