'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  Printer,
  CheckCircle2,
  Loader2,
  Wallet,
  Clock,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  User,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import {
  PAYROLL_STATUS_LABELS,
  PAYROLL_STATUS_COLORS,
} from '@/lib/validation/payroll'

// ============================================================
// Types
// ============================================================

type PayrollDetail = {
  id: string
  periodMonth: number
  periodYear: number
  periodStart: Date
  periodEnd: Date
  workingDays: number
  presentDays: number
  absentDays: number
  lateDays: number
  totalLateMinutes: number
  totalWorkMinutes: number
  grossEarning: number
  totalDeduction: number
  netSalary: number
  status: string
  approvedById: string | null
  approvedAt: Date | null
  paidAt: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    username: string
    name: string
    employeeType: { name: string } | null
  }
  items: {
    id: string
    componentCode: string
    componentName: string
    componentType: string
    calcMethod: string
    baseAmount: number
    quantity: number | null
    finalAmount: number
    notes: string | null
  }[]
}

type Props = {
  payroll: PayrollDetail
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

// ============================================================
// Component
// ============================================================

export function PayrollDetailClient({ payroll }: Props) {
  const router = useRouter()
  const [approveOpen, setApproveOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const canApprove = payroll.status === 'DRAFT'
  const canPrint = payroll.status === 'APPROVED' || payroll.status === 'PAID'

  const earnings = payroll.items.filter((i) => i.componentType === 'EARNING')
  const deductions = payroll.items.filter((i) => i.componentType === 'DEDUCTION')

  function formatRp(n: number): string {
    return 'Rp ' + n.toLocaleString('id-ID')
  }

  function formatDate(d: Date | null): string {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  function formatDateTime(d: Date | null): string {
    if (!d) return '—'
    return new Date(d).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  async function handleApprove() {
    setLoading(true)
    try {
      const res = await fetch(`/api/payroll/${payroll.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: '' }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal approve')
        return
      }

      toast.success('Payroll disetujui')
      setApproveOpen(false)
      router.refresh()
    } catch {
      toast.error('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Link
            href="/admin/payroll"
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Detail Payroll</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {payroll.user.name} · {MONTHS[payroll.periodMonth - 1]}{' '}
              {payroll.periodYear}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canApprove && (
            <Button onClick={() => setApproveOpen(true)}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Setujui
            </Button>
          )}
          {canPrint && (
            <Button
              variant="outline"
              onClick={() =>
                window.open(`/admin/payroll/${payroll.id}/print`, '_blank')
              }
            >
              <Printer className="mr-2 h-4 w-4" />
              Cetak Slip
            </Button>
          )}
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <InfoItem
              icon={User}
              label="Karyawan"
              value={payroll.user.name}
              sub={`@${payroll.user.username}`}
            />
            <InfoItem
              icon={CalendarDays}
              label="Periode"
              value={`${MONTHS[payroll.periodMonth - 1]} ${payroll.periodYear}`}
              sub={`${formatDate(payroll.periodStart)} – ${formatDate(payroll.periodEnd)}`}
            />
            <InfoItem
              icon={Clock}
              label="Status"
              value={PAYROLL_STATUS_LABELS[payroll.status] ?? payroll.status}
              badge
              badgeClass={PAYROLL_STATUS_COLORS[payroll.status]}
            />
            <InfoItem
              icon={Wallet}
              label="Gaji Bersih"
              value={formatRp(payroll.netSalary)}
              valueClass="text-emerald-600 dark:text-emerald-400 font-bold"
            />
          </div>
        </CardContent>
      </Card>

      {/* Grid: Absensi + Rincian */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Absensi */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Snapshot Absensi</CardTitle>
            <CardDescription>Data absensi periode ini</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SnapshotRow label="Hari Kerja" value={`${payroll.workingDays} hari`} />
            <SnapshotRow
              label="Hari Hadir"
              value={`${payroll.presentDays} hari`}
              tone="success"
            />
            <SnapshotRow
              label="Alpha"
              value={`${payroll.absentDays} hari`}
              tone={payroll.absentDays > 0 ? 'danger' : undefined}
            />
            <SnapshotRow
              label="Hari Telat"
              value={`${payroll.lateDays} hari`}
              tone={payroll.lateDays > 0 ? 'warning' : undefined}
            />
            <SnapshotRow
              label="Total Telat"
              value={`${payroll.totalLateMinutes} menit`}
              tone={payroll.totalLateMinutes > 0 ? 'warning' : undefined}
            />
            <SnapshotRow
              label="Total Jam Kerja"
              value={`${(payroll.totalWorkMinutes / 60).toFixed(1)} jam`}
            />
          </CardContent>
        </Card>

        {/* Rincian Gaji */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Rincian Gaji</CardTitle>
            <CardDescription>Breakdown pendapatan dan potongan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Earning */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold">Pendapatan</h3>
              </div>
              <div className="rounded-lg border divide-y">
                {earnings.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground text-center">
                    Tidak ada pendapatan
                  </div>
                ) : (
                  earnings.map((item) => (
                    <ItemRow key={item.id} item={item} formatRp={formatRp} />
                  ))
                )}
              </div>
              <div className="flex items-center justify-between mt-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/5 rounded-lg">
                <span className="text-sm font-medium">Total Pendapatan</span>
                <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatRp(payroll.grossEarning)}
                </span>
              </div>
            </div>

            {/* Deduction */}
            {deductions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <h3 className="text-sm font-semibold">Potongan</h3>
                </div>
                <div className="rounded-lg border divide-y">
                  {deductions.map((item) => (
                    <ItemRow key={item.id} item={item} formatRp={formatRp} />
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 px-3 py-2 bg-red-50 dark:bg-red-500/5 rounded-lg">
                  <span className="text-sm font-medium">Total Potongan</span>
                  <span className="text-sm font-bold tabular-nums text-red-600 dark:text-red-400">
                    −{formatRp(payroll.totalDeduction)}
                  </span>
                </div>
              </div>
            )}

            {/* Net */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white dark:bg-slate-800 rounded-lg">
              <span className="text-sm font-semibold uppercase tracking-wide">
                Gaji Bersih
              </span>
              <span className="text-lg font-bold tabular-nums">
                {formatRp(payroll.netSalary)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approval Info */}
      {(payroll.approvedAt || payroll.paidAt) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {payroll.approvedAt && (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-500/5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/20">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">Disetujui</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(payroll.approvedAt)}
                    </p>
                  </div>
                </div>
              )}
              {payroll.paidAt && (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-emerald-50/50 dark:bg-emerald-500/5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">Dibayar</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(payroll.paidAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approve Dialog */}
      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Setujui Payroll?</AlertDialogTitle>
            <AlertDialogDescription>
              Payroll <strong>{payroll.user.name}</strong> periode{' '}
              <strong>
                {MONTHS[payroll.periodMonth - 1]} {payroll.periodYear}
              </strong>{' '}
              akan disetujui. Setelah disetujui, payroll gak bisa di-edit lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleApprove()
              }}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Setujui
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================
// Sub-components
// ============================================================

function InfoItem({
  icon: Icon,
  label,
  value,
  sub,
  badge,
  badgeClass,
  valueClass,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
  badge?: boolean
  badgeClass?: string
  valueClass?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
        <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        {badge ? (
          <Badge variant="outline" className={cn('mt-1 text-xs', badgeClass)}>
            {value}
          </Badge>
        ) : (
          <p className={cn('text-sm font-semibold mt-0.5 truncate', valueClass)}>
            {value}
          </p>
        )}
        {sub && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>
        )}
      </div>
    </div>
  )
}

function SnapshotRow({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'success' | 'warning' | 'danger'
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-sm font-medium tabular-nums',
          tone === 'success' && 'text-emerald-600 dark:text-emerald-400',
          tone === 'warning' && 'text-amber-600 dark:text-amber-400',
          tone === 'danger' && 'text-red-600 dark:text-red-400',
        )}
      >
        {value}
      </span>
    </div>
  )
}

function ItemRow({
  item,
  formatRp,
}: {
  item: {
    id: string
    componentName: string
    calcMethod: string
    baseAmount: number
    quantity: number | null
    finalAmount: number
    notes: string | null
  }
  formatRp: (n: number) => string
}) {
  return (
    <div className="flex items-center justify-between p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{item.componentName}</p>
        {item.notes && (
          <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>
        )}
      </div>
      <span className="text-sm font-semibold tabular-nums ml-3">
        {formatRp(item.finalAmount)}
      </span>
    </div>
  )
}