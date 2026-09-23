import { requirePermission } from '@/lib/auth/context'
import { listPayroll } from '@/lib/payroll/queries'
import { listPayrollQuerySchema } from '@/lib/validation/payroll'
import { formatZodError } from '@/lib/validation/auth'
import { ok, withErrorHandler } from '@/lib/api/response'
import { ValidationError } from '@/lib/errors'

// ============================================================
// GET /api/payroll
// ============================================================

export async function GET(req: Request) {
  return withErrorHandler(async () => {
    await requirePermission('payroll.read')

    const url = new URL(req.url)
    const raw = Object.fromEntries(url.searchParams)
    const parsed = listPayrollQuerySchema.safeParse(raw)

    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Query tidak valid', fields)
    }

    const result = await listPayroll(parsed.data)
    return ok(result.items, {
      meta: {
        total: result.total,
        page: result.page,
        perPage: result.perPage,
        totalPages: result.totalPages,
      },
    })
  }, { module: 'payroll.list' })
}