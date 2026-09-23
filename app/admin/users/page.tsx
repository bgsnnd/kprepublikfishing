import { requirePermission } from '@/lib/auth/context'
import {
  listUsers,
  listRoles,
  listEmployeeTypes,
} from '@/lib/users/queries'
import { listUsersQuerySchema } from '@/lib/validation/user'
import { UsersClient } from './users-client'

export const metadata = {
  title: 'User',
}

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function UsersPage({ searchParams }: PageProps) {
  await requirePermission('user.read')

  const raw = await searchParams
  const parsed = listUsersQuerySchema.safeParse(raw)
  const query = parsed.success
    ? parsed.data
    : {
        q: '',
        role: '',
        status: 'all' as const,
        page: 1,
        perPage: 20,
      }

  const [result, roles, employeeTypes] = await Promise.all([
    listUsers(query),
    listRoles(),
    listEmployeeTypes(),
  ])

  return (
    <UsersClient
      initialData={result}
      roles={roles}
      employeeTypes={employeeTypes}
      initialQuery={query}
    />
  )
}