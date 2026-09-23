import { prisma } from '@/lib/prisma'
import type { ListSalaryComponentsQuery } from '@/lib/validation/salary-component'

// ============================================================
// Types
// ============================================================

export type SalaryComponentItem = {
  id: string
  code: string
  name: string
  description: string | null
  type: string
  calcMethod: string
  defaultAmount: number | null
  sortOrder: number
  isTaxable: boolean
  isSystem: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type ListSalaryComponentsResult = {
  items: SalaryComponentItem[]
  total: number
}

// ============================================================
// List
// ============================================================

export async function listSalaryComponents(
  query: ListSalaryComponentsQuery,
): Promise<ListSalaryComponentsResult> {
  const { q, type, active } = query

  const where = {
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: 'insensitive' as const } },
            { name: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(type ? { type } : {}),
    ...(active === 'active' ? { isActive: true } : {}),
    ...(active === 'inactive' ? { isActive: false } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.salaryComponent.count({ where }),
    prisma.salaryComponent.findMany({
      where,
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { code: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        type: true,
        calcMethod: true,
        defaultAmount: true,
        sortOrder: true,
        isTaxable: true,
        isSystem: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ])

  return { items, total }
}

// ============================================================
// Detail
// ============================================================

export async function getSalaryComponentDetail(id: string) {
  return prisma.salaryComponent.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      type: true,
      calcMethod: true,
      defaultAmount: true,
      sortOrder: true,
      isTaxable: true,
      isSystem: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}