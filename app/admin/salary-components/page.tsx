import { requirePermission } from '@/lib/auth/context'
import { listSalaryComponents } from '@/lib/salary-components/queries'
import { listSalaryComponentsQuerySchema } from '@/lib/validation/salary-component'
import { ComponentsClient } from './components-client'

export const metadata = {
  title: 'Komponen Gaji',
}

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SalaryComponentsPage({
  searchParams,
}: PageProps) {
  await requirePermission('payroll.read')

  const raw = await searchParams
  const parsed = listSalaryComponentsQuerySchema.safeParse(raw)

  const query = parsed.success
    ? parsed.data
    : { q: '', type: '', active: '', page: 1, perPage: 50 }

  const result = await listSalaryComponents(query)

  return <ComponentsClient initialData={result} initialQuery={query} />
}