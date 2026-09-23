import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings/queries'

// ============================================================
// Types
// ============================================================

export type ShiftWithAttendance = {
  shiftId: string
  startTime: Date
  endTime: Date
  position: string | null
  status: string
  standardCheckIn: string // "08:00"
  standardCheckOut: string // "17:00"
  attendance: {
    id: string
    checkIn: Date
    checkOut: Date | null
    status: string
    lateMinutes: number
    earlyLeaveMinutes: number
    workDurationMinutes: number | null
  } | null
}

export type FallbackHours = {
  standardCheckIn: string
  standardCheckOut: string
}

// ============================================================
// Ambil SEMUA shift hari ini + absensi masing-masing
// ============================================================

export async function getTodayShiftsWithAttendance(
  userId: string,
  workDate: Date,
): Promise<ShiftWithAttendance[]> {
  const shifts = await prisma.shift.findMany({
    where: {
      userId,
      shiftDate: workDate,
      status: { not: 'CANCELLED' },
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      position: true,
      status: true,
      attendances: {
        where: { userId },
        select: {
          id: true,
          checkIn: true,
          checkOut: true,
          status: true,
          lateMinutes: true,
          earlyLeaveMinutes: true,
          workDurationMinutes: true,
        },
        take: 1,
      },
    },
    orderBy: { startTime: 'asc' },
  })

  return shifts.map((s) => ({
    shiftId: s.id,
    startTime: s.startTime,
    endTime: s.endTime,
    position: s.position,
    status: s.status,
    standardCheckIn: formatTimeWIB(s.startTime),
    standardCheckOut: formatTimeWIB(s.endTime),
    attendance: s.attendances[0] ?? null,
  }))
}

// ============================================================
// Fallback kalau user gak punya shift hari ini
// ============================================================

export async function getFallbackHours(): Promise<FallbackHours> {
  const [stdIn, stdOut] = await Promise.all([
    getSetting<string>('attendance.standard_check_in'),
    getSetting<string>('attendance.standard_check_out'),
  ])

  return {
    standardCheckIn: stdIn ?? '08:00',
    standardCheckOut: stdOut ?? '17:00',
  }
}

// ============================================================
// Cari shift spesifik by ID (untuk validasi check-in)
// ============================================================

export async function getShiftById(shiftId: string) {
  return prisma.shift.findUnique({
    where: { id: shiftId },
    select: {
      id: true,
      userId: true,
      shiftDate: true,
      startTime: true,
      endTime: true,
      position: true,
      status: true,
    },
  })
}

// ============================================================
// Format Date → "HH:mm" WIB
// ============================================================

export function formatTimeWIB(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'

  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
}