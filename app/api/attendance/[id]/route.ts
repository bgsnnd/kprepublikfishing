import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { correctAttendanceSchema } from '@/lib/validation/attendance'
import { formatZodError } from '@/lib/validation/auth'
import { ok, withErrorHandler, parseJsonBody } from '@/lib/api/response'
import { NotFoundError, ValidationError } from '@/lib/errors'
import {
  calculateStatus,
  calculateWorkDuration,
} from '@/lib/attendance/helpers'
import { getSetting } from '@/lib/settings/queries'

type RouteContext = { params: Promise<{ id: string }> }

// ============================================================
// GET detail
// ============================================================

export async function GET(_req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    await requirePermission('attendance.read')
    const { id } = await ctx.params

    const attendance = await prisma.attendance.findUnique({
      where: { id },
      select: {
        id: true,
        workDate: true,
        checkIn: true,
        checkOut: true,
        method: true,
        status: true,
        lateMinutes: true,
        earlyLeaveMinutes: true,
        workDurationMinutes: true,
        checkInLat: true,
        checkInLng: true,
        checkInDistance: true,
        checkInAccuracy: true,
        checkInSelfieUrl: true,
        checkOutLat: true,
        checkOutLng: true,
        checkOutDistance: true,
        checkOutAccuracy: true,
        checkOutSelfieUrl: true,
        isCorrected: true,
        correctedAt: true,
        correctionNote: true,
        notes: true,
        createdAt: true,
        checkInLocation: { select: { name: true, code: true } },
        user: {
          select: {
            username: true,
            name: true,
            employeeType: { select: { name: true } },
          },
        },
      },
    })

    if (!attendance) throw new NotFoundError('Absensi tidak ditemukan')

    return ok(attendance)
  }, { module: 'attendance.detail' })
}

// ============================================================
// PATCH koreksi — recalculate SEMUA field terkait
// ============================================================

export async function PATCH(req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('attendance.manage')
    const { id } = await ctx.params
    const body = await parseJsonBody(req)

    const parsed = correctAttendanceSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const data = parsed.data

    const before = await prisma.attendance.findUnique({
      where: { id },
      select: {
        id: true,
        checkIn: true,
        checkOut: true,
        status: true,
        lateMinutes: true,
        earlyLeaveMinutes: true,
        workDurationMinutes: true,
        notes: true,
      },
    })

    if (!before) throw new NotFoundError('Absensi tidak ditemukan')

    // ============================================================
    // Nilai baru (fallback ke nilai lama kalau tidak diubah)
    // ============================================================
    const newCheckIn = data.checkIn ? new Date(data.checkIn) : before.checkIn

    const newCheckOut =
      data.checkOut === null
        ? null
        : data.checkOut
          ? new Date(data.checkOut)
          : before.checkOut

    // ============================================================
    // Baca setting standar jam
    // ============================================================
    const [standardCheckIn, standardCheckOut, lateTolerance] =
      await Promise.all([
        getSetting<string>('attendance.standard_check_in'),
        getSetting<string>('attendance.standard_check_out'),
        getSetting<number>('attendance.late_tolerance_minutes'),
      ])

    // ============================================================
    // RECALCULATE status & lateMinutes (SELALU, bukan cuma kalau checkIn berubah)
    // ============================================================
    const { status: calcStatus, lateMinutes } = calculateStatus({
      checkInTime: newCheckIn,
      standardCheckIn: standardCheckIn ?? '08:00',
      lateToleranceMinutes: lateTolerance ?? 15,
    })

    // ============================================================
    // RECALCULATE durasi & earlyLeave
    // ============================================================
    let durationMinutes: number | null = null
    let earlyLeaveMinutes = 0

    if (newCheckOut) {
      const result = calculateWorkDuration({
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        standardCheckOut: standardCheckOut ?? '17:00',
      })
      durationMinutes = result.durationMinutes
      earlyLeaveMinutes = result.earlyLeaveMinutes
    }

    // ============================================================
    // Status final: pakai input user kalau ada, kalau tidak auto
    // ============================================================
    const finalStatus = data.status ?? calcStatus

    // ============================================================
    // Update
    // ============================================================
    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        checkIn: data.checkIn ? newCheckIn : undefined,
        checkOut: data.checkOut !== undefined ? newCheckOut : undefined,
        status: finalStatus,
        lateMinutes,
        earlyLeaveMinutes,
        workDurationMinutes: durationMinutes,
        notes: data.notes || before.notes,
        isCorrected: true,
        correctedAt: new Date(),
        correctedById: session.userId,
        correctionNote: data.correctionNote,
      },
      select: {
        id: true,
        checkIn: true,
        checkOut: true,
        status: true,
        lateMinutes: true,
        earlyLeaveMinutes: true,
        workDurationMinutes: true,
        isCorrected: true,
        correctionNote: true,
      },
    })

    // Audit
    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'UPDATE',
      entity: 'Attendance',
      entityId: id,
      before: {
        checkIn: before.checkIn.toISOString(),
        checkOut: before.checkOut?.toISOString() ?? null,
        status: before.status,
        lateMinutes: before.lateMinutes,
        workDurationMinutes: before.workDurationMinutes,
      },
      after: {
        checkIn: updated.checkIn.toISOString(),
        checkOut: updated.checkOut?.toISOString() ?? null,
        status: updated.status,
        lateMinutes: updated.lateMinutes,
        workDurationMinutes: updated.workDurationMinutes,
      },
      module: 'attendance',
      severity: 'WARNING',
      context: auditCtx,
    })

    return ok(updated)
  }, { module: 'attendance.correct' })
}

// ============================================================
// DELETE
// ============================================================

export async function DELETE(_req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('attendance.manage')
    const { id } = await ctx.params

    const before = await prisma.attendance.findUnique({
      where: { id },
      select: {
        id: true,
        user: { select: { username: true, name: true } },
        workDate: true,
        checkIn: true,
      },
    })

    if (!before) throw new NotFoundError('Absensi tidak ditemukan')

    await prisma.attendance.delete({ where: { id } })

    // Audit
    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'DELETE',
      entity: 'Attendance',
      entityId: id,
      before: {
        username: before.user.username,
        name: before.user.name,
        workDate: before.workDate.toISOString(),
        checkIn: before.checkIn.toISOString(),
      },
      module: 'attendance',
      severity: 'CRITICAL',
      context: auditCtx,
    })

    return ok({ message: 'Absensi dihapus' })
  }, { module: 'attendance.delete' })
}