import { prisma } from '@/lib/prisma'
import { requirePermission, buildAuditContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { bulkCreateShiftSchema } from '@/lib/validation/shift'
import { formatZodError } from '@/lib/validation/auth'
import { created, withErrorHandler, parseJsonBody } from '@/lib/api/response'
import { NotFoundError, ValidationError } from '@/lib/errors'

// ============================================================
// POST /api/shifts/bulk
// ============================================================

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await requirePermission('schedule.manage')
    const body = await parseJsonBody(req)

    const parsed = bulkCreateShiftSchema.safeParse(body)
    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Validasi gagal', fields)
    }

    const data = parsed.data

    // ============================================================
    // 1. Cari semua user
    // ============================================================
    const users = await prisma.user.findMany({
      where: {
        username: { in: data.usernames },
        isActive: true,
      },
      select: { id: true, username: true, name: true },
    })

    if (users.length !== data.usernames.length) {
      const found = users.map((u) => u.username)
      const missing = data.usernames.filter((u) => !found.includes(u))
      throw new NotFoundError(
        `User tidak ditemukan atau tidak aktif: ${missing.join(', ')}`,
      )
    }

    // ============================================================
    // 2. Generate range tanggal
    // ============================================================
    const [startY, startM, startD] = data.dateFrom.split('-').map(Number)
    const [endY, endM, endD] = data.dateTo.split('-').map(Number)

    const startDate = new Date(Date.UTC(startY, startM - 1, startD))
    const endDate = new Date(Date.UTC(endY, endM - 1, endD))

    // ============================================================
    // 2a. Ambil hari libur dalam range
    // ============================================================
    const holidays = await prisma.holiday.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        isActive: true,
      },
      select: { date: true, name: true },
    })

    const holidayMap = new Map(
      holidays.map((h) => [h.date.toISOString().slice(0, 10), h.name]),
    )

    // ============================================================
    // 2b. Generate tanggal yang match + skip libur
    // ============================================================
    const dates: Date[] = []
    const skippedHolidays: { date: string; name: string }[] = []
    const cursor = new Date(startDate)

    while (cursor <= endDate) {
      const dayOfWeek = cursor.getUTCDay()
      const dateStr = cursor.toISOString().slice(0, 10)

      if (!data.daysOfWeek.includes(dayOfWeek)) {
        cursor.setUTCDate(cursor.getUTCDate() + 1)
        continue
      }

      if (data.skipHolidays && holidayMap.has(dateStr)) {
        skippedHolidays.push({
          date: dateStr,
          name: holidayMap.get(dateStr)!,
        })
        cursor.setUTCDate(cursor.getUTCDate() + 1)
        continue
      }

      dates.push(new Date(cursor))
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    if (dates.length === 0) {
      throw new ValidationError(
        'Tidak ada tanggal yang match dengan hari yang dipilih',
        {
          daysOfWeek: [
            skippedHolidays.length > 0
              ? `Semua tanggal terpilih adalah hari libur (${skippedHolidays.length} hari)`
              : 'Tidak ada tanggal yang cocok dalam range',
          ],
        },
      )
    }

    // ============================================================
    // 3. Parse jam (WIB) + validasi
    // ============================================================
    const [startH, startM2] = data.startTime.split(':').map(Number)
    const [endH, endM2] = data.endTime.split(':').map(Number)

    if (
      isNaN(startH) ||
      isNaN(startM2) ||
      isNaN(endH) ||
      isNaN(endM2)
    ) {
      throw new ValidationError('Format jam tidak valid', {
        startTime: ['Format harus "HH:mm" (contoh: 08:00)'],
      })
    }

    // ============================================================
    // 4. Generate kombinasi user × tanggal
    // ============================================================
    const combinations: {
      userId: string
      username: string
      name: string
      shiftDate: Date
    }[] = []

    for (const user of users) {
      for (const date of dates) {
        combinations.push({
          userId: user.id,
          username: user.username,
          name: user.name,
          shiftDate: date,
        })
      }
    }

    // ============================================================
    // 5. Skip conflicts — CEK OVERLAP JAM (bukan tanggal doang)
    // ============================================================
    let skippedConflicts = 0

    // Build set tanggal range buat query existing
    const dateStrings = dates.map((d) => d.toISOString().slice(0, 10))

    // Ambil semua shift existing di range tanggal (per user)
    const existingShifts = await prisma.shift.findMany({
      where: {
        userId: { in: users.map((u) => u.id) },
        shiftDate: { in: dates },
        status: { not: 'CANCELLED' },
      },
      select: {
        userId: true,
        shiftDate: true,
        startTime: true,
        endTime: true,
      },
    })

    // ✅ Build set overlap: key = userId|date, value = list of { start, end } UTC
    const existingByUserDate = new Map<
      string,
      { start: Date; end: Date }[]
    >()

    for (const s of existingShifts) {
      const key = `${s.userId}|${s.shiftDate.toISOString().slice(0, 10)}`
      const arr = existingByUserDate.get(key) ?? []
      arr.push({ start: s.startTime, end: s.endTime })
      existingByUserDate.set(key, arr)
    }

    // ✅ Konversi WIB → UTC untuk validasi overlap
    function buildUTC(shiftDate: Date, h: number, m: number): Date {
      // WIB = UTC+7, jadi UTC = WIB - 7
      const d = new Date(shiftDate)
      d.setUTCHours(h - 7, m, 0, 0)
      return d
    }

    const validCombinations = combinations.filter((c) => {
      const key = `${c.userId}|${c.shiftDate.toISOString().slice(0, 10)}`
      const existing = existingByUserDate.get(key)

      // Kalau gak ada shift existing di tanggal itu → aman
      if (!existing || existing.length === 0) return true

      // ✅ Cek overlap jam
      const newStart = buildUTC(c.shiftDate, startH, startM2)
      const newEnd = buildUTC(c.shiftDate, endH, endM2)

      const hasOverlap = existing.some((e) => {
        // Overlap kalau: newStart < existingEnd && newEnd > existingStart
        return newStart < e.end && newEnd > e.start
      })

      if (hasOverlap) {
        skippedConflicts++
        return false
      }

      return true
    })

    // ============================================================
    // 6. Kalau semua konflik
    // ============================================================
    if (validCombinations.length === 0) {
      return created({
        created: 0,
        skipped: skippedConflicts,
        skippedHolidays: skippedHolidays.length,
        holidayDetails: skippedHolidays,
        total: combinations.length,
        users: users.map((u) => u.name),
        dateCount: dates.length,
        message: `Semua kombinasi (${skippedConflicts}) bentrok jam dengan shift existing. Tidak ada yang dibuat.`,
      })
    }

    // ============================================================
    // 7. Bulk insert — konversi WIB → UTC
    // ============================================================
    const shiftsToCreate = validCombinations.map((c) => {
      // ✅ WIB = UTC+7, jadi UTC = WIB - 7 jam
      const startTime = new Date(c.shiftDate)
      startTime.setUTCHours(startH - 7, startM2, 0, 0)

      const endTime = new Date(c.shiftDate)
      endTime.setUTCHours(endH - 7, endM2, 0, 0)

      return {
        userId: c.userId,
        shiftDate: c.shiftDate,
        startTime,
        endTime,
        position: data.position || null,
        notes: data.notes || null,
        status: 'SCHEDULED' as const,
        createdById: session.userId,
      }
    })

    const result = await prisma.shift.createMany({
      data: shiftsToCreate,
    })

    // ============================================================
    // 8. Audit log
    // ============================================================
    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'CREATE',
      entity: 'Shift',
      after: {
        bulkCreate: true,
        created: result.count,
        skipped: skippedConflicts,
        skippedHolidays: skippedHolidays.length,
        userCount: users.length,
        dateCount: dates.length,
        usernames: users.map((u) => u.username),
        dateFrom: data.dateFrom,
        dateTo: data.dateTo,
        startTime: data.startTime,
        endTime: data.endTime,
        position: data.position || null,
      },
      module: 'schedule',
      severity: 'INFO',
      context: auditCtx,
    })

    // ============================================================
    // 9. Return sukses
    // ============================================================
    return created({
      created: result.count,
      skipped: skippedConflicts,
      skippedHolidays: skippedHolidays.length,
      holidayDetails: skippedHolidays,
      total: combinations.length,
      users: users.map((u) => u.name),
      dateCount: dates.length,
      message: `${result.count} shift berhasil dibuat${
        skippedConflicts > 0
          ? `, ${skippedConflicts} dilewati (bentrok jam)`
          : ''
      }${
        skippedHolidays.length > 0
          ? `, ${skippedHolidays.length} dilewati (libur)`
          : ''
      }`,
    })
  }, { module: 'shifts.bulk-create' })
}