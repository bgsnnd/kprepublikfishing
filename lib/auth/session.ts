import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'

const ACCESS_COOKIE = 'access_token'
const REFRESH_COOKIE = 'refresh_token'

const ACCESS_EXPIRES_SECONDS = 60 * 15          // 15 menit
const REFRESH_EXPIRES_SECONDS = 60 * 60 * 24 * 7 // 7 hari

const accessSecret = new TextEncoder().encode(env.JWT_SECRET)
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET)

// ============================================================
// Tipe payload
// ============================================================

export type SessionPayload = {
  userId: string
  email: string
  username: string
  name: string
  roleCodes: string[]
  permissions: string[]
}

type TokenType = 'access' | 'refresh'

type RawTokenPayload = JWTPayload & {
  userId?: string
  email?: string
  username?: string
  name?: string
  roleCodes?: string[]
  permissions?: string[]
  type?: TokenType
}

// ============================================================
// Buat token
// ============================================================

async function signToken(
  payload: SessionPayload,
  type: TokenType,
  expiresInSeconds: number,
): Promise<string> {
  const secret = type === 'access' ? accessSecret : refreshSecret

  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    username: payload.username,
    name: payload.name,
    roleCodes: payload.roleCodes,
    permissions: payload.permissions,
    type,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('kprepublikfishing')
    .setAudience('kprepublikfishing-admin')
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(secret)
}

// ============================================================
// Verifikasi token
// ============================================================

export async function verifyAccessToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret, {
      issuer: 'kprepublikfishing',
      audience: 'kprepublikfishing-admin',
    })

    const raw = payload as RawTokenPayload
    if (raw.type !== 'access') return null
    if (!raw.userId || !raw.email) return null

    return {
      userId: raw.userId,
      email: raw.email,
      username: raw.username ?? '',
      name: raw.name ?? '',
      roleCodes: raw.roleCodes ?? [],
      permissions: raw.permissions ?? [],
    }
  } catch {
    return null
  }
}

export async function verifyRefreshToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, refreshSecret, {
      issuer: 'kprepublikfishing',
      audience: 'kprepublikfishing-admin',
    })

    const raw = payload as RawTokenPayload
    if (raw.type !== 'refresh') return null
    if (!raw.userId || !raw.email) return null

    return {
      userId: raw.userId,
      email: raw.email,
      username: raw.username ?? '',
      name: raw.name ?? '',
      roleCodes: raw.roleCodes ?? [],
      permissions: raw.permissions ?? [],
    }
  } catch {
    return null
  }
}

// ============================================================
// Set / hapus cookie
// ============================================================

export async function setSessionCookies(payload: SessionPayload): Promise<void> {
  const accessToken = await signToken(payload, 'access', ACCESS_EXPIRES_SECONDS)
  const refreshToken = await signToken(payload, 'refresh', REFRESH_EXPIRES_SECONDS)

  const cookieStore = await cookies()
  const isProd = env.NODE_ENV === 'production'

  cookieStore.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_EXPIRES_SECONDS,
  })

  cookieStore.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_EXPIRES_SECONDS,
  })
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(ACCESS_COOKIE)
  cookieStore.delete(REFRESH_COOKIE)
}

// ============================================================
// Ambil session dari cookie
// ============================================================

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(ACCESS_COOKIE)?.value
  if (!token) return null
  return verifyAccessToken(token)
}

export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(REFRESH_COOKIE)?.value ?? null
}

export const SESSION_COOKIES = {
  ACCESS: ACCESS_COOKIE,
  REFRESH: REFRESH_COOKIE,
} as const