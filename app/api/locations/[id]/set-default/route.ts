import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { ok, withErrorHandler } from '@/lib/api/response'
import { NotFoundError, BadRequestError } from '@/lib/errors'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    const session = await requirePermission('location.manage')
    const { id: identifier } = await ctx.params

    const location = await prisma.location.findFirst({
      where: {
        OR: [{ id: identifier }, { code: identifier }],
      },
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
        isDefault: true,
      },
    })

    if (!location) throw new NotFoundError('Lokasi tidak ditemukan')
    if (!location.isActive) {
      throw new BadRequestError('Lokasi nonaktif tidak bisa dijadikan default')
    }
    if (location.isDefault) {
      throw new BadRequestError('Lokasi ini sudah menjadi default')
    }

    await prisma.$transaction(async (tx) => {
      // Unset default yang lain
      await tx.location.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })

      // Set lokasi ini sebagai default
      await tx.location.update({
        where: { id: location.id },
        data: { isDefault: true, updatedById: session.userId },
      })
    })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'UPDATE',
      entity: 'Location',
      entityId: location.id,
      after: { isDefault: true },
      module: 'location',
      severity: 'WARNING',
      context: auditCtx,
    })

    return ok({
      message: `"${location.name}" sekarang menjadi lokasi default`,
    })
  }, { module: 'locations.set-default' })
}