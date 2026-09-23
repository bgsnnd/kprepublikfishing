import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/app/generated/prisma/client'

type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

type AuditContext = {
  userId?: string
  userEmail?: string
  userRole?: string
  ipAddress?: string
  userAgent?: string
  requestId?: string
}

type AuditParams = {
  action: string
  entity: string
  entityId?: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  module?: string
  severity?: AuditSeverity
  req?: Request
  context?: AuditContext  // opsional, override
}

// Field yang TIDAK boleh masuk audit log (sensitif)
const REDACTED_FIELDS = new Set([
  'passwordHash',
  'password',
  'faceEmbedding',      // embedding wajah = data biometrik, sensitif!
  'tokenHash',
  'accessToken',
  'refreshToken',
])

const REDACTED_VALUE = '[REDACTED]'

type ChangeEntry = { from: unknown; to: unknown }
type ChangesMap = Record<string, ChangeEntry>

/**
 * Bandingkan dua object, kembalikan hanya field yang berubah.
 * - Redact field sensitif
 * - Handle Date, null, undefined dengan konsisten
 * - Skip field yang tidak serializable
 */
function diffObjects(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): ChangesMap | null {
  if (!before || !after) return null

  const changes: ChangesMap = {}
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])

  for (const k of keys) {
    if (REDACTED_FIELDS.has(k)) {
      // Kalau field sensitif berubah, catat "changed" tanpa nilai asli
      const oldRaw = JSON.stringify(before[k])
      const newRaw = JSON.stringify(after[k])
      if (oldRaw !== newRaw) {
        changes[k] = { from: REDACTED_VALUE, to: REDACTED_VALUE }
      }
      continue
    }

    const oldVal = normalizeValue(before[k])
    const newVal = normalizeValue(after[k])

    if (!isEqual(oldVal, newVal)) {
      changes[k] = { from: oldVal, to: newVal }
    }
  }

  return Object.keys(changes).length ? changes : null
}

/**
 * Normalisasi nilai: Date → ISO string, undefined → null, BigInt → string
 */
function normalizeValue(val: unknown): unknown {
  if (val === undefined) return null
  if (val === null) return null
  if (val instanceof Date) return val.toISOString()
  if (typeof val === 'bigint') return val.toString()
  if (Array.isArray(val)) return val.map(normalizeValue)
  if (typeof val === 'object' && val !== null) {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(val)) {
      if (REDACTED_FIELDS.has(k)) {
        result[k] = REDACTED_VALUE
      } else {
        result[k] = normalizeValue(v)
      }
    }
    return result
  }
  return val
}

/**
 * Deep equality sederhana. Untuk production, bisa pakai library seperti `fast-deep-equal`.
 */
function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null) return false
  if (typeof a !== typeof b) return false

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((v, i) => isEqual(v, b[i]))
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>
    const bObj = b as Record<string, unknown>
    const aKeys = Object.keys(aObj)
    const bKeys = Object.keys(bObj)
    if (aKeys.length !== bKeys.length) return false
    return aKeys.every((k) => isEqual(aObj[k], bObj[k]))
  }

  return false
}

/**
 * Ambil IP asli dari header proxy (Cloudflare, Nginx, Vercel, dll).
 */
function extractIp(req: Request | undefined): string | null {
  if (!req) return null

  // Cloudflare
  const cfIp = req.headers.get('cf-connecting-ip')
  if (cfIp) return cfIp

  // Vercel
  const vercelIp = req.headers.get('x-real-ip')
  if (vercelIp) return vercelIp

  // Standar proxy — ambil IP pertama (client asli)
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()

  return null
}

/**
 * Tulis audit log. TIDAK akan menggagalkan operasi utama kalau gagal.
 *
 * Untuk production, ganti console.error dengan:
 * - Sentry / Logtail / Axiom
 * - Message queue (BullMQ, QStash) untuk retry
 */
export async function writeAudit(params: AuditParams): Promise<void> {
  try {
    const changes = diffObjects(params.before, params.after)

    // Skip log kalau tidak ada perubahan (untuk UPDATE)
    if (params.action === 'UPDATE' && !changes) {
      return
    }

    const ipAddress = params.context?.ipAddress ?? extractIp(params.req)
    const userAgent = params.context?.userAgent ?? params.req?.headers.get('user-agent') ?? null

    await prisma.auditLog.create({
      data: {
        userId: params.context?.userId ?? null,
        userEmail: params.context?.userEmail ?? null,
        userRole: params.context?.userRole ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        before: (params.before ? normalizeValue(params.before) : null) as Prisma.InputJsonValue,
        after: (params.after ? normalizeValue(params.after) : null) as Prisma.InputJsonValue,
        changes: (changes ?? null) as Prisma.InputJsonValue,
        module: params.module ?? null,
        severity: params.severity ?? 'INFO',
        ipAddress,
        userAgent,
        requestId: params.context?.requestId ?? null,
      },
    })
  } catch (err) {
    // JANGAN throw — audit log tidak boleh menggagalkan operasi bisnis
    // Di production, kirim ke Sentry / logger:
    console.error('[audit] Failed to write audit log:', err, {
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
    })
  }
}

/**
 * Versi atomic: jalankan operasi + audit dalam satu transaksi.
 * Pakai ini kalau AUDIT WAJIB tercatat (misal: perubahan permission).
 */
export async function withAudit<T>(
  params: Omit<AuditParams, 'before' | 'after'>,
  fn: (tx: Prisma.TransactionClient) => Promise<{ result: T; before?: Record<string, unknown>; after?: Record<string, unknown> }>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const { result, before, after } = await fn(tx)
    const changes = diffObjects(before, after)

    if (params.action !== 'UPDATE' || changes) {
      await tx.auditLog.create({
        data: {
          userId: params.context?.userId ?? null,
          userEmail: params.context?.userEmail ?? null,
          userRole: params.context?.userRole ?? null,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId ?? null,
          before: (before ? normalizeValue(before) : null) as Prisma.InputJsonValue,
          after: (after ? normalizeValue(after) : null) as Prisma.InputJsonValue,
          changes: (changes ?? null) as Prisma.InputJsonValue,
          module: params.module ?? null,
          severity: params.severity ?? 'INFO',
          ipAddress: params.context?.ipAddress ?? extractIp(params.req),
          userAgent: params.context?.userAgent ?? params.req?.headers.get('user-agent') ?? null,
          requestId: params.context?.requestId ?? null,
        },
      })
    }

    return result
  })
}