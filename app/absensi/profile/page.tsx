import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { ProfileClient } from './profile-client'

export const metadata = {
  title: 'Profil',
}

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <ProfileClient
      user={{
        name: session.name,
        username: session.username,
        email: session.email,
        roleCodes: session.roleCodes,
        permissions: session.permissions,
      }}
    />
  )
}