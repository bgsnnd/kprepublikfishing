import { prisma } from '@/lib/prisma'

export type PermissionGroup = {
  module: string
  label: string
  permissions: {
    id: string
    code: string
    name: string
    description: string | null
  }[]
}

export type RoleListItem = {
  id: string
  code: string
  name: string
  description: string | null
  isSystem: boolean
  isActive: boolean
  userCount: number
  permissionCount: number
  createdAt: Date
}

export type RoleDetail = {
  id: string
  code: string
  name: string
  description: string | null
  isSystem: boolean
  isActive: boolean
  permissionIds: string[]
  userCount: number
}

// ============================================================
// Module labels (data-driven, tapi bisa di-extend)
// ============================================================

const MODULE_LABELS: Record<string, string> = {
  auth: 'Autentikasi & Profil',
  attendance: 'Absensi',
  schedule: 'Jadwal',
  pos: 'Kasir / Penjualan',
  inventory: 'Stok & Produk',
  caddy: 'Caddy',
  payroll: 'Penggajian',
  rbac: 'User & Role',
  audit: 'Audit Log',
  system: 'Sistem',
}

// ============================================================
// List semua roles
// ============================================================

export async function listRoles(): Promise<RoleListItem[]> {
  const roles = await prisma.role.findMany({
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      isSystem: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          userRoles: true,
          rolePermissions: true,
        },
      },
    },
  })

  return roles.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    isActive: r.isActive,
    userCount: r._count.userRoles,
    permissionCount: r._count.rolePermissions,
    createdAt: r.createdAt,
  }))
}

// ============================================================
// Semua permission, dikelompokkan per module
// ============================================================

export async function listPermissionsGrouped(): Promise<PermissionGroup[]> {
  const permissions = await prisma.permission.findMany({
    where: { isActive: true },
    orderBy: [{ module: 'asc' }, { code: 'asc' }],
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      module: true,
    },
  })

  const grouped: Record<string, PermissionGroup> = {}

  for (const p of permissions) {
    if (!grouped[p.module]) {
      grouped[p.module] = {
        module: p.module,
        label: MODULE_LABELS[p.module] ?? p.module,
        permissions: [],
      }
    }
    grouped[p.module].permissions.push({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
    })
  }

  // Urutkan module sesuai urutan di MODULE_LABELS
  const moduleOrder = Object.keys(MODULE_LABELS)
  return Object.values(grouped).sort(
    (a, b) => moduleOrder.indexOf(a.module) - moduleOrder.indexOf(b.module),
  )
}

// ============================================================
// Detail role
// ============================================================

export async function getRoleDetail(id: string): Promise<RoleDetail | null> {
  const role = await prisma.role.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      isSystem: true,
      isActive: true,
      rolePermissions: { select: { permissionId: true } },
      _count: { select: { userRoles: true } },
    },
  })

  if (!role) return null

  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    isActive: role.isActive,
    permissionIds: role.rolePermissions.map((rp) => rp.permissionId),
    userCount: role._count.userRoles,
  }
}