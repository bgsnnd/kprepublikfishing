import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/lib/prisma'
import type { ListAuditQuery } from '@/lib/validation/audit'

export type AuditLogItem = {
  id: string
  userName: string | null
  userUsername: string | null
  userRole: string | null
  action: string
  entity: string
  module: string | null
  severity: string
  ipAddress: string | null
  createdAt: Date
  hasChanges: boolean
}

export type ListAuditResult = {
  items: AuditLogItem[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export type AuditUserOption = {
  username: string
  name: string
}

// ============================================================
// List audit logs — filter by USERNAME
// ============================================================

export async function listAuditLogs(
  query: ListAuditQuery,
): Promise<ListAuditResult> {
  const {
    q,
    username,
    action,
    entity,
    severity,
    module,
    dateFrom,
    dateTo,
    page,
    perPage,
  } = query

  const where: Prisma.AuditLogWhereInput = {
    ...(q
      ? {
          OR: [
            { userEmail: { contains: q, mode: 'insensitive' } },
            { requestId: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(username ? { user: { username } } : {}),
    ...(action ? { action } : {}),
    ...(entity ? { entity } : {}),
    ...(severity ? { severity } : {}),
    ...(module ? { module } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo
              ? { lte: new Date(`${dateTo}T23:59:59.999Z`) }
              : {}),
          },
        }
      : {}),
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        userRole: true,
        action: true,
        entity: true,
        module: true,
        severity: true,
        ipAddress: true,
        createdAt: true,
        changes: true,
        user: { select: { name: true, username: true } },
      },
    }),
  ])

  return {
    items: logs.map((l) => ({
      id: l.id,
      userName: l.user?.name ?? null,
      userUsername: l.user?.username ?? null,
      userRole: l.userRole,
      action: l.action,
      entity: l.entity,
      module: l.module,
      severity: l.severity,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
      hasChanges: l.changes !== null,
    })),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

// ============================================================
// Detail + enrich
// ============================================================

export type AuditDetail = {
  id: string
  userRole: string | null
  action: string
  entity: string
  before: unknown
  after: unknown
  changes: Record<string, { from: unknown; to: unknown }> | null
  module: string | null
  severity: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  user: { name: string; username: string } | null
}

export async function getAuditDetail(id: string): Promise<AuditDetail | null> {
  const log = await prisma.auditLog.findUnique({
    where: { id },
    select: {
      id: true,
      userRole: true,
      action: true,
      entity: true,
      before: true,
      after: true,
      changes: true,
      module: true,
      severity: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      user: { select: { name: true, username: true } },
    },
  })

  if (!log) return null

  const { before, after, changes } = await enrichAuditData(
    log.entity,
    log.before,
    log.after,
  )

  return {
    id: log.id,
    userRole: log.userRole,
    action: log.action,
    entity: log.entity,
    before,
    after,
    changes,
    module: log.module,
    severity: log.severity,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
    user: log.user,
  }
}

// ============================================================
// Enrichment
// ============================================================

async function enrichAuditData(
  entity: string,
  before: unknown,
  after: unknown,
): Promise<{
  before: unknown
  after: unknown
  changes: Record<string, { from: unknown; to: unknown }> | null
}> {
  const enrichedBefore = await enrichOne(entity, before)
  const enrichedAfter = await enrichOne(entity, after)
  const changes = computeChanges(enrichedBefore, enrichedAfter)

  return {
    before: enrichedBefore,
    after: enrichedAfter,
    changes,
  }
}

async function enrichOne(
  entity: string,
  data: unknown,
): Promise<unknown> {
  if (!data || typeof data !== 'object') return data

  const obj = { ...(data as Record<string, unknown>) }

  if (entity === 'Role') {
    await enrichRole(obj)
  } else if (entity === 'User') {
    await enrichUser(obj)
  } else if (entity === 'Product') {
    await enrichProduct(obj)
  }

  return obj
}

async function enrichRole(obj: Record<string, unknown>): Promise<void> {
  const ids = normalizeStringArray(obj.permissionIds)
  if (ids.length === 0) return

  const permissions = await prisma.permission.findMany({
    where: { id: { in: ids } },
    select: { id: true, code: true, name: true },
  })

  const map = new Map(permissions.map((p) => [p.id, p]))
  const details = ids.map((id) => {
    const p = map.get(id)
    if (!p) {
      return { id, code: '(dihapus)', name: '(permission sudah dihapus)' }
    }
    return { id: p.id, code: p.code, name: p.name }
  })

  obj._permissionDetails = details
  obj.permissionIds = details.map((d) => d.code ?? d.name ?? d.id)
}

async function enrichUser(obj: Record<string, unknown>): Promise<void> {
  const ids = normalizeStringArray(obj.roleIds)
  if (ids.length === 0) return

  const roles = await prisma.role.findMany({
    where: { id: { in: ids } },
    select: { id: true, code: true, name: true },
  })

  const map = new Map(roles.map((r) => [r.id, r]))
  const details = ids.map((id) => {
    const r = map.get(id)
    if (!r) {
      return { id, code: '(dihapus)', name: '(role sudah dihapus)' }
    }
    return { id: r.id, code: r.code, name: r.name }
  })

  obj._roleDetails = details
  obj.roleIds = details.map((d) => d.code ?? d.name ?? d.id)
}

async function enrichProduct(obj: Record<string, unknown>): Promise<void> {
  const categoryId = obj.categoryId
  if (typeof categoryId !== 'string' || !categoryId) return

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true },
  })

  if (category) {
    obj._categoryName = category.name
    obj.categoryId = category.name
  }
}

function normalizeStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return []
  return val.filter((v): v is string => typeof v === 'string')
}

function computeChanges(
  before: unknown,
  after: unknown,
): Record<string, { from: unknown; to: unknown }> | null {
  if (!before && !after) return null

  const b = (before ?? {}) as Record<string, unknown>
  const a = (after ?? {}) as Record<string, unknown>

  const keys = new Set([...Object.keys(b), ...Object.keys(a)])
  const changes: Record<string, { from: unknown; to: unknown }> = {}

  for (const k of keys) {
    if (k.startsWith('_')) continue
    if (JSON.stringify(b[k]) !== JSON.stringify(a[k])) {
      changes[k] = { from: b[k], to: a[k] }
    }
  }

  if (a._permissionDetails) {
    changes._permissionDetails = { from: null, to: a._permissionDetails }
  }
  if (a._roleDetails) {
    changes._roleDetails = { from: null, to: a._roleDetails }
  }

  return Object.keys(changes).length ? changes : null
}

// ============================================================
// Filter options
// ============================================================

export async function getAuditFilterOptions() {
  const [actions, entities, modules, severities] = await Promise.all([
    prisma.auditLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    }),
    prisma.auditLog.findMany({
      distinct: ['entity'],
      select: { entity: true },
      orderBy: { entity: 'asc' },
    }),
    prisma.auditLog.findMany({
      distinct: ['module'],
      select: { module: true },
      orderBy: { module: 'asc' },
    }),
    prisma.auditLog.findMany({
      distinct: ['severity'],
      select: { severity: true },
      orderBy: { severity: 'asc' },
    }),
  ])

  return {
    actions: actions.map((a) => a.action).filter(Boolean),
    entities: entities.map((e) => e.entity).filter(Boolean),
    modules: modules
      .map((m) => m.module)
      .filter((m): m is string => !!m),
    severities: severities.map((s) => s.severity).filter(Boolean),
  }
}

/**
 * User unik dari audit log — pakai USERNAME.
 */
export async function getAuditUsers(): Promise<AuditUserOption[]> {
  const users = await prisma.user.findMany({
    where: {
      auditLogs: { some: {} },
    },
    select: { username: true, name: true },
    orderBy: { name: 'asc' },
  })

  return users
}