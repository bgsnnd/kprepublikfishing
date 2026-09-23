import { prisma } from '@/lib/prisma'

// ============================================================
// Ambil permission & role dari database
// ============================================================

export type UserAuthData = {
  userId: string
  email: string
  username: string
  name: string
  roleCodes: string[]
  permissions: string[]
}

export async function loadUserAuth(userId: string): Promise<UserAuthData | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      isActive: true,
      userRoles: {
        where: {
          role: { isActive: true },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        select: {
          role: {
            select: {
              code: true,
              isActive: true,
              rolePermissions: {
                select: {
                  permission: {
                    select: { code: true, isActive: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!user || !user.isActive) return null

  const roleCodes = new Set<string>()
  const permissions = new Set<string>()

  for (const ur of user.userRoles) {
    if (!ur.role.isActive) continue
    roleCodes.add(ur.role.code)

    for (const rp of ur.role.rolePermissions) {
      if (rp.permission.isActive) {
        permissions.add(rp.permission.code)
      }
    }
  }

  return {
    userId: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    roleCodes: Array.from(roleCodes),
    permissions: Array.from(permissions),
  }
}

// ============================================================
// Cek permission
// ============================================================

export function hasPermission(
  userPermissions: string[],
  required: string,
): boolean {
  return userPermissions.includes(required)
}

export function hasAnyPermission(
  userPermissions: string[],
  required: string[],
): boolean {
  if (required.length === 0) return true
  return required.some((r) => userPermissions.includes(r))
}

export function hasAllPermissions(
  userPermissions: string[],
  required: string[],
): boolean {
  if (required.length === 0) return true
  return required.every((r) => userPermissions.includes(r))
}

export function hasRole(userRoles: string[], required: string): boolean {
  return userRoles.includes(required)
}

export function hasAnyRole(userRoles: string[], required: string[]): boolean {
  if (required.length === 0) return true
  return required.some((r) => userRoles.includes(r))
}

/**
 * Peta route → permission yang dibutuhkan.
 * Dipakai oleh middleware untuk proteksi halaman.
 */
export const ROUTE_PERMISSIONS: Record<string, string> = {
  '/admin/pos/kantin':  'pos.kantin',
  '/admin/pos/pancing': 'pos.pancing',
  '/admin/pos/report':  'pos.report',
  '/admin/inventory':   'inventory.read',
  '/admin/attendance':  'attendance.read',
  '/admin/schedule':    'schedule.read',
  '/admin/caddy':       'caddy.session.read',
  '/admin/payroll':     'payroll.read',
  '/admin/users':       'user.read',
  '/admin/roles':       'role.read',
  '/admin/audit':       'audit.read',
  '/admin/settings':    'system.settings',
}

/**
 * Cari permission untuk sebuah path.
 * Return null kalau path tidak diproteksi.
 */
export function getRequiredPermission(pathname: string): string | null {
  const sorted = Object.keys(ROUTE_PERMISSIONS).sort(
    (a, b) => b.length - a.length,
  )

  for (const prefix of sorted) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      return ROUTE_PERMISSIONS[prefix]
    }
  }

  return null
}