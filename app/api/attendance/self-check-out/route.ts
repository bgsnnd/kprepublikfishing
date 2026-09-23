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
    const session = await requirePermission('attendance.self')
    const body = await parseJsonBody(req)

    const parsed = checkOutSchema.safeParse({
      ...(body as object),
      username: session.username,
    })

    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const data = parsed.data

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, username: true },
    })

    if (!user) throw new BadRequestError('User tidak ditemukan')

    // ============================================================
    // 1. Cari attendance by ID
    // ============================================================
    const attendance = await prisma.attendance.findUnique({
      where: { id: data.attendanceId },
      select: {
        id: true,
        userId: true,
        checkIn: true,
        checkOut: true,
        shift: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    })

    if (!attendance) {
      throw new NotFoundError('Absensi tidak ditemukan')
    }

    if (attendance.userId !== user.id) {
      throw new BadRequestError('Bukan absensi Anda')
    }

    if (attendance.checkOut) {
      throw new BadRequestError(
        `Anda sudah check-out pada ${attendance.checkOut.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}`,
      )
    }

    // ============================================================
    // 2. Baca setting
    // ============================================================
    const [requireGps, accuracyMax, allowOutside, requireSelfie] =
      await Promise.all([
        getSetting<boolean>('attendance.require_gps'),
        getSetting<number>('attendance.gps_accuracy_max_meters'),
        getSetting<boolean>('attendance.allow_outside_radius'),
        getSetting<boolean>('attendance.require_selfie'),
      ])

    if (
      requireGps &&
      (data.latitude === undefined || data.longitude === undefined)
    ) {
      throw new BadRequestError('GPS wajib aktif untuk absen')
    }

    if (requireSelfie && !data.selfieUrl) {
      throw new BadRequestError('Selfie wajib diambil sebelum absen')
    }

    // ============================================================
    // 3. Cek radius
    // ============================================================
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
              `Anda berada ${Math.round(check.distance)}m dari ${location.name} (maksimal ${location.radiusMeters}m) dan akurasi GPS terlalu rendah (±${Math.round(data.accuracy)}m).`,
            )
          }

          throw new BadRequestError(
            `Anda berada ${Math.round(check.distance)}m dari ${location.name}. Maksimal ${location.radiusMeters}m.`,
          )
        }

        distance = check.distance
      }
    }

    // ============================================================
    // 4. Hitung durasi pakai shift.endTime
    // ============================================================
    const now = new Date()
    const { durationMinutes, earlyLeaveMinutes } = calculateWorkDuration({
      checkIn: attendance.checkIn,
      checkOut: now,
      standardCheckOut: attendance.shift.endTime, // ← dari shift
    })

    // ============================================================
    // 5. Update by ID
    // ============================================================
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
        self: true,
        username: user.username,
        shiftId: attendance.shift.id,
        checkOut: now.toISOString(),
        workDurationMinutes: durationMinutes,
        earlyLeaveMinutes,
        hasSelfie: !!data.selfieUrl,
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
  }, { module: 'attendance.self-check-out' })
}