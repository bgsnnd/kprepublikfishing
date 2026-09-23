import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { checkInSchema } from '@/lib/validation/attendance'
import { formatZodError } from '@/lib/validation/auth'
import { calculateStatus, getWorkDate } from '@/lib/attendance/helpers'
import { getShiftById, formatTimeWIB } from '@/lib/attendance/shift-helper'
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
    const session = await requirePermission('attendance.manage')
    const body = await parseJsonBody(req)

    const parsed = checkInSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const data = parsed.data

    // Cari user
    const user = await prisma.user.findUnique({
      where: { username: data.username! },
      select: { id: true, name: true, username: true, isActive: true },
    })

    if (!user) throw new NotFoundError('User tidak ditemukan')
    if (!user.isActive) throw new BadRequestError('User tidak aktif')

    // Validasi shift
    const shift = await getShiftById(data.shiftId)
    if (!shift) throw new NotFoundError('Shift tidak ditemukan')
    if (shift.userId !== user.id) {
      throw new BadRequestError('Shift bukan milik user ini')
    }
    if (shift.status === 'CANCELLED') {
      throw new BadRequestError('Shift sudah dibatalkan')
    }

    // Baca setting
    const [
      enabled,
      requireGps,
      accuracyMax,
      allowOutside,
      blockMinutes,
      lateTolerance,
    ] = await Promise.all([
      getSetting<boolean>('attendance.enabled'),
      getSetting<boolean>('attendance.require_gps'),
      getSetting<number>('attendance.gps_accuracy_max_meters'),
      getSetting<boolean>('attendance.allow_outside_radius'),
      getSetting<number>('attendance.duplicate_checkin_block_minutes'),
      getSetting<number>('attendance.late_tolerance_minutes'),
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

    // Cek radius
    let distance: number | null = null
    let locationId: string | null = null
    let withinRadius = false

    if (
      !allowOutside &&
      data.latitude !== undefined &&
      data.longitude !== undefined
    ) {
      const location = await getDefaultLocation()

      if (!location) {
        throw new BadRequestError('Lokasi default belum diatur. Hubungi admin.')
      }

      const check = isWithinRadius(
        data.latitude,
        data.longitude,
        location.latitude,
        location.longitude,
        location.radiusMeters,
      )

      withinRadius = check.within
      distance = check.distance
      locationId = location.id

      if (!check.within) {
        if (
          requireGps &&
          data.accuracy !== undefined &&
          accuracyMax !== null &&
          data.accuracy > accuracyMax
        ) {
          throw new BadRequestError(
            `Anda berada ${Math.round(check.distance)}m dari ${location.name} (maksimal ${location.radiusMeters}m) dan akurasi GPS terlalu rendah (±${Math.round(data.accuracy)}m, maksimal ${accuracyMax}m). Pastikan GPS aktif dan presisi.`,
          )
        }

        throw new BadRequestError(
          `Anda berada ${Math.round(check.distance)}m dari ${location.name}. Maksimal ${location.radiusMeters}m.`,
        )
      }
    }

    // ============================================================
    // Cek duplikat — pakai userId_shiftId
    // ============================================================
    const existing = await prisma.attendance.findUnique({
      where: {
        userId_shiftId: { userId: user.id, shiftId: shift.id },
      },
      select: { id: true, checkIn: true },
    })

    if (existing) {
      throw new ConflictError(
        `${user.name} sudah check-in di shift ini pada ${existing.checkIn.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
      )
    }

    // Cek blokir absen ulang
    if (blockMinutes && blockMinutes > 0) {
      const blockTime = new Date(Date.now() - blockMinutes * 60 * 1000)
      const recent = await prisma.attendance.findFirst({
        where: {
          userId: user.id,
          checkIn: { gte: blockTime },
        },
        select: { id: true },
      })

      if (recent) {
        throw new ConflictError(
          `Sudah absen dalam ${blockMinutes} menit terakhir`,
        )
      }
    }

    // ============================================================
    // Hitung status pakai shift.startTime
    // ============================================================
    const workDate = getWorkDate()
    const now = new Date()

    const { status, lateMinutes } = calculateStatus({
      checkInTime: now,
      standardCheckIn: formatTimeWIB(shift.startTime), // ← konversi Date → "HH:mm"
      lateToleranceMinutes: lateTolerance ?? 15,
    })

    // Simpan
    const attendance = await prisma.attendance.create({
      data: {
        userId: user.id,
        shiftId: shift.id, // ← WAJIB
        workDate,
        checkIn: now,
        method: data.method,
        status,
        lateMinutes,
        checkInLat: data.latitude ?? null,
        checkInLng: data.longitude ?? null,
        checkInLocationId: locationId,
        checkInDistance: distance,
        checkInAccuracy: data.accuracy ?? null,
        checkInSelfieUrl: data.selfieUrl || null,
        notes: data.notes || null,
        createdById: session.userId,
      },
      select: {
        id: true,
        shiftId: true,
        workDate: true,
        checkIn: true,
        status: true,
        lateMinutes: true,
      },
    })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'CREATE',
      entity: 'Attendance',
      entityId: attendance.id,
      after: {
        username: user.username,
        name: user.name,
        shiftId: shift.id,
        checkIn: attendance.checkIn.toISOString(),
        status: attendance.status,
        lateMinutes: attendance.lateMinutes,
        distance: distance ? Math.round(distance) : null,
        accuracy: data.accuracy ?? null,
        withinRadius,
        method: data.method,
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
  }, { module: 'attendance.check-in' })
}