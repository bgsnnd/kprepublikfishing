import { requireSession } from '@/lib/auth/context'
import { getWorkDate } from '@/lib/attendance/helpers'
import { getTodayShiftsWithAttendance } from '@/lib/attendance/shift-helper'
import { getSetting } from '@/lib/settings/queries'
import { getDefaultLocation } from '@/lib/locations/queries'
import { ok, withErrorHandler } from '@/lib/api/response'

export async function GET() {
  return withErrorHandler(async () => {
    const session = await requireSession()
    const workDate = getWorkDate()

    const [
      shifts,
      enabled,
      requireGps,
      requireSelfie,
      allowOutside,
      defaultLocation,
    ] = await Promise.all([
      getTodayShiftsWithAttendance(session.userId, workDate),
      getSetting<boolean>('attendance.enabled'),
      getSetting<boolean>('attendance.require_gps'),
      getSetting<boolean>('attendance.require_selfie'),
      getSetting<boolean>('attendance.allow_outside_radius'),
      getDefaultLocation(),
    ])

    // Statistik agregat hari ini
    const totalLate = shifts.reduce(
      (sum, s) => sum + (s.attendance?.lateMinutes ?? 0),
      0,
    )

    const totalDuration = shifts.reduce(
      (sum, s) => sum + (s.attendance?.workDurationMinutes ?? 0),
      0,
    )

    const completedCount = shifts.filter(
      (s) => s.attendance?.checkIn && s.attendance?.checkOut,
    ).length

    return ok({
      shifts,
      stats: {
        totalShifts: shifts.length,
        completedShifts: completedCount,
        totalLateMinutes: totalLate,
        totalDurationMinutes: totalDuration,
      },
      config: {
        enabled: enabled ?? false,
        requireGps: requireGps ?? false,
        requireSelfie: requireSelfie ?? false,
        allowOutsideRadius: allowOutside ?? false,
        defaultLocation: defaultLocation
          ? {
              name: defaultLocation.name,
              latitude: defaultLocation.latitude,
              longitude: defaultLocation.longitude,
              radiusMeters: defaultLocation.radiusMeters,
            }
          : null,
      },
    })
  }, { module: 'attendance.today' })
}