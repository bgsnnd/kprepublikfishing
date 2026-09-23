'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Loader2, FileText, Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ListAuditResult, AuditUserOption } from '@/lib/audit/queries'
import type { ListAuditQuery } from '@/lib/validation/audit'
import { AuditDetailDialog } from './audit-detail-dialog'
import { Pagination } from '@/components/ui/pagination'

type FilterOptions = {
  actions: string[]
  entities: string[]
  modules: string[]
  severities: string[]
}

type AuditClientProps = {
  initialData: ListAuditResult
  filterOptions: FilterOptions
  users: AuditUserOption[]
  initialQuery: ListAuditQuery
}

type FilterOverrides = Partial<{
  q: string
  username: string
  action: string
  entity: string
  severity: string
  module: string
  dateFrom: string
  dateTo: string
  page: number
  perPage: number
}>

const ACTION_COLORS: Record<string, string> = {
  CREATE:
    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  UPDATE:
    'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  DELETE: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
  LOGIN:
    'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30',
  LOGOUT:
    'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30',
  APPROVE:
    'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
  EXPORT:
    'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
}

const SEVERITY_COLORS: Record<string, string> = {
  INFO: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30',
  WARNING:
    'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  CRITICAL: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
}

function formatRelative(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  if (hours < 24) return `${hours} jam lalu`
  if (days < 7) return `${days} hari lalu`
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function AuditClient({
  initialData,
  filterOptions,
  users,
  initialQuery,
}: AuditClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [q, setQ] = useState(initialQuery.q)
  const [username, setUsername] = useState(initialQuery.username || 'all')
  const [action, setAction] = useState(initialQuery.action || 'all')
  const [entity, setEntity] = useState(initialQuery.entity || 'all')
  const [severity, setSeverity] = useState(initialQuery.severity || 'all')
  const [moduleFilter, setModuleFilter] = useState(initialQuery.module || 'all')
  const [dateFrom, setDateFrom] = useState(initialQuery.dateFrom)
  const [dateTo, setDateTo] = useState(initialQuery.dateTo)
  const [showFilters, setShowFilters] = useState(false)

  const [detailId, setDetailId] = useState<string | null>(null)

  function buildParams(overrides: FilterOverrides = {}): URLSearchParams {
    const params = new URLSearchParams(searchParams.toString())

    const set = (key: string, value: string) => {
      if (value && value !== 'all') params.set(key, value)
      else params.delete(key)
    }

    set('q', overrides.q ?? q)
    set('username', overrides.username ?? username)
    set('action', overrides.action ?? action)
    set('entity', overrides.entity ?? entity)
    set('severity', overrides.severity ?? severity)
    set('module', overrides.module ?? moduleFilter)
    set('dateFrom', overrides.dateFrom ?? dateFrom)
    set('dateTo', overrides.dateTo ?? dateTo)

    const page = overrides.page ?? 1
    if (page > 1) params.set('page', String(page))
    else params.delete('page')

    const perPage = overrides.perPage ?? initialData.perPage
    if (perPage !== 25) params.set('perPage', String(perPage))
    else params.delete('perPage')

    return params
  }

  function apply(overrides: FilterOverrides = {}) {
    const params = buildParams({ page: 1, ...overrides })
    startTransition(() => {
      router.push(`/admin/audit?${params.toString()}`)
    })
  }

  function resetFilters() {
    setQ('')
    setUsername('all')
    setAction('all')
    setEntity('all')
    setSeverity('all')
    setModuleFilter('all')
    setDateFrom('')
    setDateTo('')
    startTransition(() => {
      router.push('/admin/audit')
    })
  }

  const hasActiveFilters =
    q ||
    username !== 'all' ||
    action !== 'all' ||
    entity !== 'all' ||
    severity !== 'all' ||
    moduleFilter !== 'all' ||
    dateFrom ||
    dateTo

  const { items, total, page, totalPages, perPage } = initialData
  const startIdx = (page - 1) * perPage + 1
  const endIdx = Math.min(page * perPage, total)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Riwayat semua aktivitas yang tercatat di sistem.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters((s) => !s)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
            {hasActiveFilters && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 px-1.5 text-[10px]"
              >
                aktif
              </Badge>
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="mr-2 h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-2 lg:col-span-2">
                <Label className="text-xs">Cari</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Cari di email atau request ID..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') apply({ q })
                    }}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* User — pakai USERNAME */}
              <div className="space-y-2">
                <Label className="text-xs">User</Label>
                <Select
                  value={username}
                  onValueChange={(v: string | null) => {
                    const val = v ?? 'all'
                    setUsername(val)
                    apply({ username: val })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua User</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.username} value={u.username}>
                        {u.name} (@{u.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Action</Label>
                <Select
                  value={action}
                  onValueChange={(v: string | null) => {
                    const val = v ?? 'all'
                    setAction(val)
                    apply({ action: val })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Action</SelectItem>
                    {filterOptions.actions.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Entity</Label>
                <Select
                  value={entity}
                  onValueChange={(v: string | null) => {
                    const val = v ?? 'all'
                    setEntity(val)
                    apply({ entity: val })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Entity</SelectItem>
                    {filterOptions.entities.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Module</Label>
                <Select
                  value={moduleFilter}
                  onValueChange={(v: string | null) => {
                    const val = v ?? 'all'
                    setModuleFilter(val)
                    apply({ module: val })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Module</SelectItem>
                    {filterOptions.modules.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Severity</Label>
                <Select
                  value={severity}
                  onValueChange={(v: string | null) => {
                    const val = v ?? 'all'
                    setSeverity(val)
                    apply({ severity: val })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Severity</SelectItem>
                    {filterOptions.severities.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Dari Tanggal</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value)
                    apply({ dateFrom: e.target.value })
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Sampai Tanggal</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value)
                    apply({ dateTo: e.target.value })
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Riwayat Aktivitas</CardTitle>
              <CardDescription>
                {total === 0
                  ? 'Tidak ada log ditemukan'
                  : `Menampilkan ${startIdx}–${endIdx} dari ${total} log`}
              </CardDescription>
            </div>
            {isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Belum ada log aktivitas
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {items.map((log) => (
                <button
                  key={log.id}
                  onClick={() => setDetailId(log.id)}
                  className="w-full text-left px-4 sm:px-6 py-3.5 hover:bg-muted/30 transition-colors flex items-start gap-3"
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      'font-mono text-[10px] shrink-0 mt-0.5',
                      ACTION_COLORS[log.action] ?? '',
                    )}
                  >
                    {log.action}
                  </Badge>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">
                        {log.userName ?? log.userUsername ?? 'System'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {log.action.toLowerCase()} {log.entity}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{formatRelative(log.createdAt)}</span>
                      {log.module && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{log.module}</span>
                        </>
                      )}
                      {log.ipAddress && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{log.ipAddress}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] shrink-0',
                      SEVERITY_COLORS[log.severity] ?? '',
                    )}
                  >
                    {log.severity}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>

        {totalPages > 0 && (
          <div className="border-t px-4 sm:px-6 py-3">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              perPage={perPage}
              onPageChange={(p: number) => apply({ page: p })}
              onPerPageChange={(pp: number) =>
                apply({ page: 1, perPage: pp })
              }
              disabled={isPending}
            />
          </div>
        )}
      </Card>

      {detailId && (
        <AuditDetailDialog
          open={true}
          onOpenChange={(o: boolean) => !o && setDetailId(null)}
          logId={detailId}
        />
      )}
    </div>
  )
}