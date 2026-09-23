import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { updateSalaryComponentSchema } from '@/lib/validation/salary-component'
import { getSalaryComponentDetail } from '@/lib/salary-components/queries'
import { formatZodError } from '@/lib/validation/auth'
import { ok, withErrorHandler, parseJsonBody } from '@/lib/api/response'
import {
  BadRequestError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors'

type RouteContext = { params: Promise<{ id: string }> }

// ============================================================
// GET
// ============================================================

export async function GET(_req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    await requirePermission('payroll.read')
    const { id } = await ctx.params

    const component = await getSalaryComponentDetail(id)
    if (!component) throw new NotFoundError('Komponen tidak ditemukan')

    return ok(component)
  }, { module: 'salary-components.detail' })
}

// ============================================================
// PATCH
// ============================================================

export async function PATCH(req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('payroll.manage')
    const { id } = await ctx.params
    const body = await parseJsonBody(req)

    const parsed = updateSalaryComponentSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const before = await prisma.salaryComponent.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        calcMethod: true,
        defaultAmount: true,
        sortOrder: true,
        isTaxable: true,
        isSystem: true,
        isActive: true,
      },
    })

    if (!before) throw new NotFoundError('Komponen tidak ditemukan')

    const data = parsed.data

    const updated = await prisma.salaryComponent.update({
      where: { id },
      data: {
        name: data.name ?? before.name,
        description: data.description ?? before.description,
        calcMethod: data.calcMethod ?? before.calcMethod,
        defaultAmount:
          data.defaultAmount !== undefined
            ? data.defaultAmount
            : before.defaultAmount,
        sortOrder: data.sortOrder ?? before.sortOrder,
        isTaxable: data.isTaxable ?? before.isTaxable,
        isActive: data.isActive ?? before.isActive,
        updatedById: session.userId,
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        calcMethod: true,
        isActive: true,
      },
    })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'UPDATE',
      entity: 'SalaryComponent',
      entityId: id,
      before: {
        name: before.name,
        calcMethod: before.calcMethod,
        defaultAmount: before.defaultAmount,
        isActive: before.isActive,
      },
      after: {
        name: updated.name,
        calcMethod: updated.calcMethod,
        isActive: updated.isActive,
      },
      module: 'payroll',
      severity: 'INFO',
      context: auditCtx,
    })

    return ok(updated)
  }, { module: 'salary-components.update' })
}

// ============================================================
// DELETE
// ============================================================

export async function DELETE(_req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('payroll.manage')
    const { id } = await ctx.params

    const before = await prisma.salaryComponent.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        isSystem: true,
      },
    })

    if (!before) throw new NotFoundError('Komponen tidak ditemukan')

    if (before.isSystem) {
      throw new BadRequestError(
        'Komponen sistem tidak bisa dihapus. Nonaktifkan saja.',
      )
    }

    // Cek apakah ada config yang pakai
    const [roleConfigs, userConfigs, payrollItems] = await Promise.all([
      prisma.roleSalaryConfig.count({ where: { componentId: id } }),
      prisma.userSalaryConfig.count({ where: { componentId: id } }),
      prisma.payrollItem.count({ where: { componentId: id } }),
    ])

    if (roleConfigs > 0 || userConfigs > 0 || payrollItems > 0) {
      throw new BadRequestError(
        `Komponen masih dipakai di ${roleConfigs} role config, ${userConfigs} user config, ${payrollItems} payroll item. Nonaktifkan saja.`,
      )
    }

    await prisma.salaryComponent.delete({ where: { id } })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'DELETE',
      entity: 'SalaryComponent',
      entityId: id,
      before: {
        code: before.code,
        name: before.name,
      },
      module: 'payroll',
      severity: 'WARNING',
      context: auditCtx,
    })

    return ok({ message: 'Komponen dihapus' })
  }, { module: 'salary-components.delete' })
}