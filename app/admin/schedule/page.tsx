import { requirePermission } from '@/lib/auth/context'
import { prisma } from '@/lib/prisma'
import { listShifts, getShiftStats } from '@/lib/shifts/queries'
import { listShiftsQuerySchema } from '@/lib/validation/shift'
import { ScheduleClient } from './schedule-client'

export const metadata = {
  title: 'Jadwal Shift',
}

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SchedulePage({ searchParams }: PageProps) {
  await requirePermission('schedule.read')

  const raw = await searchParams
  const parsed = listShiftsQuerySchema.safeParse(raw)

  const query = parsed.success
    ? parsed.data
    : {
        q: '',
        date: '',
        dateFrom: '',
        dateTo: '',
        username: '',
        status: '',
        page: 1,
        perPage: 50,
      }

  const [result, stats, users] = await Promise.all([
    listShifts(query),
    getShiftStats(),
    // Ambil user aktif untuk bulk select
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        username: true,
        name: true,
        employeeType: { select: { name: true } },
      },
    }),
  ])

  return (
    <ScheduleClient
      initialData={result}
      stats={stats}
      users={users}
      initialQuery={query}
    />
  )
}