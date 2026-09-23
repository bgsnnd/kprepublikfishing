import { NextResponse } from 'next/server'
import {
  AppError,
  isAppError,
  logError,
  normalizeError,
} from '@/lib/errors'

// ============================================================
// Tipe response standar
// ============================================================

export type ApiSuccess<T> = {
  success: true
  data: T
  meta?: Record<string, unknown>
}

export type ApiErrorBody = {
  success: false
  error: {
    code: string
    message: string
    fields?: Record<string, string[]>
  }
}

// ============================================================
// Response sukses
// ============================================================

export function ok<T>(
  data: T,
  init?: { status?: number; meta?: Record<string, unknown> },
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(init?.meta ? { meta: init.meta } : {}),
    },
    { status: init?.status ?? 200 },
  )
}

export function created<T>(data: T): NextResponse<ApiSuccess<T>> {
  return ok(data, { status: 201 })
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

// ============================================================
// Response error
// ============================================================

export function fail(error: AppError): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
    },
  }

  if (error.details?.fields) {
    body.error.fields = error.details.fields as Record<string, string[]>
  }

  return NextResponse.json(body, { status: error.statusCode })
}

// ============================================================
// Wrapper untuk route handler — auto error handling
// ============================================================

type Handler<T> = () => Promise<NextResponse<T>>

export async function withErrorHandler<T>(
  handler: Handler<T>,
  context?: Record<string, unknown>,
): Promise<NextResponse<T> | NextResponse<ApiErrorBody>> {
  try {
    return await handler()
  } catch (err) {
    const appError = normalizeError(err)

    // Log dengan konteks request
    logError(appError, {
      ...context,
      isOperational: appError.isOperational,
    })

    return fail(appError)
  }
}

// ============================================================
// Helper: parse body JSON dengan aman
// ============================================================

export async function parseJsonBody<T = unknown>(
  req: Request,
): Promise<T> {
  try {
    return (await req.json()) as T
  } catch {
    throw new AppError('Body request bukan JSON valid', 400, 'BAD_REQUEST')
  }
}

// ============================================================
// Guard untuk cek AppError (re-export)
// ============================================================

export { isAppError }