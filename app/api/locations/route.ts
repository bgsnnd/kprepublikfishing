import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import {
  createLocationSchema,
  listLocationsQuerySchema,
} from '@/lib/validation/location'
import { listLocations } from '@/lib/locations/queries'
import { formatZodError } from '@/lib/validation/auth'
import {
  ok,
  created,
  withErrorHandler,
  parseJsonBody,
} from '@/lib/api/response'
import { ConflictError, ValidationError } from '@/lib/errors'

// ============================================================
// GET /api/locations
// ============================================================

export async function GET(req: Request) {
  return withErrorHandler(async () => {
    await requirePermission('location.read')

    const url = new URL(req.url)
    const raw = Object.fromEntries(url.searchParams)
    const parsed = listLocationsQuerySchema.safeParse(raw)

    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Query tidak valid', fields)
    }

    const result = await listLocations(parsed.data)
    return ok(result.items, {
      meta: {
        total: result.total,
        page: result.page,
        perPage: result.perPage,
        totalPages: result.totalPages,
      },
    })
  }, { module: 'locations.list' })
}

// ============================================================
// POST /api/locations
// ============================================================

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await requirePermission('location.manage')
    const body = await parseJsonBody(req)

    const parsed = createLocationSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const data = parsed.data

    // Cek duplikat code
    const existing = await prisma.location.findUnique({
      where: { code: data.code },
      select: { code: true },
    })

    if (existing) {
      throw new ConflictError('Kode lokasi sudah dipakai')
    }

    // Cek kalau ini lokasi pertama → otomatis jadi default
    const count = await prisma.location.count()
    const shouldBeDefault = data.isDefault || count === 0

    const location = await prisma.$transaction(async (tx) => {
      // Kalau set default, unset default yang lain
      if (shouldBeDefault) {
        await tx.location.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        })
      }

      return tx.location.create({
        data: {
          code: data.code,
          name: data.name,
          type: data.type,
          address: data.address || null,
          latitude: data.latitude,
          longitude: data.longitude,
          radiusMeters: data.radiusMeters,
          isDefault: shouldBeDefault,
          createdById: session.userId,
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
          createdAt: true,
        },
      })
    })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'CREATE',
      entity: 'Location',
      entityId: location.id,
      after: {
        code: location.code,
        name: location.name,
        type: location.type,
        latitude: location.latitude,
        longitude: location.longitude,
        radiusMeters: location.radiusMeters,
        isDefault: location.isDefault,
      },
      module: 'location',
      severity: 'INFO',
      context: auditCtx,
    })

    return created(location)
  }, { module: 'locations.create' })
}