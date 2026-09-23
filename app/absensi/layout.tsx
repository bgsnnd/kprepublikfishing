import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { LogoutButton } from './logout-button'

export const metadata = {
  title: 'Absensi',
}

export default async function AbsensiLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-40">
        <div className="container mx-auto max-w-2xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-bold">KP</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Absensi</div>
              <div className="text-xs text-muted-foreground">
                {session.name}
              </div>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="container mx-auto max-w-2xl px-4 py-6">
        {children}
      </main>
    </div>
  )
}