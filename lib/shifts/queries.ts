import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/lib/prisma'
import type { ListShiftsQuery } from '@/lib/validation/shift'

export type ShiftListItem = {
  id: string
  shiftDate: Date
  startTime: Date
  endTime: Date
  position: string | null
  status: string
  notes: string | null
  createdAt: Date
  user: {
    username: string
    name: string
    employeeTypeName: string | null
  }
}

export type ListShiftsResult = {
  items: ShiftListItem[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

// ============================================================
// List shifts
// ============================================================

export async function listShifts(
  query: ListShiftsQuery,
): Promise<ListShiftsResult> {
  const {
    q,
    date,
    dateFrom,
    dateTo,
    username,
    status,
    page,
    perPage,
  } = query

  const where: Prisma.ShiftWhereInput = {
    ...(q
      ? {
          OR: [
            { user: { name: { contains: q, mode: 'insensitive' } } },
            { user: { username: { contains: q, mode: 'insensitive' } } },
            { position: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(username ? { user: { username } } : {}),
    ...(status ? { status } : {}),
    ...buildDateFilter({ date, dateFrom, dateTo }),
  }

  const [total, items] = await Promise.all([
    prisma.shift.count({ where }),
    prisma.shift.findMany({
      where,
      orderBy: [{ shiftDate: 'desc' }, { startTime: 'asc' }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        shiftDate: true,
        startTime: true,
        endTime: true,
        position: true,
        status: true,
        notes: true,
        createdAt: true,
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
    items: items.map((s) => ({
      id: s.id,
      shiftDate: s.shiftDate,
      startTime: s.startTime,
      endTime: s.endTime,
      position: s.position,
      status: s.status,
      notes: s.notes,
      createdAt: s.createdAt,
      user: {
        username: s.user.username,
        name: s.user.name,
        employeeTypeName: s.user.employeeType?.name ?? null,
      },
    })),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

function buildDateFilter(params: {
  date: string
  dateFrom: string
  dateTo: string
}): Prisma.ShiftWhereInput {
  const { date, dateFrom, dateTo } = params

  if (date) {
    const [year, month, day] = date.split('-').map(Number)
    return { shiftDate: new Date(Date.UTC(year, month - 1, day)) }
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
      shiftDate: {
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

export async function getShiftDetail(id: string) {
  const shift = await prisma.shift.findUnique({
    where: { id },
    select: {
      id: true,
      shiftDate: true,
      startTime: true,
      endTime: true,
      position: true,
      status: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          username: true,
          name: true,
          employeeType: { select: { name: true } },
        },
      },
    },
  })

  return shift
}

// ============================================================
// Stats
// ============================================================

export async function getShiftStats() {
  const today = new Date()
  const todayUTC = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  )

  const [todayTotal, todayConfirmed, upcoming, cancelled] = await Promise.all([
    prisma.shift.count({ where: { shiftDate: todayUTC } }),
    prisma.shift.count({
      where: { shiftDate: todayUTC, status: 'CONFIRMED' },
    }),
    prisma.shift.count({
      where: { shiftDate: { gt: todayUTC }, status: { not: 'CANCELLED' } },
    }),
    prisma.shift.count({ where: { status: 'CANCELLED' } }),
  ])

  return { todayTotal, todayConfirmed, upcoming, cancelled }
}