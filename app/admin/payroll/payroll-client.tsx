'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  Loader2,
  Wallet,
  Plus,
  X,
  CheckCircle2,
  Clock,
  FileText,
  CalendarDays,
} from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { DataPagination } from '@/components/ui/data-pagination'
import type { ListPayrollResult } from '@/lib/payroll/queries'
import type { ListPayrollQuery } from '@/lib/validation/payroll'
import {
  PAYROLL_STATUS_LABELS,
  PAYROLL_STATUS_COLORS,
} from '@/lib/validation/payroll'
import { GeneratePayrollDialog } from './generate-payroll-dialog'
import { PayrollActions } from './payroll-actions'

// ============================================================
// Types
// ============================================================

type Stats = {
  total: number
  draft: number
  approved: number
  paid: number
  totalNet: number
}

type Props = {
  initialData: ListPayrollResult
  stats: Stats
  initialQuery: ListPayrollQuery
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

// ============================================================
// Component
// ============================================================

export function PayrollClient({ initialData, stats, initialQuery }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [q, setQ] = useState(initialQuery.q)
  const [statusFilter, setStatusFilter] = useState(initialQuery.status || 'all')
  const [generateOpen, setGenerateOpen] = useState(false)

  const currentMonth = initialQuery.periodMonth ?? new Date().getMonth() + 1
  const currentYear = initialQuery.periodYear ?? new Date().getFullYear()

  function applyFilters(
    overrides: Partial<{
      q: string
      periodMonth: number
      periodYear: number
      status: string
      page: number
      perPage: number
    }> = {},
  ) {
    const params = new URLSearchParams(searchParams.toString())
    const nextQ = overrides.q ?? q
    const nextMonth = overrides.periodMonth ?? currentMonth
    const nextYear = overrides.periodYear ?? currentYear
    const nextStatus = overrides.status ?? statusFilter
    const nextPage = overrides.page ?? 1
    const nextPerPage = overrides.perPage ?? initialData.perPage

    if (nextQ) params.set('q', nextQ)
    else params.delete('q')

    params.set('periodMonth', String(nextMonth))
    params.set('periodYear', String(nextYear))

    if (nextStatus && nextStatus !== 'all') params.set('status', nextStatus)
    else params.delete('status')

    if (nextPage > 1) params.set('page', String(nextPage))
    else params.delete('page')

    if (nextPerPage !== 20) params.set('perPage', String(nextPerPage))
    else params.delete('perPage')

    startTransition(() => {
      router.push(`/admin/payroll?${params.toString()}`)
    })
  }

  function resetFilters() {
    setQ('')
    setStatusFilter('all')
    startTransition(() => {
      router.push('/admin/payroll')
    })
  }

  const hasActiveFilters =
    q || (statusFilter && statusFilter !== 'all') || !!initialQuery.periodMonth

  const { items, total, page, totalPages, perPage } = initialData
  const startIdx = total === 0 ? 0 : (page - 1) * perPage + 1
  const endIdx = Math.min(page * perPage, total)

  function formatRp(n: number): string {
    return 'Rp ' + n.toLocaleString('id-ID')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Penggajian</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola gaji karyawan per periode.
          </p>
        </div>
        <Button onClick={() => setGenerateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Payroll
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total"
          value={String(stats.total)}
          icon={Wallet}
          description="payroll"
        />
        <StatCard
          title="Draft"
          value={String(stats.draft)}
          icon={FileText}
          description="belum approve"
          className="text-slate-500"
        />
        <StatCard
          title="Disetujui"
          value={String(stats.approved)}
          icon={CheckCircle2}
          description="siap bayar"
          className="text-blue-600"
        />
        <StatCard
          title="Dibayar"
          value={String(stats.paid)}
          icon={CheckCircle2}
          description="lunas"
          className="text-emerald-600"
        />
        <StatCard
          title="Total Net"
          value={formatRp(stats.totalNet)}
          icon={Wallet}
          description="periode ini"
          className="text-emerald-600"
          isText
        />
      </div>

      {/* Filter */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Filter</CardTitle>
              <CardDescription>Cari & filter payroll</CardDescription>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="mr-2 h-4 w-4" />
                Reset
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Cari</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Nama / username..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyFilters({ q, page: 1 })
                  }}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Periode</Label>
              <div className="flex gap-2">
                <Select
                  value={String(currentMonth)}
                  onValueChange={(v: string | null) => {
                    applyFilters({
                      periodMonth: Number(v ?? currentMonth),
                      page: 1,
                    })
                  }}
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
                  value={String(currentYear)}
                  onValueChange={(v: string | null) => {
                    applyFilters({
                      periodYear: Number(v ?? currentYear),
                      page: 1,
                    })
                  }}
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
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(v: string | null) => {
                  const val = v ?? 'all'
                  setStatusFilter(val)
                  applyFilters({ status: val, page: 1 })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  {Object.entries(PAYROLL_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex items-end">
              <Button
                variant="secondary"
                onClick={() => applyFilters({ q, page: 1 })}
                disabled={isPending}
                className="w-full"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Cari'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Payroll</CardTitle>
          <CardDescription>
            {total === 0
              ? 'Tidak ada payroll'
              : `Menampilkan ${startIdx}–${endIdx} dari ${total} payroll`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wallet className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Belum ada payroll
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setGenerateOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Generate Payroll
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-right">Pendapatan</TableHead>
                    <TableHead className="text-right">Potongan</TableHead>
                    <TableHead className="text-right">Gaji Bersih</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px] text-right">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link
                          href={`/admin/payroll/${p.id}`}
                          className="hover:underline"
                        >
                          <div className="font-medium">{p.user.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            @{p.user.username}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {MONTHS_SHORT[p.periodMonth - 1]} {p.periodYear}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {p.periodStart.toLocaleDateString('id-ID', {
                            timeZone: 'Asia/Jakarta',
                            day: '2-digit',
                            month: 'short',
                          })}{' '}
                          –{' '}
                          {p.periodEnd.toLocaleDateString('id-ID', {
                            timeZone: 'Asia/Jakarta',
                            day: '2-digit',
                            month: 'short',
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatRp(p.grossEarning)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-red-600 dark:text-red-400">
                        −{formatRp(p.totalDeduction)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {formatRp(p.netSalary)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            PAYROLL_STATUS_COLORS[p.status] ?? '',
                          )}
                        >
                          {PAYROLL_STATUS_LABELS[p.status] ?? p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <PayrollActions
                          payroll={{
                            id: p.id,
                            userName: p.user.name,
                            periodMonth: p.periodMonth,
                            periodYear: p.periodYear,
                            status: p.status,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 0 && (
                <div className="border-t pt-4 mt-4">
                  <DataPagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={total}
                    perPage={perPage}
                    onPageChange={(pg: number) => applyFilters({ page: pg })}
                    onPerPageChange={(pp: number) =>
                      applyFilters({ page: 1, perPage: pp })
                    }
                    disabled={isPending}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <GeneratePayrollDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        defaultMonth={currentMonth}
        defaultYear={currentYear}
      />
    </div>
  )
}

// ============================================================
// Stat Card
// ============================================================

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  className,
  isText,
}: {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  className?: string
  isText?: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn('h-4 w-4 text-muted-foreground', className)} />
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'font-bold tabular-nums',
            isText ? 'text-base' : 'text-2xl',
          )}
        >
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}