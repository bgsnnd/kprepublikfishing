import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Fish } from 'lucide-react'
import { getSession } from '@/lib/auth/session'
import { BottomNav } from './bottom-nav'

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-lg dark:bg-slate-900/80">
        <div className="container mx-auto max-w-2xl px-4 h-14 flex items-center justify-between">
          <Link href="/absensi" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white">
              <Fish className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <div className="leading-none">
              <div className="text-sm font-semibold">Absensi</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                KP Republik Fishing
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">
              {session.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
          </div>
        </div>
      </header>

      {/* Main content — padding bottom biar gak ketutup bottom nav */}
      <main className="container mx-auto max-w-2xl px-4 py-5 pb-24">
        {children}
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  )
}