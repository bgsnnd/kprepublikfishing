'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, History, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/absensi', label: 'Beranda', icon: Home },
  { href: '/absensi/riwayat', label: 'Riwayat', icon: History },
  { href: '/absensi/profile', label: 'Profil', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur-lg dark:bg-slate-900/95">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="flex items-center justify-around h-16">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === '/absensi'
                ? pathname === '/absensi'
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors relative',
                  isActive
                    ? 'text-violet-600 dark:text-violet-400'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-violet-600 dark:bg-violet-400" />
                )}
                <Icon
                  className={cn(
                    'h-5 w-5 transition-transform',
                    isActive && 'scale-110',
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={cn(
                    'text-[10px] font-medium',
                    isActive && 'font-semibold',
                  )}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}