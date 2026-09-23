'use client'

import { usePathname } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

function toTitle(segment: string): string {
  return segment
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
}

export function SiteHeader() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <nav className="flex items-center gap-1.5 text-sm">
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1
          return (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <span className="text-muted-foreground/50 select-none">/</span>
              )}
              <span
                className={
                  isLast
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground'
                }
              >
                {toTitle(seg)}
              </span>
            </span>
          )
        })}
      </nav>
    </header>
  )
}