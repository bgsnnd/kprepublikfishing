import { requirePermission } from '@/lib/auth/context'
import { listAttendance, getAttendanceStats } from '@/lib/attendance/queries'
import { listAttendanceQuerySchema } from '@/lib/validation/attendance'
import { AttendanceClient } from './attendance-client'

export const metadata = {
  title: 'Absensi',
}

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AttendancePage({ searchParams }: PageProps) {
  await requirePermission('attendance.read')

  const raw = await searchParams
  const parsed = listAttendanceQuerySchema.safeParse(raw)

  const query = parsed.success
    ? parsed.data
    : {
        q: '',
        date: '',
        dateFrom: '',
        dateTo: '',
        status: '',
        checkout: '',
        username: '',
        page: 1,
        perPage: 20,
      }

  // TIDAK ada default filter tanggal — tampil semua data

  const [result, stats] = await Promise.all([
    listAttendance(query),
    getAttendanceStats(),
  ])

  return (
    <AttendanceClient
      initialData={result}
      stats={stats}
      initialQuery={query}
    />
  )
}