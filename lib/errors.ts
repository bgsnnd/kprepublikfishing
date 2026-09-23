// ============================================================
// Base error — semua error aplikasi turun dari sini
// ============================================================

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'BAD_REQUEST'

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: ErrorCode
  public readonly details?: Record<string, unknown>
  public readonly isOperational: boolean

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode,
    details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.isOperational = true // error yang "diharapkan", bukan bug

    // Fix prototype chain (TypeScript + Error)
    Object.setPrototypeOf(this, new.target.prototype)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

// ============================================================
// Error turunan — spesifik per kasus
// ============================================================

export class UnauthorizedError extends AppError {
  constructor(message = 'Anda belum login') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Anda tidak punya akses') {
    super(message, 403, 'FORBIDDEN')
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Data tidak ditemukan') {
    super(message, 404, 'NOT_FOUND')
  }
}

export class ValidationError extends AppError {
  constructor(
    message = 'Validasi gagal',
    public readonly fields: Record<string, string[]> = {},
  ) {
    super(message, 422, 'VALIDATION_ERROR', { fields })
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Data sudah ada') {
    super(message, 409, 'CONFLICT')
  }
}

export class RateLimitedError extends AppError {
  constructor(message = 'Terlalu banyak percobaan, coba lagi nanti') {
    super(message, 429, 'RATE_LIMITED')
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Request tidak valid') {
    super(message, 400, 'BAD_REQUEST')
  }
}

export class InternalError extends AppError {
  constructor(message = 'Terjadi kesalahan pada server') {
    super(message, 500, 'INTERNAL_ERROR')
  }
}

// ============================================================
// Guard: apakah error ini AppError?
// ============================================================

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError
}

// ============================================================
// Normalisasi error apa pun jadi AppError
// ============================================================

export function normalizeError(err: unknown): AppError {
  if (isAppError(err)) return err

  // Zod error
  if (err instanceof Error && err.name === 'ZodError') {
    return new ValidationError('Validasi gagal')
  }

  // Prisma error
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string'
  ) {
    const prismaCode = (err as { code: string }).code
    const prismaErr = err as { meta?: { target?: string[] } }

    switch (prismaCode) {
      case 'P2002': {
        const target = prismaErr.meta?.target?.join(', ') ?? 'field'
        return new ConflictError(`Data dengan ${target} ini sudah ada`)
      }
      case 'P2025':
        return new NotFoundError('Data tidak ditemukan')
      case 'P2003':
        return new BadRequestError('Referensi data tidak valid')
      default:
        return new InternalError('Kesalahan pada database')
    }
  }

  // Error umum
  if (err instanceof Error) {
    if (process.env.NODE_ENV === 'development') {
      return new InternalError(err.message)
    }
    return new InternalError()
  }

  return new InternalError()
}

// ============================================================
// Log error (dipakai oleh API handler)
// ============================================================

export function logError(err: AppError, context?: Record<string, unknown>): void {
  const logData = {
    name: err.name,
    code: err.code,
    message: err.message,
    statusCode: err.statusCode,
    details: err.details,
    ...context,
  }

  if (err.statusCode >= 500) {
    console.error('[ERROR]', logData)
    // Production: kirim ke Sentry / logger
    // Sentry.captureException(err, { extra: context })
  } else if (process.env.NODE_ENV === 'development') {
    console.warn('[WARN]', logData)
  }
}