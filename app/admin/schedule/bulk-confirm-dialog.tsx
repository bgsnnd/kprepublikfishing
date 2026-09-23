/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  CalendarDays,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ============================================================
// Types
// ============================================================

type PendingShift = {
  id: string
  userName: string
  username: string
  shiftDate: string
  startTime: string
  endTime: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmed?: () => void
}

const WIB_TZ = 'Asia/Jakarta'

// ============================================================
// Helpers
// ============================================================

function formatTimeWIB(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: WIB_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatDateWIB(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    timeZone: WIB_TZ,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ============================================================
// Component
// ============================================================

export function BulkConfirmDialog({
  open,
  onOpenChange,
  onConfirmed,
}: Props) {
  const router = useRouter()

  const [shifts, setShifts] = useState<PendingShift[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch pending shifts saat dialog dibuka
  useEffect(() => {
    if (!open) return

    let cancelled = false
    setFetching(true)
    setError(null)

    fetch('/api/shifts/pending')
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        if (json.error) {
          setError(json.error.message ?? 'Gagal memuat data')
          return
        }
        const list: PendingShift[] = json.data?.shifts ?? []
        setShifts(list)
        setSelected(new Set(list.map((s) => s.id)))
      })
      .catch(() => {
        if (!cancelled) setError('Tidak dapat terhubung ke server')
      })
      .finally(() => {
        if (!cancelled) setFetching(false)
      })

    return () => {
      cancelled = true
    }
  }, [open])

  // Reset saat dialog ditutup
  useEffect(() => {
    if (!open) {
      setShifts([])
      setSelected(new Set())
      setError(null)
    }
  }, [open])

  const allSelected = shifts.length > 0 && selected.size === shifts.length

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(shifts.map((s) => s.id)))
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleConfirm() {
    if (selected.size === 0) {
      toast.error('Pilih minimal 1 shift')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/shifts/bulk-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal konfirmasi')
        return
      }

      toast.success(
        json.data?.message ?? `${selected.size} shift dikonfirmasi`,
      )
      onOpenChange(false)
      onConfirmed?.()
      router.refresh()
    } catch {
      toast.error('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Konfirmasi Shift Massal
          </DialogTitle>
          <DialogDescription>
            Pilih shift yang mau dikonfirmasi. Shift yang belum dikonfirmasi
            gak bisa dipakai buat absen.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-6 py-5">
            {/* Loading */}
            {fetching && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Error */}
            {!fetching && error && (
              <div className="flex items-start gap-2 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div className="text-sm text-destructive">{error}</div>
              </div>
            )}

            {/* Empty */}
            {!fetching && !error && shifts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500/30 mb-3" />
                <p className="text-sm font-medium">
                  Semua shift udah dikonfirmasi
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Gak ada shift yang statusnya SCHEDULED.
                </p>
              </div>
            )}

            {/* List */}
            {!fetching && !error && shifts.length > 0 && (
              <div className="space-y-3">
                {/* Header select all */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      disabled={loading}
                    />
                    <span className="text-sm font-medium">
                      Pilih Semua ({shifts.length} shift)
                    </span>
                  </label>
                  <Badge variant="secondary" className="tabular-nums">
                    {selected.size} dipilih
                  </Badge>
                </div>

                {/* List shift */}
                <div className="rounded-lg border divide-y max-h-[400px] overflow-y-auto">
                  {shifts.map((s) => {
                    const checked = selected.has(s.id)
                    return (
                      <label
                        key={s.id}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors',
                          checked ? 'bg-emerald-500/5' : 'hover:bg-muted/30',
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleOne(s.id)}
                          disabled={loading}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">{s.userName}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              @{s.username}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <CalendarDays className="h-3 w-3" />
                            <span>{formatDateWIB(s.shiftDate)}</span>
                            <span className="font-mono tabular-nums">
                              {formatTimeWIB(s.startTime)} –{' '}
                              {formatTimeWIB(s.endTime)}
                            </span>
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t bg-muted/30 px-6 py-4">
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={loading || selected.size === 0 || shifts.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Konfirmasi {selected.size} Shift
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}