import { requirePermission } from '@/lib/auth/context'
import { listAttendance } from '@/lib/attendance/queries'
import { listAttendanceQuerySchema } from '@/lib/validation/attendance'
import { formatZodError } from '@/lib/validation/auth'
import { ok, withErrorHandler } from '@/lib/api/response'
import { ValidationError } from '@/lib/errors'

export async function GET(req: Request) {
  return withErrorHandler(async () => {
    await requirePermission('attendance.read')

    const url = new URL(req.url)
    const raw = Object.fromEntries(url.searchParams)
    const parsed = listAttendanceQuerySchema.safeParse(raw)

    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Query tidak valid', fields)
    }

    const result = await listAttendance(parsed.data)
    return ok(result.items, {
      meta: {
        total: result.total,
        page: result.page,
        perPage: result.perPage,
        totalPages: result.totalPages,
      },
    })
  }, { module: 'attendance.list' })
}