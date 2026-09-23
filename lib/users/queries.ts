import { prisma } from '@/lib/prisma'
import type { ListUsersQuery } from '@/lib/validation/user'
import type { Prisma } from '@/lib/prisma'

export type UserListItem = {
  username: string
  email: string
  name: string
  phone: string | null
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
  employeeType: { code: string; name: string } | null
  roles: { code: string; name: string }[]
}

export type ListUsersResult = {
  items: UserListItem[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export async function listUsers(
  query: ListUsersQuery,
): Promise<ListUsersResult> {
  const { q, role, status, page, perPage } = query

  const where: Prisma.UserWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { username: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(status === 'active' ? { isActive: true } : {}),
    ...(status === 'inactive' ? { isActive: false } : {}),
    ...(role
      ? {
          userRoles: {
            some: { role: { code: role } },
          },
        }
      : {}),
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        username: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        employeeType: { select: { code: true, name: true } },
        userRoles: {
          select: { role: { select: { code: true, name: true } } },
        },
      },
    }),
  ])

  return {
    items: users.map((u) => ({
      username: u.username,
      email: u.email,
      name: u.name,
      phone: u.phone,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      employeeType: u.employeeType,
      roles: u.userRoles.map((ur) => ur.role),
    })),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

export async function getUserDetail(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      username: true,
      email: true,
      name: true,
      phone: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      employeeType: { select: { code: true, name: true } },
      userRoles: {
        select: { role: { select: { code: true, name: true } } },
      },
    },
  })

  if (!user) return null

  return {
    ...user,
    roles: user.userRoles.map((ur) => ur.role),
  }
}

export async function listRoles() {
  return prisma.role.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { code: true, name: true, description: true },
  })
}

export async function listEmployeeTypes() {
  return prisma.employeeType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { code: true, name: true },
  })
}