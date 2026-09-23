import type { AttendanceStatus } from '@/lib/validation/attendance'

// ============================================================
// TIMEZONE
// ============================================================

export const APP_TIMEZONE = process.env.TZ ?? 'Asia/Jakarta'

export function getLocalTimeParts(date: Date = new Date()): {
  hours: number
  minutes: number
  totalMinutes: number
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const hours = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minutes = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)

  return { hours, minutes, totalMinutes: hours * 60 + minutes }
}

// ============================================================
// KONVERSI Date → "HH:mm" WIB
// ============================================================

export function dateToTimeString(date: Date): string {
  const { hours, minutes } = getLocalTimeParts(date)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function normalizeTime(time: Date | string): string {
  if (time instanceof Date) return dateToTimeString(time)
  return time
}

// ============================================================
// STATUS
// ============================================================

/**
 * Hitung status absensi berdasarkan jam masuk & setting.
 *
 * ✅ standardCheckIn bisa Date (dari shift) ATAU string "HH:mm" (dari setting).
 * ✅ Handle cross-day (shift malam).
 */
export function calculateStatus(params: {
  checkInTime: Date
  standardCheckIn: Date | string
  lateToleranceMinutes: number
}): { status: AttendanceStatus; lateMinutes: number } {
  const { checkInTime, standardCheckIn, lateToleranceMinutes } = params

  // Normalisasi: Date → "HH:mm" WIB, string tetap
  const stdTimeStr = normalizeTime(standardCheckIn)

  const [stdHour, stdMin] = stdTimeStr.split(':').map(Number)
  const stdTotalMinutes = stdHour * 60 + stdMin

  const { totalMinutes: checkInTotalMinutes } = getLocalTimeParts(checkInTime)

  // ✅ Hitung selisih
  let diffMinutes = checkInTotalMinutes - stdTotalMinutes

  // ✅ Handle cross-day:
  // Kalau selisih > 12 jam (720 menit), kemungkinan absen "besoknya"
  // Contoh: shift 23:00, absen 22:55 → diff = -5 (lebih awal, OK)
  // Contoh: shift 23:00, absen 00:30 (besoknya) → diff = 90 (telat 30 menit)
  //   Tapi kalau dihitung mentah: 30 - 1380 = -1350 → harusnya +90
  if (diffMinutes < -720) {
    // Absen "besoknya" dari shift
    diffMinutes += 24 * 60
  } else if (diffMinutes > 720) {
    // Absen "kemarinnya" dari shift
    diffMinutes -= 24 * 60
  }

  if (diffMinutes <= lateToleranceMinutes) {
    return {
      status: 'HADIR',
      lateMinutes: diffMinutes > 0 ? diffMinutes : 0,
    }
  }

  return {
    status: 'TERLAMBAT',
    lateMinutes: diffMinutes,
  }
}

// ============================================================
// DURASI
// ============================================================

/**
 * Hitung durasi kerja & early leave (pulang awal).
 *
 * ✅ standardCheckOut bisa Date (dari shift) ATAU string "HH:mm" (dari setting).
 * ✅ Handle cross-day (shift malam).
 */
export function calculateWorkDuration(params: {
  checkIn: Date
  checkOut: Date
  standardCheckOut: Date | string
}): { durationMinutes: number; earlyLeaveMinutes: number } {
  const { checkIn, checkOut, standardCheckOut } = params

  // ============================================================
  // 1. Hitung durasi kerja (handle cross-day)
  // ============================================================
  let durationMs = checkOut.getTime() - checkIn.getTime()

  // ✅ Kalau negatif, berarti lewat tengah malam → tambah 1 hari
  if (durationMs < 0) {
    durationMs += 24 * 60 * 60 * 1000
  }

  // ✅ Kalau durasi > 16 jam, kemungkinan salah hari → kurangi 1 hari
  // (shift normal gak mungkin > 16 jam)
  if (durationMs > 16 * 60 * 60 * 1000) {
    durationMs -= 24 * 60 * 60 * 1000
  }

  const durationMinutes = Math.max(0, Math.floor(durationMs / 60000))

  // ============================================================
  // 2. Hitung early leave (handle cross-day)
  // ============================================================
  const stdTimeStr = normalizeTime(standardCheckOut)
  const [stdHour, stdMin] = stdTimeStr.split(':').map(Number)
  const stdCheckOutMinutes = stdHour * 60 + stdMin

  const { totalMinutes: checkInMinutes } = getLocalTimeParts(checkIn)
  const { totalMinutes: checkOutMinutes } = getLocalTimeParts(checkOut)

  // ✅ Handle cross-day untuk std check-out
  // Contoh: shift 23:00-06:00
  //   check-in  = 23:00 (1380 menit)
  //   check-out = 06:00 (360 menit) → std lebih kecil dari check-in → cross-day
  let adjustedStdCheckOut = stdCheckOutMinutes
  if (adjustedStdCheckOut < checkInMinutes) {
    adjustedStdCheckOut += 24 * 60
  }

  // ✅ Handle cross-day untuk check-out
  let adjustedCheckOut = checkOutMinutes
  if (adjustedCheckOut < checkInMinutes) {
    adjustedCheckOut += 24 * 60
  }

  const diffMinutes = adjustedStdCheckOut - adjustedCheckOut
  const earlyLeaveMinutes = diffMinutes > 0 ? diffMinutes : 0

  return { durationMinutes, earlyLeaveMinutes }
}

// ============================================================
// FORMAT
// ============================================================

export function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return '—'
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}j ${m}m` : `${h}j`
}

export function formatTime(date: Date | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleTimeString('id-ID', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatDateLong(date: Date | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('id-ID', {
    timeZone: APP_TIMEZONE,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// ============================================================
// WORK DATE
// ============================================================

export function getWorkDate(date: Date = new Date()): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const dateStr = formatter.format(date)
  const [year, month, day] = dateStr.split('-').map(Number)

  return new Date(Date.UTC(year, month - 1, day))
}

// ============================================================
// SETTING PARSER
// ============================================================

export function parseTimeToMinutes(time: string): number {
  const [hour, min] = time.split(':').map(Number)
  return hour * 60 + min
}

export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}