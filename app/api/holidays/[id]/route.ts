import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { updateHolidaySchema } from '@/lib/validation/holiday'
import { formatZodError } from '@/lib/validation/auth'
import { ok, withErrorHandler, parseJsonBody } from '@/lib/api/response'
import { NotFoundError, ValidationError } from '@/lib/errors'

type RouteContext = { params: Promise<{ id: string }> }

// ============================================================
// GET /api/holidays/[id]
// ============================================================

export async function GET(_req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    await requirePermission('schedule.read')
    const { id } = await ctx.params

    const holiday = await prisma.holiday.findUnique({
      where: { id },
      select: {
        id: true,
        date: true,
        name: true,
        type: true,
        isActive: true,
        createdAt: true,
      },
    })

    if (!holiday) throw new NotFoundError('Libur tidak ditemukan')
    return ok(holiday)
  }, { module: 'holidays.detail' })
}

// ============================================================
// PATCH /api/holidays/[id]
// ============================================================

export async function PATCH(req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('schedule.manage')
    const { id } = await ctx.params
    const body = await parseJsonBody(req)

    const parsed = updateHolidaySchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const data = parsed.data

    const before = await prisma.holiday.findUnique({
      where: { id },
      select: { name: true, type: true, isActive: true },
    })

    if (!before) throw new NotFoundError('Libur tidak ditemukan')

    const updated = await prisma.holiday.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type ?? before.type,
        isActive: data.isActive ?? before.isActive,
        updatedById: session.userId,
      },
      select: {
        id: true,
        date: true,
        name: true,
        type: true,
        isActive: true,
      },
    })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'UPDATE',
      entity: 'Holiday',
      entityId: id,
      before,
      after: {
        name: updated.name,
        type: updated.type,
        isActive: updated.isActive,
      },
      module: 'schedule',
      severity: 'INFO',
      context: auditCtx,
    })

    return ok(updated)
  }, { module: 'holidays.update' })
}

// ============================================================
// DELETE /api/holidays/[id]
// ============================================================

export async function DELETE(_req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('schedule.manage')
    const { id } = await ctx.params

    const before = await prisma.holiday.findUnique({
      where: { id },
      select: { date: true, name: true, type: true },
    })

    if (!before) throw new NotFoundError('Libur tidak ditemukan')

    await prisma.holiday.delete({ where: { id } })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'DELETE',
      entity: 'Holiday',
      entityId: id,
      before: {
        date: before.date.toISOString(),
        name: before.name,
        type: before.type,
      },
      module: 'schedule',
      severity: 'WARNING',
      context: auditCtx,
    })

    return ok({ message: 'Libur dihapus' })
  }, { module: 'holidays.delete' })
}