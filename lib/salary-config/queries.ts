import { prisma } from '@/lib/prisma'

// ============================================================
// Types
// ============================================================

export type RoleWithConfig = {
  id: string
  code: string
  name: string
  configs: {
    id: string
    componentId: string
    componentCode: string
    componentName: string
    componentType: string
    calcMethod: string
    amount: number
  }[]
}

export type ComponentOption = {
  id: string
  code: string
  name: string
  type: string
  calcMethod: string
  defaultAmount: number | null
}

// ============================================================
// Get all roles with their config
// ============================================================

export async function getRolesWithConfig(): Promise<RoleWithConfig[]> {
  const roles = await prisma.role.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' },
    select: {
      id: true,
      code: true,
      name: true,
      roleSalaryConfigs: {
        where: { effectiveTo: null },
        select: {
          id: true,
          componentId: true,
          amount: true,
          component: {
            select: {
              code: true,
              name: true,
              type: true,
              calcMethod: true,
            },
          },
        },
      },
    },
  })

  return roles.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    configs: r.roleSalaryConfigs.map((c) => ({
      id: c.id,
      componentId: c.componentId,
      componentCode: c.component.code,
      componentName: c.component.name,
      componentType: c.component.type,
      calcMethod: c.component.calcMethod,
      amount: c.amount,
    })),
  }))
}

// ============================================================
// Get all active components (buat dropdown)
// ============================================================

export async function getActiveComponents(): Promise<ComponentOption[]> {
  return prisma.salaryComponent.findMany({
    where: { isActive: true },
    orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      calcMethod: true,
      defaultAmount: true,
    },
  })
}

// ============================================================
// Get users with their config
// ============================================================

export type UserWithConfig = {
  id: string
  username: string
  name: string
  employeeTypeName: string | null
  roleName: string | null
  configs: {
    id: string
    componentId: string
    componentCode: string
    componentName: string
    componentType: string
    calcMethod: string
    amount: number
    reason: string | null
  }[]
}

export async function getUsersWithConfig(): Promise<UserWithConfig[]> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      username: true,
      name: true,
      employeeType: { select: { name: true } },
      userRoles: {
        select: { role: { select: { name: true } } },
        take: 1,
      },
      userSalaryConfigs: {
        where: { effectiveTo: null },
        select: {
          id: true,
          componentId: true,
          amount: true,
          reason: true,
          component: {
            select: {
              code: true,
              name: true,
              type: true,
              calcMethod: true,
            },
          },
        },
      },
    },
  })

  return users.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    employeeTypeName: u.employeeType?.name ?? null,
    roleName: u.userRoles[0]?.role?.name ?? null,
    configs: u.userSalaryConfigs.map((c) => ({
      id: c.id,
      componentId: c.componentId,
      componentCode: c.component.code,
      componentName: c.component.name,
      componentType: c.component.type,
      calcMethod: c.component.calcMethod,
      amount: c.amount,
      reason: c.reason,
    })),
  }))
}