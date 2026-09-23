import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { checkOutSchema } from '@/lib/validation/attendance'
import { formatZodError } from '@/lib/validation/auth'
import { calculateWorkDuration } from '@/lib/attendance/helpers'
import { getSetting } from '@/lib/settings/queries'
import { getDefaultLocation } from '@/lib/locations/queries'
import { isWithinRadius } from '@/lib/geo/distance'
import { ok, withErrorHandler, parseJsonBody } from '@/lib/api/response'
import {
  BadRequestError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors'

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await requirePermission('attendance.manage')
    const body = await parseJsonBody(req)

    const parsed = checkOutSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const data = parsed.data

    // Cari attendance by ID
    const attendance = await prisma.attendance.findUnique({
      where: { id: data.attendanceId },
      select: {
        id: true,
        userId: true,
        checkIn: true,
        checkOut: true,
        shift: {
          select: { id: true, startTime: true, endTime: true },
        },
        user: { select: { name: true, username: true } },
      },
    })

    if (!attendance) {
      throw new NotFoundError('Absensi tidak ditemukan')
    }

    if (attendance.checkOut) {
      throw new BadRequestError(
        `${attendance.user.name} sudah check-out pada ${attendance.checkOut.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
      )
    }

    // Baca setting
    const [requireGps, accuracyMax, allowOutside] = await Promise.all([
      getSetting<boolean>('attendance.require_gps'),
      getSetting<number>('attendance.gps_accuracy_max_meters'),
      getSetting<boolean>('attendance.allow_outside_radius'),
    ])

    if (
      requireGps &&
      (data.latitude === undefined || data.longitude === undefined)
    ) {
      throw new BadRequestError('GPS wajib aktif untuk absen')
    }

    // Cek radius
    let distance: number | null = null

    if (
      !allowOutside &&
      data.latitude !== undefined &&
      data.longitude !== undefined
    ) {
      const location = await getDefaultLocation()

      if (location) {
        const check = isWithinRadius(
          data.latitude,
          data.longitude,
          location.latitude,
          location.longitude,
          location.radiusMeters,
        )

        if (!check.within) {
          if (
            requireGps &&
            data.accuracy !== undefined &&
            accuracyMax !== null &&
            data.accuracy > accuracyMax
          ) {
            throw new BadRequestError(
              `Berada ${Math.round(check.distance)}m dari ${location.name}, akurasi GPS terlalu rendah.`,
            )
          }
          throw new BadRequestError(
            `Berada ${Math.round(check.distance)}m dari ${location.name}. Maks ${location.radiusMeters}m.`,
          )
        }

        distance = check.distance
      }
    }

    // Hitung durasi
    const now = new Date()
    const { durationMinutes, earlyLeaveMinutes } = calculateWorkDuration({
      checkIn: attendance.checkIn,
      checkOut: now,
      standardCheckOut: attendance.shift.endTime,
    })

    // Update
    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: now,
        workDurationMinutes: durationMinutes,
        earlyLeaveMinutes,
        checkOutLat: data.latitude ?? null,
        checkOutLng: data.longitude ?? null,
        checkOutDistance: distance,
        checkOutAccuracy: data.accuracy ?? null,
        checkOutSelfieUrl: data.selfieUrl || null,
      },
      select: {
        id: true,
        shiftId: true,
        checkIn: true,
        checkOut: true,
        workDurationMinutes: true,
        earlyLeaveMinutes: true,
      },
    })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'UPDATE',
      entity: 'Attendance',
      entityId: attendance.id,
      after: {
        username: attendance.user.username,
        name: attendance.user.name,
        shiftId: attendance.shift.id,
        checkOut: now.toISOString(),
        workDurationMinutes: durationMinutes,
        earlyLeaveMinutes,
        distance: distance ? Math.round(distance) : null,
      },
      module: 'attendance',
      severity: 'INFO',
      context: auditCtx,
    })

    return ok({
      id: updated.id,
      shiftId: updated.shiftId,
      checkIn: updated.checkIn,
      checkOut: updated.checkOut,
      workDurationMinutes: updated.workDurationMinutes,
      earlyLeaveMinutes: updated.earlyLeaveMinutes,
    })
  }, { module: 'attendance.check-out' })
}