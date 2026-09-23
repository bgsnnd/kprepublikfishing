import type { AttendanceStatus } from '@/lib/validation/attendance'

// ============================================================
// TIMEZONE
// ============================================================

/**
 * Ambil timezone aplikasi dari env, dengan sanitasi.
 *
 * Vercel kadang set `TZ=:UTC` (ada titik dua) — itu invalid.
 * Kita sanitize + validasi pake Intl.
 * Fallback: 'Asia/Jakarta'.
 */
function getAppTimezone(): string {
  const raw = process.env.TZ ?? 'Asia/Jakarta'

  // Buang titik dua di depan (Vercel: `:UTC` → `UTC`)
  const cleaned = raw.replace(/^:/, '').trim()

  // Validasi: coba pake Intl
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: cleaned })
    return cleaned
  } catch {
    // Fallback kalau invalid
    return 'Asia/Jakarta'
  }
}

export const APP_TIMEZONE = getAppTimezone()

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

export function calculateStatus(params: {
  checkInTime: Date
  standardCheckIn: Date | string
  lateToleranceMinutes: number
}): { status: AttendanceStatus; lateMinutes: number } {
  const { checkInTime, standardCheckIn, lateToleranceMinutes } = params

  const stdTimeStr = normalizeTime(standardCheckIn)

  const [stdHour, stdMin] = stdTimeStr.split(':').map(Number)
  const stdTotalMinutes = stdHour * 60 + stdMin

  const { totalMinutes: checkInTotalMinutes } = getLocalTimeParts(checkInTime)

  let diffMinutes = checkInTotalMinutes - stdTotalMinutes

  // ✅ Handle cross-day
  if (diffMinutes < -720) {
    diffMinutes += 24 * 60
  } else if (diffMinutes > 720) {
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

export function calculateWorkDuration(params: {
  checkIn: Date
  checkOut: Date
  standardCheckOut: Date | string
}): { durationMinutes: number; earlyLeaveMinutes: number } {
  const { checkIn, checkOut, standardCheckOut } = params

  // 1. Durasi kerja (handle cross-day)
  let durationMs = checkOut.getTime() - checkIn.getTime()

  if (durationMs < 0) {
    durationMs += 24 * 60 * 60 * 1000
  }

  if (durationMs > 16 * 60 * 60 * 1000) {
    durationMs -= 24 * 60 * 60 * 1000
  }

  const durationMinutes = Math.max(0, Math.floor(durationMs / 60000))

  // 2. Early leave
  const stdTimeStr = normalizeTime(standardCheckOut)
  const [stdHour, stdMin] = stdTimeStr.split(':').map(Number)
  const stdCheckOutMinutes = stdHour * 60 + stdMin

  const { totalMinutes: checkInMinutes } = getLocalTimeParts(checkIn)
  const { totalMinutes: checkOutMinutes } = getLocalTimeParts(checkOut)

  let adjustedStdCheckOut = stdCheckOutMinutes
  if (adjustedStdCheckOut < checkInMinutes) {
    adjustedStdCheckOut += 24 * 60
  }

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