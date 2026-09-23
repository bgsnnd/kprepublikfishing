'use client'

import { useEffect, useState } from 'react'
import { Loader2, Copy, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type AuditDetailDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  logId: string
}

type PermissionDetail = {
  id: string
  code: string | null
  name: string | null
}

type RoleDetail = {
  id: string
  code: string | null
  name: string | null
}

type AuditDetail = {
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
  createdAt: string
  user: { name: string; username: string } | null
}

const SEVERITY_COLORS: Record<string, string> = {
  INFO: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30',
  WARNING:
    'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  CRITICAL: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
}

const FIELD_LABELS: Record<string, string> = {
  permissionIds: 'Permission',
  roleIds: 'Role',
  name: 'Nama',
  description: 'Deskripsi',
  isActive: 'Status Aktif',
  phone: 'No. Telepon',
  employeeTypeId: 'Tipe Karyawan',
  email: 'Email',
  username: 'Username',
  code: 'Kode',
  _permissionDetails: 'Detail Permission',
  _roleDetails: 'Detail Role',
}

function formatFieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key]
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

export function AuditDetailDialog({
  open,
  onOpenChange,
  logId,
}: AuditDetailDialogProps) {
  const [data, setData] = useState<AuditDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open || !logId) return

    const controller = new AbortController()
    let cancelled = false

    Promise.resolve().then(() => {
      if (cancelled) return
      setLoading(true)
      setData(null)
    })

    fetch(`/api/audit/${logId}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        if (json.success) setData(json.data)
        else toast.error(json.error?.message ?? 'Gagal memuat detail')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof Error && err.name === 'AbortError') return
        toast.error('Tidak dapat terhubung ke server')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [open, logId])

  async function copyJson() {
    if (!data) return
    const json = JSON.stringify(
      { before: data.before, after: data.after, changes: data.changes },
      null,
      2,
    )
    await navigator.clipboard.writeText(json)
    setCopied(true)
    toast.success('JSON dicopy ke clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const changes = data?.changes ?? null
  const metaFields: string[] = []
  const regularFields: string[] = []

  if (changes) {
    for (const key of Object.keys(changes)) {
      if (key.startsWith('_')) metaFields.push(key)
      else regularFields.push(key)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-lg">Detail Audit Log</DialogTitle>
              <DialogDescription className="mt-1">
                Informasi lengkap tentang aktivitas ini.
              </DialogDescription>
            </div>
            {data && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] shrink-0',
                  SEVERITY_COLORS[data.severity] ?? '',
                )}
              >
                {data.severity}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                Gagal memuat data
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* INFO GRID */}
              <div className="rounded-lg border divide-y overflow-hidden bg-card">
                <div className="grid grid-cols-2 sm:grid-cols-3 divide-x">
                  <InfoCell label="Action" value={data.action} mono />
                  <InfoCell label="Entity" value={data.entity} mono />
                  <InfoCell label="Module" value={data.module ?? '—'} mono />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-x">
                  <InfoCell
                    label="User"
                    value={
                      data.user
                        ? `${data.user.name} (@${data.user.username})`
                        : 'System'
                    }
                  />
                  <InfoCell label="Role" value={data.userRole ?? '—'} mono />
                  <InfoCell
                    label="Waktu"
                    value={new Date(data.createdAt).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'medium',
                    })}
                  />
                </div>
              </div>

              {/* Detail teknis */}
              {(data.ipAddress || data.userAgent) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  {data.ipAddress && (
                    <InfoRow
                      label="IP Address"
                      value={data.ipAddress}
                      mono
                      small
                    />
                  )}
                  {data.userAgent && (
                    <InfoRow
                      label="User Agent"
                      value={data.userAgent}
                      small
                      className="sm:col-span-2"
                    />
                  )}
                </div>
              )}

              <div className="border-t" />

              {/* PERUBAHAN */}
              {changes && regularFields.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Perubahan Data</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyJson}
                      className="h-7 text-xs text-muted-foreground"
                    >
                      {copied ? (
                        <>
                          <Check className="mr-1.5 h-3 w-3" /> Tercopy
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1.5 h-3 w-3" /> Copy JSON
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {regularFields.map((field) => {
                      const change = changes[field]
                      const isArrayField =
                        Array.isArray(change.from) ||
                        Array.isArray(change.to)

                      return (
                        <div key={field} className="space-y-2">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {formatFieldLabel(field)}
                          </div>
                          {isArrayField ? (
                            <ArrayDiff change={change} />
                          ) : (
                            <ValueDiff change={change} />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Meta: permission/role details */}
                  {metaFields.length > 0 && (
                    <div className="space-y-4 pt-2">
                      {metaFields.map((field) => {
                        const detail = changes[field]
                        const items =
                          (detail.to as
                            | PermissionDetail[]
                            | RoleDetail[]
                            | null) ??
                          (detail.from as
                            | PermissionDetail[]
                            | RoleDetail[]
                            | null)
                        if (!Array.isArray(items) || items.length === 0)
                          return null

                        return (
                          <div key={field} className="space-y-2">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {formatFieldLabel(field)}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {items.map((item) => {
                                const code = 'code' in item ? item.code : null
                                const name = 'name' in item ? item.name : null
                                return (
                                  <Badge
                                    key={item.id}
                                    variant="secondary"
                                    className="font-mono text-[10px] h-auto py-1"
                                  >
                                    {code ?? name ?? '—'}
                                    {code && name && (
                                      <span className="ml-1.5 opacity-60 font-sans">
                                        {name}
                                      </span>
                                    )}
                                  </Badge>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : data.before || data.after ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Snapshot Data</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyJson}
                      className="h-7 text-xs text-muted-foreground"
                    >
                      {copied ? (
                        <>
                          <Check className="mr-1.5 h-3 w-3" /> Tercopy
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1.5 h-3 w-3" /> Copy JSON
                        </>
                      )}
                    </Button>
                  </div>

                  {data.before ? (
                    <JsonBlock label="Before" data={data.before} />
                  ) : null}
                  {data.after ? (
                    <JsonBlock label="After" data={data.after} />
                  ) : null}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Tidak ada detail perubahan
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Sub-components
// ============================================================

function InfoCell({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="px-4 py-3 min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
        {label}
      </div>
      <div
        className={cn('text-sm truncate', mono && 'font-mono text-xs')}
        title={value}
      >
        {value}
      </div>
    </div>
  )
}

function InfoRow({
  label,
  value,
  mono = false,
  small = false,
  className,
}: {
  label: string
  value: string
  mono?: boolean
  small?: boolean
  className?: string
}) {
  return (
    <div className={cn('space-y-1 min-w-0', className)}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
        {label}
      </div>
      <div
        className={cn(
          'break-all',
          mono && 'font-mono',
          small ? 'text-xs' : 'text-sm',
        )}
      >
        {value}
      </div>
    </div>
  )
}

function ValueDiff({
  change,
}: {
  change: { from: unknown; to: unknown }
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-sm overflow-hidden">
      <span className="font-mono text-xs text-muted-foreground line-through truncate">
        {formatValue(change.from)}
      </span>
      <span className="text-muted-foreground shrink-0">→</span>
      <span className="font-mono text-xs font-medium truncate">
        {formatValue(change.to)}
      </span>
    </div>
  )
}

function ArrayDiff({
  change,
}: {
  change: { from: unknown; to: unknown }
}) {
  const fromArr = Array.isArray(change.from) ? change.from : []
  const toArr = Array.isArray(change.to) ? change.to : []

  const fromSet = new Set(fromArr.map((v) => formatValue(v)))
  const toSet = new Set(toArr.map((v) => formatValue(v)))

  const added = toArr.filter((v) => !fromSet.has(formatValue(v)))
  const removed = fromArr.filter((v) => !toSet.has(formatValue(v)))

  return (
    <div className="space-y-2">
      {removed.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {removed.map((v, i) => (
            <Badge
              key={`r-${i}`}
              variant="outline"
              className="font-mono text-[10px] h-auto py-1 border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400 line-through"
            >
              {formatValue(v)}
            </Badge>
          ))}
        </div>
      )}
      {added.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {added.map((v, i) => (
            <Badge
              key={`a-${i}`}
              variant="outline"
              className="font-mono text-[10px] h-auto py-1 border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
            >
              {formatValue(v)}
            </Badge>
          ))}
        </div>
      )}
      {removed.length === 0 && added.length === 0 && (
        <div className="text-xs text-muted-foreground italic">
          {toArr.length} item (tidak ada perubahan)
        </div>
      )}
    </div>
  )
}

function JsonBlock({
  label,
  data,
}: {
  label: string
  data: unknown
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      <pre className="rounded-lg border bg-muted/30 p-3 text-xs font-mono overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}