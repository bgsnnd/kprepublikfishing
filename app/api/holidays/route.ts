import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import {
  createHolidaySchema,
  listHolidaysQuerySchema,
} from '@/lib/validation/holiday'
import { listHolidays } from '@/lib/holidays/queries'
import { formatZodError } from '@/lib/validation/auth'
import {
  ok,
  created,
  withErrorHandler,
  parseJsonBody,
} from '@/lib/api/response'
import { ConflictError, ValidationError } from '@/lib/errors'

// ============================================================
// GET /api/holidays
// ============================================================

export async function GET(req: Request) {
  return withErrorHandler(async () => {
    await requirePermission('schedule.read')

    const url = new URL(req.url)
    const raw = Object.fromEntries(url.searchParams)
    const parsed = listHolidaysQuerySchema.safeParse(raw)

    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Query tidak valid', fields)
    }

    const result = await listHolidays(parsed.data)
    return ok(result.items, {
      meta: {
        total: result.total,
        page: result.page,
        perPage: result.perPage,
        totalPages: result.totalPages,
      },
    })
  }, { module: 'holidays.list' })
}

// ============================================================
// POST /api/holidays
// ============================================================

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await requirePermission('schedule.manage')
    const body = await parseJsonBody(req)

    const parsed = createHolidaySchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const data = parsed.data

    // Parse tanggal
    const [year, month, day] = data.date.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))

    // Cek duplikat
    const existing = await prisma.holiday.findUnique({
      where: { date },
      select: { id: true, name: true },
    })

    if (existing) {
      throw new ConflictError(
        `Tanggal ini sudah ada libur: ${existing.name}`,
      )
    }

    const holiday = await prisma.holiday.create({
      data: {
        date,
        name: data.name,
        type: data.type,
        createdById: session.userId,
      },
      select: {
        id: true,
        date: true,
        name: true,
        type: true,
        isActive: true,
      },
    })

    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'CREATE',
      entity: 'Holiday',
      entityId: holiday.id,
      after: {
        date: data.date,
        name: data.name,
        type: data.type,
      },
      module: 'schedule',
      severity: 'INFO',
      context: auditCtx,
    })

    return created(holiday)
  }, { module: 'holidays.create' })
}