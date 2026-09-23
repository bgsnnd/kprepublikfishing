import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { updateRoleSchema } from '@/lib/validation/role'
import { getRoleDetail } from '@/lib/roles/queries'
import { formatZodError } from '@/lib/validation/auth'
import { ok, withErrorHandler, parseJsonBody } from '@/lib/api/response'
import {
  NotFoundError,
  ValidationError,
  BadRequestError,
} from '@/lib/errors'

type RouteContext = { params: Promise<{ id: string }> }

// ============================================================
// GET /api/roles/[id]
// ============================================================

export async function GET(_req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    await requirePermission('role.read')
    const { id } = await ctx.params

    const role = await getRoleDetail(id)
    if (!role) throw new NotFoundError('Role tidak ditemukan')

    return ok(role)
  }, { module: 'roles.detail' })
}

// ============================================================
// PATCH /api/roles/[id] — update role + permission
// ============================================================

export async function PATCH(req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('role.manage')
    const { id } = await ctx.params
    const body = await parseJsonBody(req)

    const parsed = updateRoleSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const data = parsed.data

    const before = await prisma.role.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        isActive: true,
        rolePermissions: { select: { permissionId: true } },
      },
    })

    if (!before) throw new NotFoundError('Role tidak ditemukan')

    // Validasi permission IDs
    const validPermissions = await prisma.permission.findMany({
      where: { id: { in: data.permissionIds }, isActive: true },
      select: { id: true },
    })

    const validIds = validPermissions.map((p) => p.id)

    const updated = await prisma.$transaction(async (tx) => {
      // Update role data
      await tx.role.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description || null,
          isActive: data.isActive ?? before.isActive,
          updatedById: session.userId,
        },
      })

      // Sync permission: hapus yang tidak ada, tambah yang baru
      const currentIds = before.rolePermissions.map((rp) => rp.permissionId)
      const toAdd = validIds.filter((pid) => !currentIds.includes(pid))
      const toRemove = currentIds.filter((pid) => !validIds.includes(pid))

      if (toRemove.length > 0) {
        await tx.rolePermission.deleteMany({
          where: { roleId: id, permissionId: { in: toRemove } },
        })
      }

      if (toAdd.length > 0) {
        await tx.rolePermission.createMany({
          data: toAdd.map((permissionId) => ({
            roleId: id,
            permissionId,
            grantedBy: session.userId,
          })),
        })
      }

      return tx.role.findUnique({
        where: { id },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          isSystem: true,
          isActive: true,
          rolePermissions: { select: { permissionId: true } },
        },
      })
    })

    if (!updated) throw new NotFoundError('Role tidak ditemukan')

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'UPDATE',
      entity: 'Role',
      entityId: id,
      before: {
        name: before.name,
        description: before.description,
        permissionIds: before.rolePermissions.map((rp) => rp.permissionId),
      },
      after: {
        name: updated.name,
        description: updated.description,
        permissionIds: updated.rolePermissions.map((rp) => rp.permissionId),
      },
      module: 'rbac',
      severity: 'WARNING',  // perubahan permission = warning
      context: auditCtx,
    })

    return ok({
      id: updated.id,
      code: updated.code,
      name: updated.name,
      description: updated.description,
      isSystem: updated.isSystem,
      isActive: updated.isActive,
      permissionIds: updated.rolePermissions.map((rp) => rp.permissionId),
    })
  }, { module: 'roles.update' })
}

// ============================================================
// DELETE /api/roles/[id] — hapus role (hard delete, dengan proteksi)
// ============================================================

export async function DELETE(_req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('role.manage')
    const { id } = await ctx.params

    const role = await prisma.role.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        isSystem: true,
        _count: { select: { userRoles: true } },
      },
    })

    if (!role) throw new NotFoundError('Role tidak ditemukan')

    if (role.isSystem) {
      throw new BadRequestError('Role sistem tidak bisa dihapus')
    }

    if (role._count.userRoles > 0) {
      throw new BadRequestError(
        `Role ini masih dipakai oleh ${role._count.userRoles} user. Hapus assignment-nya terlebih dahulu.`,
      )
    }

    await prisma.role.delete({ where: { id } })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'DELETE',
      entity: 'Role',
      entityId: id,
      before: {
        code: role.code,
        name: role.name,
      },
      module: 'rbac',
      severity: 'WARNING',
      context: auditCtx,
    })

    return ok({ message: 'Role berhasil dihapus' })
  }, { module: 'roles.delete' })
}