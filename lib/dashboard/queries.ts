import { prisma } from '@/lib/prisma'

export type DashboardStats = {
  totalUsers: number
  activeUsers: number
  attendanceToday: number
  transactionsToday: number
  revenueToday: number
  lowStockCount: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [
    totalUsers,
    activeUsers,
    attendanceToday,
    transactionsToday,
    revenueAgg,
    lowStockCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.attendance.count({
      where: { checkIn: { gte: today, lt: tomorrow } },
    }),
    prisma.transaction.count({
      where: { createdAt: { gte: today, lt: tomorrow } },
    }),
    prisma.transaction.aggregate({
      where: { createdAt: { gte: today, lt: tomorrow } },
      _sum: { total: true },
    }),
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count
      FROM "Product"
      WHERE "isActive" = true AND stock < "minStock"
    `.then((rows) => Number(rows[0]?.count ?? 0)),
  ])

  return {
    totalUsers,
    activeUsers,
    attendanceToday,
    transactionsToday,
    revenueToday: revenueAgg._sum.total ?? 0,
    lowStockCount,
  }
}

export type SalesChartPoint = {
  date: string
  kantin: number
  pancing: number
}

export async function getSalesChart(days = 7): Promise<SalesChartPoint[]> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))

  const transactions = await prisma.transaction.findMany({
    where: { createdAt: { gte: start } },
    select: { type: true, total: true, createdAt: true },
  })

  const bucket: Record<string, { kantin: number; pancing: number }> = {}

  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    bucket[key] = { kantin: 0, pancing: 0 }
  }

  for (const tx of transactions) {
    const key = tx.createdAt.toISOString().slice(0, 10)
    if (!bucket[key]) continue
    if (tx.type === 'KANTIN') bucket[key].kantin += tx.total
    else if (tx.type === 'PANCING') bucket[key].pancing += tx.total
  }

  return Object.entries(bucket).map(([date, val]) => ({
    date: new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
    }),
    kantin: val.kantin,
    pancing: val.pancing,
  }))
}

export type LowStockProduct = {
  id: string
  name: string
  stock: number
  minStock: number
  categoryName: string
}

export async function getLowStockProducts(limit = 5): Promise<LowStockProduct[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: { select: { name: true } } },
    orderBy: { stock: 'asc' },
    take: limit,
  })

  return products
    .filter((p) => p.stock < p.minStock)
    .map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      minStock: p.minStock,
      categoryName: p.category.name,
    }))
}

export type RecentActivity = {
  id: string
  action: string
  entity: string
  entityId: string | null
  userName: string | null
  userEmail: string | null
  createdAt: Date
  severity: string
}

export async function getRecentActivity(limit = 8): Promise<RecentActivity[]> {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      action: true,
      entity: true,
      entityId: true,
      userEmail: true,
      createdAt: true,
      severity: true,
      user: { select: { name: true } },
    },
  })

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    userName: log.user?.name ?? null,
    userEmail: log.userEmail,
    createdAt: log.createdAt,
    severity: log.severity,
  }))
}