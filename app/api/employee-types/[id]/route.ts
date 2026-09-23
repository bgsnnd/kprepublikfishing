import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { updateEmployeeTypeSchema } from '@/lib/validation/employee-type'
import { formatZodError } from '@/lib/validation/auth'
import { ok, withErrorHandler, parseJsonBody } from '@/lib/api/response'
import {
  NotFoundError,
  ValidationError,
  BadRequestError,
} from '@/lib/errors'

type RouteContext = { params: Promise<{ id: string }> }

// ============================================================
// Helper: cari by ID atau CODE
// ============================================================

async function findEmployeeTypeByIdentifier(identifier: string) {
  return prisma.employeeType.findFirst({
    where: {
      OR: [{ id: identifier }, { code: identifier }],
    },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      isActive: true,
      _count: { select: { users: true } },
    },
  })
}

// ============================================================
// GET /api/employee-types/[id]
// ============================================================

export async function GET(_req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    await requirePermission('user.read')
    const { id } = await ctx.params

    const et = await findEmployeeTypeByIdentifier(id)
    if (!et) throw new NotFoundError('Tipe karyawan tidak ditemukan')

    return ok({
      code: et.code,
      name: et.name,
      description: et.description,
      isActive: et.isActive,
      userCount: et._count.users,
    })
  }, { module: 'employee-types.detail' })
}

// ============================================================
// PATCH /api/employee-types/[id]
// ============================================================

export async function PATCH(req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('user.manage')
    const { id: identifier } = await ctx.params
    const body = await parseJsonBody(req)

    const parsed = updateEmployeeTypeSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const data = parsed.data

    const before = await prisma.employeeType.findFirst({
      where: {
        OR: [{ id: identifier }, { code: identifier }],
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        isActive: true,
      },
    })

    if (!before) throw new NotFoundError('Tipe karyawan tidak ditemukan')

    const updated = await prisma.employeeType.update({
      where: { id: before.id },
      data: {
        name: data.name,
        description: data.description || null,
        isActive: data.isActive ?? before.isActive,
      },
      select: {
        code: true,
        name: true,
        description: true,
        isActive: true,
      },
    })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'UPDATE',
      entity: 'EmployeeType',
      entityId: before.id,
      before: {
        name: before.name,
        description: before.description,
        isActive: before.isActive,
      },
      after: {
        name: updated.name,
        description: updated.description,
        isActive: updated.isActive,
      },
      module: 'master',
      severity: 'INFO',
      context: auditCtx,
    })

    return ok(updated)
  }, { module: 'employee-types.update' })
}

// ============================================================
// DELETE /api/employee-types/[id]
// - Tidak ada relasi → HARD DELETE
// - Ada relasi → SOFT DELETE (nonaktifkan)
// ============================================================

export async function DELETE(_req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('user.manage')
    const { id: identifier } = await ctx.params

    const before = await prisma.employeeType.findFirst({
      where: {
        OR: [{ id: identifier }, { code: identifier }],
      },
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
        _count: { select: { users: true } },
      },
    })

    if (!before) throw new NotFoundError('Tipe karyawan tidak ditemukan')

    const hasRelations = before._count.users > 0
    const auditCtx = await buildAuditContext(session)

    // ============================================================
    // CASE 1: Tidak ada relasi → HARD DELETE
    // ============================================================
    if (!hasRelations) {
      await prisma.employeeType.delete({
        where: { id: before.id },
      })

      await writeAudit({
        action: 'DELETE',
        entity: 'EmployeeType',
        entityId: before.id,
        before: {
          code: before.code,
          name: before.name,
          isActive: before.isActive,
        },
        module: 'master',
        severity: 'WARNING',
        context: auditCtx,
      })

      return ok({
        deleted: true,
        message: `Tipe "${before.name}" dihapus permanen`,
      })
    }

    // ============================================================
    // CASE 2: Ada relasi → SOFT DELETE
    // ============================================================
    if (!before.isActive) {
      throw new BadRequestError('Tipe karyawan sudah nonaktif')
    }

    await prisma.employeeType.update({
      where: { id: before.id },
      data: { isActive: false },
    })

    await writeAudit({
      action: 'DELETE',
      entity: 'EmployeeType',
      entityId: before.id,
      before: { isActive: true },
      after: { isActive: false },
      module: 'master',
      severity: 'WARNING',
      context: auditCtx,
    })

    return ok({
      deleted: false,
      message: `Tipe "${before.name}" dinonaktifkan (masih dipakai ${before._count.users} user)`,
    })
  }, { module: 'employee-types.delete' })
}