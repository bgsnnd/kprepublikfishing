import { requirePermission } from '@/lib/auth/context'
import {
  getUsersWithConfig,
  getActiveComponents,
} from '@/lib/salary-config/queries'
import { UserConfigClient } from './user-config-client'

export const metadata = {
  title: 'Override Gaji User',
}

export const dynamic = 'force-dynamic'

export default async function UserSalaryConfigPage() {
  await requirePermission('payroll.read')

  const [users, components] = await Promise.all([
    getUsersWithConfig(),
    getActiveComponents(),
  ])

  return <UserConfigClient users={users} components={components} />
}