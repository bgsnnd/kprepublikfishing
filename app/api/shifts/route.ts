import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import {
  createShiftSchema,
  listShiftsQuerySchema,
} from '@/lib/validation/shift'
import { listShifts } from '@/lib/shifts/queries'
import { formatZodError } from '@/lib/validation/auth'
import {
  ok,
  created,
  withErrorHandler,
  parseJsonBody,
} from '@/lib/api/response'
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors'

// ============================================================
// Helper: WIB → UTC
// ============================================================

/**
 * "2026-09-30" + "15:00" (WIB) → Date UTC
 * WIB = UTC+7, jadi UTC = WIB - 7 jam
 */
function toDateUTC(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)

  if (
    isNaN(year) || isNaN(month) || isNaN(day) ||
    isNaN(hours) || isNaN(minutes)
  ) {
    throw new ValidationError('Format tanggal/waktu tidak valid', {
      startTime: ['Format harus "HH:mm" (contoh: 15:00)'],
    })
  }

  return new Date(Date.UTC(year, month - 1, day, hours - 7, minutes, 0, 0))
}

// ============================================================
// GET /api/shifts
// ============================================================

export async function GET(req: Request) {
  return withErrorHandler(async () => {
    await requirePermission('schedule.read')

    const url = new URL(req.url)
    const raw = Object.fromEntries(url.searchParams)
    const parsed = listShiftsQuerySchema.safeParse(raw)

    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Query tidak valid', fields)
    }

    const result = await listShifts(parsed.data)
    return ok(result.items, {
      meta: {
        total: result.total,
        page: result.page,
        perPage: result.perPage,
        totalPages: result.totalPages,
      },
    })
  }, { module: 'shifts.list' })
}

// ============================================================
// POST /api/shifts
// ============================================================

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await requirePermission('schedule.manage')
    const body = await parseJsonBody(req)

    const parsed = createShiftSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const data = parsed.data

    // Cari user
    const user = await prisma.user.findUnique({
      where: { username: data.username },
      select: { id: true, name: true, username: true, isActive: true },
    })

    if (!user) throw new NotFoundError('User tidak ditemukan')
    if (!user.isActive) throw new BadRequestError('User tidak aktif')

    // ✅ Parse shiftDate (UTC midnight)
    const [year, month, day] = data.shiftDate.split('-').map(Number)
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      throw new ValidationError('Tanggal tidak valid', {
        shiftDate: ['Format harus yyyy-MM-dd'],
      })
    }
    const shiftDate = new Date(Date.UTC(year, month - 1, day))

    // ✅ Konversi "HH:mm" WIB → UTC
    const startTime = toDateUTC(data.shiftDate, data.startTime)
    const endTime = toDateUTC(data.shiftDate, data.endTime)

    // Cek overlap
    const existing = await prisma.shift.findFirst({
      where: {
        userId: user.id,
        shiftDate,
        status: { not: 'CANCELLED' },
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
      select: { id: true, startTime: true, endTime: true },
    })

    if (existing) {
      throw new ConflictError(
        `${user.name} sudah punya shift di jam yang sama`,
      )
    }

    // Simpan
    const shift = await prisma.shift.create({
      data: {
        userId: user.id,
        shiftDate,
        startTime,
        endTime,
        position: data.position || null,
        notes: data.notes || null,
        createdById: session.userId,
      },
      select: {
        id: true,
        shiftDate: true,
        startTime: true,
        endTime: true,
        position: true,
        status: true,
        notes: true,
      },
    })

    // Audit
    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'CREATE',
      entity: 'Shift',
      entityId: shift.id,
      after: {
        username: user.username,
        name: user.name,
        shiftDate: data.shiftDate,
        startTime: data.startTime,
        endTime: data.endTime,
        position: data.position,
      },
      module: 'schedule',
      severity: 'INFO',
      context: auditCtx,
    })

    return created(shift)
  }, { module: 'shifts.create' })
}