import { getSession, destroySession } from '@/lib/auth/session'
import { getRequestContext } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit/log'
import { ok, withErrorHandler } from '@/lib/api/response'

export async function POST() {
  return withErrorHandler(async () => {
    const session = await getSession()
    const ctx = await getRequestContext()

    if (session) {
      await writeAudit({
        action: 'LOGOUT',
        entity: 'User',
        entityId: session.userId,
        module: 'auth',
        severity: 'INFO',
        context: {
          userId: session.userId,
          userEmail: session.email,
          userRole: session.roleCodes[0],
          ipAddress: ctx.ipAddress ?? undefined,
          userAgent: ctx.userAgent ?? undefined,
          requestId: ctx.requestId,
        },
      })
    }

    await destroySession()

    return ok({ message: 'Logout berhasil' })
  }, { module: 'auth.logout' })
}