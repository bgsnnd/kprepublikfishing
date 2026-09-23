import { requirePermission } from '@/lib/auth/context'
import {
  listAuditLogs,
  getAuditFilterOptions,
  getAuditUsers,
} from '@/lib/audit/queries'
import { listAuditQuerySchema } from '@/lib/validation/audit'
import { AuditClient } from './audit-client'

export const metadata = {
  title: 'Audit Log',
}

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AuditPage({ searchParams }: PageProps) {
  await requirePermission('audit.read')

  const raw = await searchParams
  const parsed = listAuditQuerySchema.safeParse(raw)
  const query = parsed.success
    ? parsed.data
    : {
        q: '',
        username: '',
        action: '',
        entity: '',
        severity: '',
        module: '',
        dateFrom: '',
        dateTo: '',
        page: 1,
        perPage: 25,
      }

  const [result, filterOptions, users] = await Promise.all([
    listAuditLogs(query),
    getAuditFilterOptions(),
    getAuditUsers(),
  ])

  return (
    <AuditClient
      initialData={result}
      filterOptions={filterOptions}
      users={users}
      initialQuery={query}
    />
  )
}