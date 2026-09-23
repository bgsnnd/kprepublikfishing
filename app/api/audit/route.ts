import { requirePermission } from '@/lib/auth/context'
import {
  listAuditLogs,
  getAuditFilterOptions,
  getAuditUsers,
} from '@/lib/audit/queries'
import { listAuditQuerySchema } from '@/lib/validation/audit'
import { formatZodError } from '@/lib/validation/auth'
import { ok, withErrorHandler } from '@/lib/api/response'
import { ValidationError } from '@/lib/errors'

export async function GET(req: Request) {
  return withErrorHandler(async () => {
    await requirePermission('audit.read')

    const url = new URL(req.url)
    const raw = Object.fromEntries(url.searchParams)
    const parsed = listAuditQuerySchema.safeParse(raw)

    if (!parsed.success) {
      const { fields } = formatZodError(parsed.error)
      throw new ValidationError('Query tidak valid', fields)
    }

    const [result, filterOptions, users] = await Promise.all([
      listAuditLogs(parsed.data),
      getAuditFilterOptions(),
      getAuditUsers(),
    ])

    return ok(
      {
        items: result.items,
        filterOptions,
        users,
      },
      {
        meta: {
          total: result.total,
          page: result.page,
          perPage: result.perPage,
          totalPages: result.totalPages,
        },
      },
    )
  }, { module: 'audit.list' })
}