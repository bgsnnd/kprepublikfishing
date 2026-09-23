import { requirePermission } from '@/lib/auth/context'
import { listPayroll, getPayrollStats } from '@/lib/payroll/queries'
import { listPayrollQuerySchema } from '@/lib/validation/payroll'
import { PayrollClient } from './payroll-client'

export const metadata = {
  title: 'Penggajian',
}

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function PayrollPage({ searchParams }: PageProps) {
  await requirePermission('payroll.read')

  const raw = await searchParams
  const parsed = listPayrollQuerySchema.safeParse(raw)

  const query = parsed.success
    ? parsed.data
    : {
        q: '',
        periodMonth: undefined,
        periodYear: undefined,
        status: '',
        page: 1,
        perPage: 20,
      }

  const [result, stats] = await Promise.all([
    listPayroll(query),
    getPayrollStats(query.periodMonth, query.periodYear),
  ])

  return (
    <PayrollClient
      initialData={result}
      stats={stats}
      initialQuery={query}
    />
  )
}