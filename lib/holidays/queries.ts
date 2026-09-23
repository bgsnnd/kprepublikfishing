import { prisma } from '@/lib/prisma'
import type { ListHolidaysQuery } from '@/lib/validation/holiday'

// ============================================================
// Types
// ============================================================

export type HolidayListItem = {
  id: string
  date: Date
  name: string
  type: string
  isActive: boolean
  createdAt: Date
}

export type ListHolidaysResult = {
  items: HolidayListItem[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

// ============================================================
// Queries
// ============================================================

export async function listHolidays(
  query: ListHolidaysQuery,
): Promise<ListHolidaysResult> {
  const { q, year, type, page, perPage } = query

  // ✅ Inline object — gak butuh import Prisma namespace
  const where = {
    ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
    ...(year
      ? {
          date: {
            gte: new Date(Date.UTC(year, 0, 1)),
            lte: new Date(Date.UTC(year, 11, 31)),
          },
        }
      : {}),
    ...(type ? { type } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.holiday.count({ where }),
    prisma.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        date: true,
        name: true,
        type: true,
        isActive: true,
        createdAt: true,
      },
    }),
  ])

  return {
    items,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

export async function getHolidayDetail(id: string) {
  return prisma.holiday.findUnique({
    where: { id },
    select: {
      id: true,
      date: true,
      name: true,
      type: true,
      isActive: true,
      createdAt: true,
    },
  })
}