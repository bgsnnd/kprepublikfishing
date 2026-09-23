import { requirePermission } from '@/lib/auth/context'
import { getAuditDetail } from '@/lib/audit/queries'
import { ok, withErrorHandler } from '@/lib/api/response'
import { NotFoundError } from '@/lib/errors'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctx: RouteContext) {
  return withErrorHandler(async () => {
    await requirePermission('audit.read')
    const { id } = await ctx.params

    const log = await getAuditDetail(id)
    if (!log) throw new NotFoundError('Log tidak ditemukan')

    return ok(log)
  }, { module: 'audit.detail' })
}