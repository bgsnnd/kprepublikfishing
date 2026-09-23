import { requirePermission } from '@/lib/auth/context'
import { listEmployeeTypes } from '@/lib/employee-types/queries'
import { listEmployeeTypesQuerySchema } from '@/lib/validation/employee-type'
import { EmployeeTypesClient } from './employee-types-client'

export const metadata = {
  title: 'Tipe Karyawan',
}

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function EmployeeTypesPage({ searchParams }: PageProps) {
  await requirePermission('user.read')

  const raw = await searchParams
  const parsed = listEmployeeTypesQuerySchema.safeParse(raw)
  const query = parsed.success
    ? parsed.data
    : {
        q: '',
        status: 'all' as const,
        page: 1,
        perPage: 20,
      }

  const result = await listEmployeeTypes(query)

  return <EmployeeTypesClient initialData={result} initialQuery={query} />
}