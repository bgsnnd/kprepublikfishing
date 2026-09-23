import { prisma } from '@/lib/prisma'
import { getWorkDate } from '@/lib/attendance/helpers'
import { writeAudit } from '@/lib/audit/log'
import { ok, withErrorHandler } from '@/lib/api/response'
import { UnauthorizedError } from '@/lib/errors'

/**
 * Cron job: tandai ALPHA untuk karyawan yang punya shift CONFIRMED
 * tapi tidak absen sampai akhir hari.
 *
 * Panggil via cron: 0 23 * * * (tiap jam 23:00 WIB)
 * Atau manual: GET /api/cron/auto-alpha dengan header Authorization
 */
export async function GET(req: Request) {
  return withErrorHandler(async () => {
    // Proteksi: cek secret header
    const authHeader = req.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      throw new UnauthorizedError('Invalid cron secret')
    }

    // Cari shift hari ini yang CONFIRMED, tapi user belum absen
    const workDate = getWorkDate()

    const shifts = await prisma.shift.findMany({
      where: {
        shiftDate: workDate,
        status: 'CONFIRMED',
        user: {
          isActive: true,
          // Belum ada absensi hari ini
          attendances: {
            none: { workDate },
          },
        },
      },
      select: {
        id: true,
        userId: true,
        user: { select: { name: true, username: true } },
      },
    })

    if (shifts.length === 0) {
      return ok({ processed: 0, message: 'Tidak ada shift tanpa absensi' })
    }

    // Buat Attendance dengan status ALPHA untuk tiap shift
    let processed = 0

    for (const shift of shifts) {
      await prisma.attendance.create({
        data: {
          userId: shift.userId,
          shiftId: shift.id,
          workDate,
          checkIn: new Date(workDate), // set ke midnight (placeholder)
          method: 'MANUAL',
          status: 'ALPHA',
          notes: 'Auto-generated: tidak absen padahal ada shift',
        },
      })

      await writeAudit({
        action: 'CREATE',
        entity: 'Attendance',
        after: {
          autoAlpha: true,
          username: shift.user.username,
          name: shift.user.name,
          shiftId: shift.id,
          workDate: workDate.toISOString(),
        },
        module: 'attendance',
        severity: 'WARNING',
      })

      processed++
    }

    return ok({
      processed,
      date: workDate.toISOString().slice(0, 10),
      message: `${processed} absensi ALPHA dibuat otomatis`,
    })
  }, { module: 'cron.auto-alpha' })
}