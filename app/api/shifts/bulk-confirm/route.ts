import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { formatZodError } from '@/lib/validation/auth'
import { ok, withErrorHandler, parseJsonBody } from '@/lib/api/response'
import { ValidationError } from '@/lib/errors'
import { z } from 'zod'

// ============================================================
// Schema
// ============================================================

const bulkConfirmSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, 'Pilih minimal 1 shift'),
})

// ============================================================
// POST /api/shifts/bulk-confirm
// ============================================================

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await requirePermission('schedule.manage')
    const body = await parseJsonBody(req)

    const parsed = bulkConfirmSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const { ids } = parsed.data

    // Cari shift yang valid (belum CANCELLED)
    const shifts = await prisma.shift.findMany({
      where: {
        id: { in: ids },
        status: { not: 'CANCELLED' },
      },
      select: { id: true, status: true },
    })

    if (shifts.length === 0) {
      throw new ValidationError('Tidak ada shift yang bisa dikonfirmasi', {
        ids: ['Semua shift sudah dibatalkan atau tidak ditemukan'],
      })
    }

    // Bulk update
    const result = await prisma.shift.updateMany({
      where: {
        id: { in: shifts.map((s) => s.id) },
        status: { not: 'CANCELLED' },
      },
      data: {
        status: 'CONFIRMED',
        updatedById: session.userId,
      },
    })

    // Audit
    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'UPDATE',
      entity: 'Shift',
      after: {
        bulkConfirm: true,
        requested: ids.length,
        confirmed: result.count,
        skipped: ids.length - shifts.length,
        ids: shifts.map((s) => s.id),
      },
      module: 'schedule',
      severity: 'INFO',
      context: auditCtx,
    })

    return ok({
      confirmed: result.count,
      skipped: ids.length - shifts.length,
      total: ids.length,
      message: `${result.count} shift dikonfirmasi${
        ids.length - shifts.length > 0
          ? `, ${ids.length - shifts.length} dilewati`
          : ''
      }`,
    })
  }, { module: 'shifts.bulk-confirm' })
}