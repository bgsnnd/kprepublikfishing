'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  AlertCircle,
  Wand2,
  CalendarDays,
  CheckCircle2,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultMonth?: number
  defaultYear?: number
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function todayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function GeneratePayrollDialog({
  open,
  onOpenChange,
  defaultMonth,
  defaultYear,
}: Props) {
  const router = useRouter()

  const [periodType, setPeriodType] = useState<string>('MONTHLY_CUSTOM')
  const [month, setMonth] = useState(defaultMonth ?? new Date().getMonth() + 1)
  const [year, setYear] = useState(defaultYear ?? new Date().getFullYear())
  const [date, setDate] = useState(todayISO())
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    created: number
    updated: number
    skipped: number
    errored: number
  } | null>(null)

  // Fetch periodType saat dialog dibuka
  useEffect(() => {
    if (!open) return

    let cancelled = false

    fetch('/api/settings/payroll')
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        const type = json?.data?.periodType ?? 'MONTHLY_CUSTOM'
        setPeriodType(type)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [open])

  async function handleGenerate() {
    setLoading(true)
    setResult(null)

    try {
      const body: Record<string, unknown> = {
        periodMonth: month,
        periodYear: year,
      }

      if (periodType === 'DAILY' || periodType === 'WEEKLY') {
        body.date = date
        // Sync month/year dari date biar konsisten
        if (date) {
          const [y, m] = date.split('-').map(Number)
          body.periodMonth = m
          body.periodYear = y
        }
      }

      const res = await fetch('/api/payroll/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal generate payroll')
        return
      }

      const data = json.data

      setResult({
        created: data.created,
        updated: data.updated,
        skipped: data.skipped,
        errored: data.errored,
      })

      toast.success(data.message ?? 'Payroll berhasil digenerate')
      router.refresh()
    } catch {
      toast.error('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setResult(null)
    onOpenChange(nextOpen)
  }

  const isDaily = periodType === 'DAILY'
  const isWeekly = periodType === 'WEEKLY'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-violet-600" />
            Generate Payroll
          </DialogTitle>
          <DialogDescription>
            {isDaily
              ? 'Hitung gaji untuk tanggal tertentu.'
              : isWeekly
                ? 'Hitung gaji untuk minggu yang dipilih.'
                : 'Hitung gaji semua karyawan aktif untuk periode terpilih.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Periode */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {isDaily ? 'Tanggal' : isWeekly ? 'Minggu (dari)' : 'Periode'}
            </Label>

            {/* DAILY / WEEKLY: date picker */}
            {(isDaily || isWeekly) && (
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={loading}
              />
            )}

            {/* MONTHLY: month + year picker */}
            {!isDaily && !isWeekly && (
              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={String(month)}
                  onValueChange={(v: string | null) =>
                    setMonth(Number(v ?? month))
                  }
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, idx) => (
                      <SelectItem key={idx + 1} value={String(idx + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(year)}
                  onValueChange={(v: string | null) =>
                    setYear(Number(v ?? year))
                  }
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p>
                  Payroll yang sudah ada dengan status <strong>DRAFT</strong>{' '}
                  akan di-update. Payroll dengan status <strong>APPROVED</strong>{' '}
                  / <strong>PAID</strong> akan dilewati.
                </p>
              </div>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/5 p-3 space-y-1">
              <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Hasil Generate:
              </p>
              <ul className="text-xs text-emerald-700 dark:text-emerald-400 space-y-0.5 pl-5">
                <li>{result.created} dibuat</li>
                {result.updated > 0 && <li>{result.updated} diupdate</li>}
                {result.skipped > 0 && <li>{result.skipped} dilewati</li>}
                {result.errored > 0 && (
                  <li className="text-red-600">{result.errored} error</li>
                )}
              </ul>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              {result ? 'Tutup' : 'Batal'}
            </Button>
            <Button type="button" onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Generate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}