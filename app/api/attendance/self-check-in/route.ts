import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { checkInSchema } from '@/lib/validation/attendance'
import { formatZodError } from '@/lib/validation/auth'
import { calculateStatus, getWorkDate } from '@/lib/attendance/helpers'
import { getShiftById } from '@/lib/attendance/shift-helper'
import { getSetting } from '@/lib/settings/queries'
import { getDefaultLocation } from '@/lib/locations/queries'
import { isWithinRadius } from '@/lib/geo/distance'
import { created, withErrorHandler, parseJsonBody } from '@/lib/api/response'
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors'

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await requirePermission('attendance.self')
    const body = await parseJsonBody(req)

    const parsed = checkInSchema.safeParse({
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
      select: { id: true, name: true, username: true, isActive: true },
    })

    if (!user) throw new BadRequestError('User tidak ditemukan')
    if (!user.isActive) throw new BadRequestError('Akun Anda tidak aktif')

    // ============================================================
    // 1. Validasi shift
    // ============================================================
    const shift = await getShiftById(data.shiftId)

    if (!shift) throw new NotFoundError('Shift tidak ditemukan')
    if (shift.userId !== user.id) {
      throw new BadRequestError('Shift bukan milik Anda')
    }
    if (shift.status === 'CANCELLED') {
      throw new BadRequestError('Shift sudah dibatalkan')
    }

    // ============================================================
    // 2. Baca setting (TANPA blockMinutes)
    // ============================================================
    const [
      enabled,
      requireGps,
      accuracyMax,
      allowOutside,
      lateTolerance,
      requireSelfie,
    ] = await Promise.all([
      getSetting<boolean>('attendance.enabled'),
      getSetting<boolean>('attendance.require_gps'),
      getSetting<number>('attendance.gps_accuracy_max_meters'),
      getSetting<boolean>('attendance.allow_outside_radius'),
      getSetting<number>('attendance.late_tolerance_minutes'),
      getSetting<boolean>('attendance.require_selfie'),
    ])

    if (!enabled) {
      throw new BadRequestError('Modul absensi sedang dinonaktifkan')
    }

    // Cek GPS
    if (
      requireGps &&
      (data.latitude === undefined || data.longitude === undefined)
    ) {
      throw new BadRequestError('GPS wajib aktif untuk absen')
    }

    // Cek selfie
    if (requireSelfie && !data.selfieUrl) {
      throw new BadRequestError('Selfie wajib diambil sebelum absen')
    }

    // ============================================================
    // 3. Cek radius
    // ============================================================
    let distance: number | null = null
    let locationId: string | null = null

    if (
      !allowOutside &&
      data.latitude !== undefined &&
      data.longitude !== undefined
    ) {
      const location = await getDefaultLocation()

      if (!location) {
        throw new BadRequestError(
          'Lokasi default belum diatur. Hubungi admin.',
        )
      }

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
      locationId = location.id
    }

    // ============================================================
    // 4. Cek duplikat — per shift (BUKAN per hari)
    // ============================================================
    const existing = await prisma.attendance.findUnique({
      where: {
        userId_shiftId: { userId: user.id, shiftId: shift.id },
      },
      select: { id: true, checkIn: true },
    })

    if (existing) {
      throw new ConflictError(
        `Anda sudah check-in di shift ini pada ${existing.checkIn.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}`,
      )
    }

    // ❌ BLOKIR blockMinutes DIHAPUS TOTAL
    // Alasan: multi-shift, absen di shift beda itu NORMAL

    // ============================================================
    // 5. Hitung status pakai shift.startTime
    // ============================================================
    const workDate = getWorkDate()
    const now = new Date()

    const { status, lateMinutes } = calculateStatus({
      checkInTime: now,
      standardCheckIn: shift.startTime,
      lateToleranceMinutes: lateTolerance ?? 15,
    })

    // ============================================================
    // 6. Simpan
    // ============================================================
    const attendance = await prisma.attendance.create({
      data: {
        userId: user.id,
        shiftId: shift.id,
        workDate,
        checkIn: now,
        method: 'SELF',
        status,
        lateMinutes,
        checkInLat: data.latitude ?? null,
        checkInLng: data.longitude ?? null,
        checkInLocationId: locationId,
        checkInDistance: distance,
        checkInAccuracy: data.accuracy ?? null,
        checkInSelfieUrl: data.selfieUrl || null,
        createdById: session.userId,
      },
      select: {
        id: true,
        shiftId: true,
        checkIn: true,
        status: true,
        lateMinutes: true,
      },
    })

    // Audit
    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'CREATE',
      entity: 'Attendance',
      entityId: attendance.id,
      after: {
        self: true,
        username: user.username,
        shiftId: shift.id,
        checkIn: attendance.checkIn.toISOString(),
        status: attendance.status,
        lateMinutes: attendance.lateMinutes,
        distance: distance ? Math.round(distance) : null,
        hasSelfie: !!data.selfieUrl,
      },
      module: 'attendance',
      severity: lateMinutes > 0 ? 'WARNING' : 'INFO',
      context: auditCtx,
    })

    return created({
      id: attendance.id,
      shiftId: attendance.shiftId,
      checkIn: attendance.checkIn,
      status: attendance.status,
      lateMinutes: attendance.lateMinutes,
      distance: distance ? Math.round(distance) : null,
    })
  }, { module: 'attendance.self-check-in' })
}