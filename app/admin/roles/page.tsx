import { requirePermission } from '@/lib/auth/context'
import { listRoles, listPermissionsGrouped } from '@/lib/roles/queries'
import { RolesClient } from './roles-client'

export const metadata = {
  title: 'Role & Permission',
}

export const dynamic = 'force-dynamic'

export default async function RolesPage() {
  await requirePermission('role.read')

  const [roles, permissionGroups] = await Promise.all([
    listRoles(),
    listPermissionsGrouped(),
  ])

  return (
    <RolesClient
      initialRoles={roles}
      permissionGroups={permissionGroups}
    />
  )
}