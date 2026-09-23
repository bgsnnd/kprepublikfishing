import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { updateUserSchema } from '@/lib/validation/user'
import { formatZodError } from '@/lib/validation/auth'
import { ok, withErrorHandler, parseJsonBody } from '@/lib/api/response'
import {
  NotFoundError,
  ValidationError,
  BadRequestError,
} from '@/lib/errors'

type RouteContext = { params: Promise<{ id: string }> }

// Helper: cari user by ID ATAU username
async function findUserByIdentifier(identifier: string) {
  return prisma.user.findFirst({
    where: {
      OR: [{ id: identifier }, { username: identifier }],
    },
    select: {
      id: true,
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
}

// ============================================================
// GET /api/users/[id]
// ============================================================

export async function GET(_req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    await requirePermission('user.read')
    const { id } = await ctx.params

    const user = await findUserByIdentifier(id)
    if (!user) throw new NotFoundError('User tidak ditemukan')

    return ok({
      ...user,
      roles: user.userRoles.map((ur) => ur.role),
    })
  }, { module: 'users.detail' })
}

// ============================================================
// PATCH /api/users/[id]
// ============================================================

export async function PATCH(req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('user.manage')
    const { id: identifier } = await ctx.params
    const body = await parseJsonBody(req)

    const parsed = updateUserSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const data = parsed.data

    const before = await prisma.user.findFirst({
      where: {
        OR: [{ id: identifier }, { username: identifier }],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        employeeType: { select: { code: true } },
        userRoles: { select: { role: { select: { code: true } } } },
      },
    })

    if (!before) throw new NotFoundError('User tidak ditemukan')

    // Resolve employee type by code
    let employeeTypeId: string | null = null
    if (data.employeeTypeCode) {
      const et = await prisma.employeeType.findUnique({
        where: { code: data.employeeTypeCode },
        select: { id: true },
      })
      employeeTypeId = et?.id ?? null
    }

    // Resolve role by code
    const roles = await prisma.role.findMany({
      where: { code: { in: data.roleCodes }, isActive: true },
      select: { id: true, code: true },
    })

    if (roles.length !== data.roleCodes.length) {
      throw new ValidationError('Ada role yang tidak valid', {
        roleCodes: ['Role tidak ditemukan atau tidak aktif'],
      })
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: before.id },
        data: {
          name: data.name,
          phone: data.phone || null,
          employeeTypeId,
          updatedById: session.userId,
        },
      })

      // Sync roles
      const currentRoleIds = await tx.userRole
        .findMany({
          where: { userId: before.id },
          select: { roleId: true },
        })
        .then((rows) => rows.map((r) => r.roleId))

      const newRoleIds = roles.map((r) => r.id)
      const toAdd = newRoleIds.filter((rid) => !currentRoleIds.includes(rid))
      const toRemove = currentRoleIds.filter(
        (rid) => !newRoleIds.includes(rid),
      )

      if (toRemove.length > 0) {
        await tx.userRole.deleteMany({
          where: { userId: before.id, roleId: { in: toRemove } },
        })
      }

      if (toAdd.length > 0) {
        await tx.userRole.createMany({
          data: toAdd.map((roleId) => ({
            userId: before.id,
            roleId,
            assignedBy: session.userId,
          })),
        })
      }

      return tx.user.findUnique({
        where: { id: before.id },
        select: {
          username: true,
          email: true,
          name: true,
          phone: true,
          isActive: true,
          employeeType: { select: { code: true, name: true } },
          userRoles: {
            select: { role: { select: { code: true, name: true } } },
          },
        },
      })
    })

    if (!updated) throw new NotFoundError('User tidak ditemukan')

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'UPDATE',
      entity: 'User',
      entityId: before.id,
      before: {
        name: before.name,
        phone: before.phone,
        employeeTypeCode: before.employeeType?.code ?? null,
        roleCodes: before.userRoles.map((ur) => ur.role.code),
      },
      after: {
        name: updated.name,
        phone: updated.phone,
        employeeTypeCode: updated.employeeType?.code ?? null,
        roleCodes: updated.userRoles.map((ur) => ur.role.code),
      },
      module: 'rbac',
      severity: 'INFO',
      context: auditCtx,
    })

    return ok({
      ...updated,
      roles: updated.userRoles.map((ur) => ur.role),
    })
  }, { module: 'users.update' })
}

// ============================================================
// DELETE /api/users/[id]
// ============================================================

export async function DELETE(_req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('user.manage')
    const { id: identifier } = await ctx.params

    const before = await prisma.user.findFirst({
      where: {
        OR: [{ id: identifier }, { username: identifier }],
      },
      select: {
        id: true,
        username: true,
        isActive: true,
      },
    })

    if (!before) throw new NotFoundError('User tidak ditemukan')
    if (!before.isActive) throw new BadRequestError('User sudah nonaktif')
    if (before.username === session.username) {
      throw new BadRequestError('Tidak bisa menonaktifkan akun sendiri')
    }

    await prisma.user.update({
      where: { id: before.id },
      data: { isActive: false, updatedById: session.userId },
    })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'DELETE',
      entity: 'User',
      entityId: before.id,
      before: { isActive: true },
      after: { isActive: false },
      module: 'rbac',
      severity: 'WARNING',
      context: auditCtx,
    })

    return ok({ message: 'User dinonaktifkan' })
  }, { module: 'users.delete' })
}