import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth/context'
import { ok, withErrorHandler } from '@/lib/api/response'

// ============================================================
// GET /api/shifts/pending
// Ambil semua shift SCHEDULED (belum dikonfirmasi)
// ============================================================

export async function GET() {
  return withErrorHandler(async () => {
    await requirePermission('schedule.read')

    const shifts = await prisma.shift.findMany({
      where: {
        status: 'SCHEDULED',
      },
      select: {
        id: true,
        shiftDate: true,
        startTime: true,
        endTime: true,
        user: {
          select: { name: true, username: true },
        },
      },
      orderBy: [{ shiftDate: 'asc' }, { startTime: 'asc' }],
    })

    return ok({
      total: shifts.length,
      shifts: shifts.map((s) => ({
        id: s.id,
        userName: s.user.name,
        username: s.user.username,
        shiftDate: s.shiftDate.toISOString(),
        startTime: s.startTime.toISOString(),
        endTime: s.endTime.toISOString(),
      })),
    })
  }, { module: 'shifts.pending' })
}