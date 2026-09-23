import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/lib/prisma'
import type { ListEmployeeTypesQuery } from '@/lib/validation/employee-type'

export type EmployeeTypeListItem = {
  code: string
  name: string
  description: string | null
  isActive: boolean
  userCount: number
  createdAt: Date
}

export type ListEmployeeTypesResult = {
  items: EmployeeTypeListItem[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export async function listEmployeeTypes(
  query: ListEmployeeTypesQuery,
): Promise<ListEmployeeTypesResult> {
  const { q, status, page, perPage } = query

  const where: Prisma.EmployeeTypeWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { code: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(status === 'active' ? { isActive: true } : {}),
    ...(status === 'inactive' ? { isActive: false } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.employeeType.count({ where }),
    prisma.employeeType.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        code: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        _count: { select: { users: true } },
      },
    }),
  ])

  return {
    items: items.map((et) => ({
      code: et.code,
      name: et.name,
      description: et.description,
      isActive: et.isActive,
      userCount: et._count.users,
      createdAt: et.createdAt,
    })),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

export async function getEmployeeTypeDetail(code: string) {
  const et = await prisma.employeeType.findUnique({
    where: { code },
    select: {
      code: true,
      name: true,
      description: true,
      isActive: true,
      _count: { select: { users: true } },
    },
  })

  if (!et) return null

  return {
    code: et.code,
    name: et.name,
    description: et.description,
    isActive: et.isActive,
    userCount: et._count.users,
  }
}

/**
 * Opsi untuk dropdown (di modul lain).
 */
export async function listEmployeeTypeOptions() {
  return prisma.employeeType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { code: true, name: true },
  })
}