'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fish } from 'lucide-react'
import { NAVIGATION } from '@/lib/navigation'
import type { SessionPayload } from '@/lib/auth/session'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavUser } from './nav-user'

type AppSidebarProps = {
  session: SessionPayload
}

export function AppSidebar({ session }: AppSidebarProps) {
  const pathname = usePathname()

  const groups = NAVIGATION.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        !item.permission || session.permissions.includes(item.permission),
    ),
  })).filter((group) => group.items.length > 0)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={
                <Link href="/admin">
                  <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Fish className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      KP Republik Fishing
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      Admin Panel
                    </span>
                  </div>
                </Link>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/admin' &&
                    pathname.startsWith(item.href + '/'))

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      render={
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.title}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser session={session} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}