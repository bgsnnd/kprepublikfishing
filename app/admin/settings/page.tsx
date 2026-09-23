import { requirePermission } from '@/lib/auth/context'
import { getAllSettingsGrouped } from '@/lib/settings/queries'
import { SettingsClient } from './settings-client'

export const metadata = {
  title: 'Pengaturan',
}

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  await requirePermission('system.settings')

  const grouped = await getAllSettingsGrouped()

  return <SettingsClient initialSettings={grouped} />
}