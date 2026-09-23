import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { updateShiftSchema } from '@/lib/validation/shift'
import { formatZodError } from '@/lib/validation/auth'
import { ok, withErrorHandler, parseJsonBody } from '@/lib/api/response'
import { NotFoundError, ValidationError } from '@/lib/errors'

type RouteContext = { params: Promise<{ id: string }> }

// ============================================================
// Helper: WIB "HH:mm" → UTC Date (pakai shiftDate dari DB)
// ============================================================

function toDateUTC(
  shiftDate: Date,
  timeStr: string,
): Date {
  const [hours, minutes] = timeStr.split(':').map(Number)

  if (isNaN(hours) || isNaN(minutes)) {
    throw new ValidationError('Format jam tidak valid', {
      startTime: ['Format harus "HH:mm" (contoh: 15:00)'],
    })
  }

  const [year, month, day] = [
    shiftDate.getUTCFullYear(),
    shiftDate.getUTCMonth(),
    shiftDate.getUTCDate(),
  ]

  return new Date(Date.UTC(year, month, day, hours - 7, minutes, 0, 0))
}

// ============================================================
// GET /api/shifts/[id]
// ============================================================

export async function GET(_req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    await requirePermission('schedule.read')
    const { id } = await ctx.params

    const shift = await prisma.shift.findUnique({
      where: { id },
      select: {
        id: true,
        shiftDate: true,
        startTime: true,
        endTime: true,
        position: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            username: true,
            name: true,
            employeeType: { select: { name: true } },
          },
        },
      },
    })

    if (!shift) throw new NotFoundError('Shift tidak ditemukan')

    return ok(shift)
  }, { module: 'shifts.detail' })
}

// ============================================================
// PATCH /api/shifts/[id]
// ============================================================

export async function PATCH(req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('schedule.manage')
    const { id } = await ctx.params
    const body = await parseJsonBody(req)

    const parsed = updateShiftSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const data = parsed.data

    const before = await prisma.shift.findUnique({
      where: { id },
      select: {
        id: true,
        shiftDate: true,
        startTime: true,
        endTime: true,
        position: true,
        status: true,
        notes: true,
        user: { select: { username: true, name: true } },
      },
    })

    if (!before) throw new NotFoundError('Shift tidak ditemukan')

    // ✅ Konversi "HH:mm" WIB → UTC (pakai shiftDate dari DB)
    const startTime = toDateUTC(before.shiftDate, data.startTime)
    const endTime = toDateUTC(before.shiftDate, data.endTime)

    const updated = await prisma.shift.update({
      where: { id },
      data: {
        startTime,
        endTime,
        position: data.position || null,
        status: data.status ?? before.status,
        notes: data.notes || null,
        updatedById: session.userId,
      },
      select: {
        id: true,
        shiftDate: true,
        startTime: true,
        endTime: true,
        position: true,
        status: true,
        notes: true,
      },
    })

    // Audit
    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'UPDATE',
      entity: 'Shift',
      entityId: id,
      before: {
        startTime: before.startTime.toISOString(),
        endTime: before.endTime.toISOString(),
        position: before.position,
        status: before.status,
      },
      after: {
        startTime: updated.startTime.toISOString(),
        endTime: updated.endTime.toISOString(),
        position: updated.position,
        status: updated.status,
      },
      module: 'schedule',
      severity: 'INFO',
      context: auditCtx,
    })

    return ok(updated)
  }, { module: 'shifts.update' })
}

// ============================================================
// DELETE /api/shifts/[id]
// ============================================================

export async function DELETE(_req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('schedule.manage')
    const { id } = await ctx.params

    const before = await prisma.shift.findUnique({
      where: { id },
      select: {
        id: true,
        shiftDate: true,
        startTime: true,
        endTime: true,
        status: true,
        user: { select: { username: true, name: true } },
      },
    })

    if (!before) throw new NotFoundError('Shift tidak ditemukan')

    await prisma.shift.delete({ where: { id } })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'DELETE',
      entity: 'Shift',
      entityId: id,
      before: {
        username: before.user.username,
        name: before.user.name,
        shiftDate: before.shiftDate.toISOString(),
        startTime: before.startTime.toISOString(),
        endTime: before.endTime.toISOString(),
        status: before.status,
      },
      module: 'schedule',
      severity: 'WARNING',
      context: auditCtx,
    })

    return ok({ message: 'Shift dihapus' })
  }, { module: 'shifts.delete' })
}