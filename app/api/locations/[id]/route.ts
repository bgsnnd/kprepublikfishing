import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { updateLocationSchema } from '@/lib/validation/location'
import { formatZodError } from '@/lib/validation/auth'
import { ok, withErrorHandler, parseJsonBody } from '@/lib/api/response'
import {
  NotFoundError,
  ValidationError,
  BadRequestError,
} from '@/lib/errors'

type RouteContext = { params: Promise<{ id: string }> }

// ============================================================
// GET /api/locations/[id]
// ============================================================

export async function GET(_req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    await requirePermission('location.read')
    const { id: identifier } = await ctx.params

    const location = await prisma.location.findFirst({
      where: {
        OR: [{ id: identifier }, { code: identifier }],
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        address: true,
        latitude: true,
        longitude: true,
        radiusMeters: true,
        isActive: true,
        isDefault: true,
        _count: {
          select: {
            attendances: true,
            defaultUsers: true,
          },
        },
      },
    })

    if (!location) throw new NotFoundError('Lokasi tidak ditemukan')

    return ok({
      id: location.id,
      code: location.code,
      name: location.name,
      type: location.type,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      radiusMeters: location.radiusMeters,
      isActive: location.isActive,
      isDefault: location.isDefault,
      userCount: location._count.defaultUsers,
      attendanceCount: location._count.attendances,
    })
  }, { module: 'locations.detail' })
}

// ============================================================
// PATCH /api/locations/[id]
// ============================================================

export async function PATCH(req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('location.manage')
    const { id: identifier } = await ctx.params
    const body = await parseJsonBody(req)

    const parsed = updateLocationSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const data = parsed.data

    const before = await prisma.location.findFirst({
      where: {
        OR: [{ id: identifier }, { code: identifier }],
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        address: true,
        latitude: true,
        longitude: true,
        radiusMeters: true,
        isActive: true,
        isDefault: true,
      },
    })

    if (!before) throw new NotFoundError('Lokasi tidak ditemukan')

    const updated = await prisma.$transaction(async (tx) => {
      // Kalau set default, unset default yang lain
      if (data.isDefault === true && !before.isDefault) {
        await tx.location.updateMany({
          where: { isDefault: true, NOT: { id: before.id } },
          data: { isDefault: false },
        })
      }

      return tx.location.update({
        where: { id: before.id },
        data: {
          name: data.name,
          type: data.type,
          address: data.address || null,
          latitude: data.latitude,
          longitude: data.longitude,
          radiusMeters: data.radiusMeters,
          isDefault: data.isDefault ?? before.isDefault,
          isActive: data.isActive ?? before.isActive,
          updatedById: session.userId,
        },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          address: true,
          latitude: true,
          longitude: true,
          radiusMeters: true,
          isActive: true,
          isDefault: true,
        },
      })
    })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'UPDATE',
      entity: 'Location',
      entityId: before.id,
      before: {
        name: before.name,
        type: before.type,
        address: before.address,
        latitude: before.latitude,
        longitude: before.longitude,
        radiusMeters: before.radiusMeters,
        isActive: before.isActive,
        isDefault: before.isDefault,
      },
      after: {
        name: updated.name,
        type: updated.type,
        address: updated.address,
        latitude: updated.latitude,
        longitude: updated.longitude,
        radiusMeters: updated.radiusMeters,
        isActive: updated.isActive,
        isDefault: updated.isDefault,
      },
      module: 'location',
      severity: 'INFO',
      context: auditCtx,
    })

    return ok(updated)
  }, { module: 'locations.update' })
}

// ============================================================
// DELETE /api/locations/[id]
// - Tidak ada relasi → HARD DELETE
// - Ada relasi → SOFT DELETE
// ============================================================

export async function DELETE(_req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('location.manage')
    const { id: identifier } = await ctx.params

    const before = await prisma.location.findFirst({
      where: {
        OR: [{ id: identifier }, { code: identifier }],
      },
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
        isDefault: true,
        _count: {
          select: {
            attendances: true,
            defaultUsers: true,
          },
        },
      },
    })

    if (!before) throw new NotFoundError('Lokasi tidak ditemukan')

    if (before.isDefault) {
      throw new BadRequestError(
        'Tidak bisa hapus lokasi default. Set lokasi lain sebagai default dulu.',
      )
    }

    const hasRelations =
      before._count.attendances > 0 || before._count.defaultUsers > 0

    const auditCtx = await buildAuditContext(session)

    // HARD DELETE
    if (!hasRelations) {
      await prisma.location.delete({ where: { id: before.id } })

      await writeAudit({
        action: 'DELETE',
        entity: 'Location',
        entityId: before.id,
        before: { code: before.code, name: before.name },
        module: 'location',
        severity: 'WARNING',
        context: auditCtx,
      })

      return ok({
        deleted: true,
        message: `Lokasi "${before.name}" dihapus permanen`,
      })
    }

    // SOFT DELETE
    if (!before.isActive) {
      throw new BadRequestError('Lokasi sudah nonaktif')
    }

    await prisma.location.update({
      where: { id: before.id },
      data: { isActive: false, updatedById: session.userId },
    })

    await writeAudit({
      action: 'DELETE',
      entity: 'Location',
      entityId: before.id,
      before: { isActive: true },
      after: { isActive: false },
      module: 'location',
      severity: 'WARNING',
      context: auditCtx,
    })

    return ok({
      deleted: false,
      message: `Lokasi "${before.name}" dinonaktifkan (masih ada ${before._count.attendances} absensi & ${before._count.defaultUsers} user terkait)`,
    })
  }, { module: 'locations.delete' })
}