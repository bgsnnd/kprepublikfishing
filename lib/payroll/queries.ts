import { prisma } from '@/lib/prisma'
import type { ListPayrollQuery } from '@/lib/validation/payroll'

// ============================================================
// Types
// ============================================================

export type PayrollListItem = {
  id: string
  periodMonth: number
  periodYear: number
  periodStart: Date
  periodEnd: Date
  grossEarning: number
  totalDeduction: number
  netSalary: number
  status: string
  approvedAt: Date | null
  paidAt: Date | null
  notes: string | null
  createdAt: Date
  user: {
    id: string
    username: string
    name: string
    employeeTypeName: string | null
  }
  itemCount: number
}

export type ListPayrollResult = {
  items: PayrollListItem[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

// ============================================================
// List payroll
// ============================================================

export async function listPayroll(
  query: ListPayrollQuery,
): Promise<ListPayrollResult> {
  const { q, periodMonth, periodYear, status, page, perPage } = query

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
    ...(periodMonth ? { periodMonth } : {}),
    ...(periodYear ? { periodYear } : {}),
    ...(status ? { status } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.payroll.count({ where }),
    prisma.payroll.findMany({
      where,
      orderBy: [
        { periodYear: 'desc' },
        { periodMonth: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        periodMonth: true,
        periodYear: true,
        periodStart: true,
        periodEnd: true,
        grossEarning: true,
        totalDeduction: true,
        netSalary: true,
        status: true,
        approvedAt: true,
        paidAt: true,
        notes: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            employeeType: { select: { name: true } },
          },
        },
        _count: { select: { items: true } },
      },
    }),
  ])

  return {
    items: items.map((p) => ({
      id: p.id,
      periodMonth: p.periodMonth,
      periodYear: p.periodYear,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      grossEarning: p.grossEarning,
      totalDeduction: p.totalDeduction,
      netSalary: p.netSalary,
      status: p.status,
      approvedAt: p.approvedAt,
      paidAt: p.paidAt,
      notes: p.notes,
      createdAt: p.createdAt,
      user: {
        id: p.user.id,
        username: p.user.username,
        name: p.user.name,
        employeeTypeName: p.user.employeeType?.name ?? null,
      },
      itemCount: p._count.items,
    })),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

// ============================================================
// Detail payroll
// ============================================================

export async function getPayrollDetail(id: string) {
  return prisma.payroll.findUnique({
    where: { id },
    select: {
      id: true,
      periodMonth: true,
      periodYear: true,
      periodStart: true,
      periodEnd: true,
      workingDays: true,
      presentDays: true,
      absentDays: true,
      lateDays: true,
      totalLateMinutes: true,
      totalWorkMinutes: true,
      grossEarning: true,
      totalDeduction: true,
      netSalary: true,
      status: true,
      approvedById: true,
      approvedAt: true,
      paidAt: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          employeeType: { select: { name: true } },
        },
      },
      items: {
        orderBy: { componentCode: 'asc' },
        select: {
          id: true,
          componentCode: true,
          componentName: true,
          componentType: true,
          calcMethod: true,
          baseAmount: true,
          quantity: true,
          finalAmount: true,
          notes: true,
        },
      },
    },
  })
}

// ============================================================
// Stats payroll
// ============================================================

export async function getPayrollStats(periodMonth?: number, periodYear?: number) {
  const where = {
    ...(periodMonth ? { periodMonth } : {}),
    ...(periodYear ? { periodYear } : {}),
  }

  const [total, draft, approved, paid, totalNet] = await Promise.all([
    prisma.payroll.count({ where }),
    prisma.payroll.count({ where: { ...where, status: 'DRAFT' } }),
    prisma.payroll.count({ where: { ...where, status: 'APPROVED' } }),
    prisma.payroll.count({ where: { ...where, status: 'PAID' } }),
    prisma.payroll.aggregate({
      where: { ...where, status: { not: 'CANCELLED' } },
      _sum: { netSalary: true },
    }),
  ])

  return {
    total,
    draft,
    approved,
    paid,
    totalNet: totalNet._sum.netSalary ?? 0,
  }
}