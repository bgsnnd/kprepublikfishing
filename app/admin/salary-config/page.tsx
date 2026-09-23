import { requirePermission } from '@/lib/auth/context'
import {
  getRolesWithConfig,
  getActiveComponents,
} from '@/lib/salary-config/queries'
import { SalaryConfigClient } from './salary-config-client'

export const metadata = {
  title: 'Setting Gaji',
}

export const dynamic = 'force-dynamic'

export default async function SalaryConfigPage() {
  await requirePermission('payroll.read')

  const [roles, components] = await Promise.all([
    getRolesWithConfig(),
    getActiveComponents(),
  ])

  return <SalaryConfigClient roles={roles} components={components} />
}