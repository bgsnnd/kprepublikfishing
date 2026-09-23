import { prisma } from '@/lib/prisma'
import type { ListAttendanceQuery } from '@/lib/validation/attendance'
import { getWorkDate } from '@/lib/attendance/helpers'

// ============================================================
// Types
// ============================================================

export type AttendanceListItem = {
  id: string
  workDate: Date
  checkIn: Date
  checkOut: Date | null
  method: string
  status: string
  lateMinutes: number
  earlyLeaveMinutes: number
  workDurationMinutes: number | null
  checkInDistance: number | null
  checkInLocationName: string | null
  checkInSelfieUrl: string | null
  notes: string | null
  shiftInfo: {
    id: string
    startTime: Date
    endTime: Date
    position: string | null
    status: string
  } | null
  user: {
    username: string
    name: string
    employeeTypeName: string | null
  }
  isCorrected: boolean
}

export type ListAttendanceResult = {
  items: AttendanceListItem[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

// ============================================================
// List attendance
// ============================================================

export async function listAttendance(
  query: ListAttendanceQuery,
): Promise<ListAttendanceResult> {
  const {
    q,
    date,
    dateFrom,
    dateTo,
    status,
    checkout,
    username,
    page,
    perPage,
  } = query

  // ✅ Inline object — gak butuh Prisma namespace
  const where = {
    ...(q
      ? {
          user: {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { username: { contains: q, mode: 'insensitive' as const } },
            ],
          },
        }
      : {}),
    ...(username ? { user: { username } } : {}),
    ...(status ? { status } : {}),
    ...(checkout === 'pending' ? { checkOut: null } : {}),
    ...(checkout === 'done' ? { checkOut: { not: null } } : {}),
    ...buildDateFilter({ date, dateFrom, dateTo }),
  }

  const [total, items] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      orderBy: [{ workDate: 'desc' }, { checkIn: 'desc' }],
      skip: (page - 1) * perPage,
      take: perPage,
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
        checkInDistance: true,
        checkInSelfieUrl: true,
        notes: true,
        isCorrected: true,
        checkInLocation: { select: { name: true } },
        shift: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            position: true,
            status: true,
          },
        },
        user: {
          select: {
            username: true,
            name: true,
            employeeType: { select: { name: true } },
          },
        },
      },
    }),
  ])

  return {
    items: items.map((a) => ({
      id: a.id,
      workDate: a.workDate,
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      method: a.method,
      status: a.status,
      lateMinutes: a.lateMinutes,
      earlyLeaveMinutes: a.earlyLeaveMinutes,
      workDurationMinutes: a.workDurationMinutes,
      checkInDistance: a.checkInDistance,
      checkInLocationName: a.checkInLocation?.name ?? null,
      checkInSelfieUrl: a.checkInSelfieUrl,
      notes: a.notes,
      isCorrected: a.isCorrected,
      shiftInfo: a.shift
        ? {
            id: a.shift.id,
            startTime: a.shift.startTime,
            endTime: a.shift.endTime,
            position: a.shift.position,
            status: a.shift.status,
          }
        : null,
      user: {
        username: a.user.username,
        name: a.user.name,
        employeeTypeName: a.user.employeeType?.name ?? null,
      },
    })),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

// ============================================================
// Date filter
// ============================================================

function buildDateFilter(params: {
  date: string
  dateFrom: string
  dateTo: string
}) {
  const { date, dateFrom, dateTo } = params

  if (date) {
    const [year, month, day] = date.split('-').map(Number)
    const d = new Date(Date.UTC(year, month - 1, day))
    return { workDate: d }
  }

  if (dateFrom || dateTo) {
    const fromDate = dateFrom
      ? (() => {
          const [y, m, d] = dateFrom.split('-').map(Number)
          return new Date(Date.UTC(y, m - 1, d))
        })()
      : undefined

    const toDate = dateTo
      ? (() => {
          const [y, m, d] = dateTo.split('-').map(Number)
          return new Date(Date.UTC(y, m - 1, d))
        })()
      : undefined

    return {
      workDate: {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {}),
      },
    }
  }

  return {}
}

// ============================================================
// Detail
// ============================================================

export async function getAttendanceDetail(id: string) {
  const a = await prisma.attendance.findUnique({
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
      confidence: true,
      deviceInfo: true,
      notes: true,
      createdAt: true,
      checkInLocation: { select: { name: true, code: true } },
      shift: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          position: true,
          status: true,
        },
      },
      user: {
        select: {
          username: true,
          name: true,
          employeeType: { select: { name: true } },
        },
      },
    },
  })

  return a
}

// ============================================================
// ✅ Get semua attendance hari ini (multi-shift)
// ============================================================

export async function getTodayAttendances(username: string) {
  const today = getWorkDate()

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  })

  if (!user) return []

  return prisma.attendance.findMany({
    where: {
      userId: user.id,
      workDate: today,
    },
    select: {
      id: true,
      shiftId: true,
      checkIn: true,
      checkOut: true,
      status: true,
      lateMinutes: true,
      earlyLeaveMinutes: true,
      workDurationMinutes: true,
    },
    orderBy: { checkIn: 'asc' },
  })
}

/**
 * @deprecated Pakai getTodayAttendances() untuk multi-shift
 */
export async function getTodayAttendance(username: string) {
  const list = await getTodayAttendances(username)
  return list[0] ?? null
}

// ============================================================
// Stats dashboard
// ============================================================

export async function getAttendanceStats() {
  const today = getWorkDate()

  const [total, hadir, terlambat, alpha, pending] = await Promise.all([
    prisma.attendance.count({ where: { workDate: today } }),
    prisma.attendance.count({ where: { workDate: today, status: 'HADIR' } }),
    prisma.attendance.count({
      where: { workDate: today, status: 'TERLAMBAT' },
    }),
    prisma.attendance.count({ where: { workDate: today, status: 'ALPHA' } }),
    prisma.attendance.count({
      where: { workDate: today, checkOut: null },
    }),
  ])

  return { total, hadir, terlambat, alpha, pending }
}