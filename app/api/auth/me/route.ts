import { getSession } from '@/lib/auth/session'
import { ok, withErrorHandler } from '@/lib/api/response'
import { UnauthorizedError } from '@/lib/errors'

export async function GET() {
  return withErrorHandler(async () => {
    const session = await getSession()
    if (!session) {
      throw new UnauthorizedError()
    }

    return ok({
      userId: session.userId,
      email: session.email,
      username: session.username,
      name: session.name,
      roleCodes: session.roleCodes,
      permissions: session.permissions,
    })
  }, { module: 'auth.me' })
}