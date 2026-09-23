import { requirePermission } from '@/lib/auth/context'
import { listHolidays } from '@/lib/holidays/queries'
import { listHolidaysQuerySchema } from '@/lib/validation/holiday'
import { HolidaysClient } from './holidays-client'

export const metadata = {
  title: 'Hari Libur',
}

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function HolidaysPage({ searchParams }: PageProps) {
  await requirePermission('schedule.read')

  const raw = await searchParams
  const parsed = listHolidaysQuerySchema.safeParse(raw)

  const query = parsed.success
    ? parsed.data
    : {
        q: '',
        year: new Date().getFullYear(),
        type: '',
        page: 1,
        perPage: 50,
      }

  const result = await listHolidays(query)

  return <HolidaysClient initialData={result} initialQuery={query} />
}