import { headers } from 'next/headers'
import { getSession, type SessionPayload } from '@/lib/auth/session'

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

// ============================================================
// Ambil session, throw kalau tidak ada
// ============================================================

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) {
    throw new AuthError('Unauthorized', 401, 'UNAUTHORIZED')
  }
  return session
}

// ============================================================
// Ambil session + cek permission, throw kalau tidak punya
// ============================================================

export async function requirePermission(
  permission: string,
): Promise<SessionPayload> {
  const session = await requireSession()
  if (!session.permissions.includes(permission)) {
    throw new AuthError(
      `Forbidden: butuh permission "${permission}"`,
      403,
      'FORBIDDEN',
    )
  }
  return session
}

export async function requireAnyPermission(
  permissions: string[],
): Promise<SessionPayload> {
  const session = await requireSession()
  const hasAny = permissions.some((p) => session.permissions.includes(p))
  if (!hasAny) {
    throw new AuthError(
      `Forbidden: butuh salah satu dari ${permissions.join(', ')}`,
      403,
      'FORBIDDEN',
    )
  }
  return session
}

export async function requireRole(role: string): Promise<SessionPayload> {
  const session = await requireSession()
  if (!session.roleCodes.includes(role)) {
    throw new AuthError(
      `Forbidden: butuh role "${role}"`,
      403,
      'FORBIDDEN',
    )
  }
  return session
}

// ============================================================
// Konteks request (untuk audit log)
// ============================================================

export type RequestContext = {
  ipAddress: string | null
  userAgent: string | null
  requestId: string
}

export async function getRequestContext(): Promise<RequestContext> {
  const h = await headers()

  const cfIp = h.get('cf-connecting-ip')
  const realIp = h.get('x-real-ip')
  const xff = h.get('x-forwarded-for')
  const ipAddress = cfIp ?? realIp ?? xff?.split(',')[0].trim() ?? null

  const userAgent = h.get('user-agent')

  const requestId =
    h.get('x-request-id') ??
    crypto.randomUUID()

  return { ipAddress, userAgent, requestId }
}

// ============================================================
// Bangun konteks audit dari session + request
// ============================================================

export type AuditContext = {
  userId?: string
  userEmail?: string
  userRole?: string
  ipAddress?: string
  userAgent?: string
  requestId?: string
}

export async function buildAuditContext(
  session?: SessionPayload | null,
): Promise<AuditContext> {
  const reqCtx = await getRequestContext()

  return {
    userId: session?.userId,
    userEmail: session?.email,
    userRole: session?.roleCodes[0],
    ipAddress: reqCtx.ipAddress ?? undefined,
    userAgent: reqCtx.userAgent ?? undefined,
    requestId: reqCtx.requestId,
  }
}