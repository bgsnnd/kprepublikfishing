import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { AbsensiClient } from './absensi-client'

export const metadata = {
  title: 'Absensi',
}

export const dynamic = 'force-dynamic'

export default async function AbsensiPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  // Cek punya permission attendance.self
  if (!session.permissions.includes('attendance.self')) {
    redirect('/403')
  }

  return <AbsensiClient userName={session.name} />
}