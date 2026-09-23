'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search,
  Loader2,
  ScanFace,
  UserCheck,
  Clock,
  AlertTriangle,
  X,
  UserMinus,
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
import type { ListAttendanceResult } from '@/lib/attendance/queries'
import type {
  ListAttendanceQuery,
  CheckoutFilter,
} from '@/lib/validation/attendance'
import { ATTENDANCE_STATUS_LABELS } from '@/lib/validation/attendance'
import { formatDuration, formatTime } from '@/lib/attendance/helpers'
import { AttendanceActions } from './attendance-actions'
import { CheckInDialog } from './check-in-dialog'
import { CheckOutDialog } from './check-out-dialog'

type Stats = {
  total: number
  hadir: number
  terlambat: number
  alpha: number
  pending: number
}

type Props = {
  initialData: ListAttendanceResult
  stats: Stats
  initialQuery: ListAttendanceQuery
}

const STATUS_COLORS: Record<string, string> = {
  HADIR:
    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  TERLAMBAT:
    'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  IZIN: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  SAKIT:
    'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
  CUTI: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30',
  ALPHA: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
}

export function AttendanceClient({
  initialData,
  stats,
  initialQuery,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [q, setQ] = useState(initialQuery.q)
  const [date, setDate] = useState(initialQuery.date || '')
  const [statusFilter, setStatusFilter] = useState(
    initialQuery.status || 'all',
  )
  const [checkoutFilter, setCheckoutFilter] = useState<CheckoutFilter>(
    (initialQuery.checkout || 'all') as CheckoutFilter,
  )
  const [showFilters, setShowFilters] = useState(false)

  const [checkInOpen, setCheckInOpen] = useState(false)
  const [checkOutOpen, setCheckOutOpen] = useState(false)

  function applyFilters(
    overrides: Partial<{
      q: string
      date: string
      status: string
      checkout: string
      page: number
      perPage: number
    }> = {},
  ) {
    const params = new URLSearchParams(searchParams.toString())
    const nextQ = overrides.q ?? q
    const nextDate = overrides.date ?? date
    const nextStatus = overrides.status ?? statusFilter
    const nextCheckout = overrides.checkout ?? checkoutFilter
    const nextPage = overrides.page ?? 1
    const nextPerPage = overrides.perPage ?? initialData.perPage

    if (nextQ) params.set('q', nextQ)
    else params.delete('q')

    if (nextDate) params.set('date', nextDate)
    else params.delete('date')

    if (nextStatus && nextStatus !== 'all') params.set('status', nextStatus)
    else params.delete('status')

    if (nextCheckout && nextCheckout !== 'all')
      params.set('checkout', nextCheckout)
    else params.delete('checkout')

    if (nextPage > 1) params.set('page', String(nextPage))
    else params.delete('page')

    if (nextPerPage !== 20) params.set('perPage', String(nextPerPage))
    else params.delete('perPage')

    startTransition(() => {
      router.push(`/admin/attendance?${params.toString()}`)
    })
  }

  function resetFilters() {
    setQ('')
    setDate('')
    setStatusFilter('all')
    setCheckoutFilter('all')
    startTransition(() => {
      router.push('/admin/attendance')
    })
  }

  const hasActiveFilters =
    q ||
    date ||
    (statusFilter && statusFilter !== 'all') ||
    (checkoutFilter && checkoutFilter !== 'all')

  const { items, total, page, totalPages, perPage } = initialData
  const startIdx = (page - 1) * perPage + 1
  const endIdx = Math.min(page * perPage, total)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Absensi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Catat kehadiran karyawan dengan validasi GPS.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCheckOutOpen(true)}>
            <Clock className="mr-2 h-4 w-4" />
            Absen Keluar
          </Button>
          <Button onClick={() => setCheckInOpen(true)}>
            <UserCheck className="mr-2 h-4 w-4" />
            Absen Masuk
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Absensi"
          value={stats.total}
          icon={ScanFace}
          description="hari ini"
        />
        <StatCard
          title="Hadir"
          value={stats.hadir}
          icon={UserCheck}
          description="tepat waktu"
          className="text-emerald-600"
        />
        <StatCard
          title="Terlambat"
          value={stats.terlambat}
          icon={Clock}
          description="lewat toleransi"
          className="text-amber-600"
        />
        <StatCard
          title="Belum Keluar"
          value={stats.pending}
          icon={UserMinus}
          description="lupa check-out"
          className="text-orange-600"
        />
        <StatCard
          title="Alpha"
          value={stats.alpha}
          icon={AlertTriangle}
          description="tanpa keterangan"
          className="text-red-600"
        />
      </div>

      {/* Filter */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Filter</CardTitle>
              <CardDescription>Cari & filter data absensi</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              )}
              <Button
                variant={showFilters ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFilters((s) => !s)}
              >
                {showFilters ? 'Sembunyikan' : 'Tampilkan'}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Cari</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Nama atau username..."
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
                <Label className="text-xs">Tanggal</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value)
                    applyFilters({ date: e.target.value, page: 1 })
                  }}
                />
                <p className="text-[10px] text-muted-foreground">
                  Kosongkan untuk semua tanggal
                </p>
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
                    <SelectValue placeholder="Semua status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    {Object.entries(ATTENDANCE_STATUS_LABELS).map(
                      ([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Check-Out</Label>
                <Select
                  value={checkoutFilter}
                  onValueChange={(v: string | null) => {
                    const val = (v ?? 'all') as CheckoutFilter
                    setCheckoutFilter(val)
                    applyFilters({ checkout: val, page: 1 })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="pending">Belum Check-Out</SelectItem>
                    <SelectItem value="done">Sudah Check-Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Quick filter buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <QuickFilterButton
          active={checkoutFilter === 'all'}
          onClick={() => {
            setCheckoutFilter('all')
            applyFilters({ checkout: 'all', page: 1 })
          }}
        >
          Semua
        </QuickFilterButton>
        <QuickFilterButton
          active={checkoutFilter === 'pending'}
          onClick={() => {
            setCheckoutFilter('pending')
            applyFilters({ checkout: 'pending', page: 1 })
          }}
          badge={stats.pending > 0 ? stats.pending : undefined}
        >
          Belum Check-Out
        </QuickFilterButton>
        <QuickFilterButton
          active={checkoutFilter === 'done'}
          onClick={() => {
            setCheckoutFilter('done')
            applyFilters({ checkout: 'done', page: 1 })
          }}
        >
          Sudah Check-Out
        </QuickFilterButton>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Absensi</CardTitle>
          <CardDescription>
            {total === 0
              ? 'Tidak ada data absensi'
              : `Menampilkan ${startIdx}–${endIdx} dari ${total} absensi`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ScanFace className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Belum ada absensi
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setCheckInOpen(true)}
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Absen Masuk Sekarang
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Masuk</TableHead>
                    <TableHead>Keluar</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px] text-right">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="font-medium">{a.user.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          @{a.user.username}
                        </div>
                      </TableCell>
                      <TableCell>
                        {a.shiftInfo ? (
                            <div className="text-xs">
                            <div className="font-mono font-medium">
                                {formatTime(a.shiftInfo.startTime)} – {formatTime(a.shiftInfo.endTime)}
                            </div>
                            {a.shiftInfo.position && (
                                <div className="text-muted-foreground">{a.shiftInfo.position}</div>
                            )}
                            </div>
                        ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                        )}
                        </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          {new Date(a.workDate).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(a.workDate).toLocaleDateString('id-ID', {
                            weekday: 'short',
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums">
                        {formatTime(a.checkIn)}
                        {a.lateMinutes > 0 && (
                          <div className="text-[10px] text-amber-600">
                            +{a.lateMinutes}m
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums">
                        {a.checkOut ? (
                          formatTime(a.checkOut)
                        ) : (
                          <span className="text-orange-600 text-xs font-medium">
                            Belum
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatDuration(a.workDurationMinutes)}
                      </TableCell>
                      <TableCell>
                        {a.checkInDistance !== null ? (
                          <div className="text-xs">
                            <div className="font-mono">
                              {Math.round(a.checkInDistance)}m
                            </div>
                            {a.checkInLocationName && (
                              <div className="text-muted-foreground">
                                {a.checkInLocationName}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              STATUS_COLORS[a.status] ?? '',
                            )}
                          >
                            {ATTENDANCE_STATUS_LABELS[a.status] ?? a.status}
                          </Badge>
                          {a.isCorrected && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                            >
                              Dikoreksi
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <AttendanceActions
                          attendance={{
                            id: a.id,
                            username: a.user.username,
                            userName: a.user.name,
                            workDate: a.workDate.toISOString(),
                            checkIn: a.checkIn.toISOString(),
                            checkOut: a.checkOut?.toISOString() ?? null,
                            status: a.status,
                            notes: a.notes,
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
                    onPageChange={(p: number) => applyFilters({ page: p })}
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

      {/* Dialogs */}
      <CheckInDialog open={checkInOpen} onOpenChange={setCheckInOpen} />
      <CheckOutDialog open={checkOutOpen} onOpenChange={setCheckOutOpen} />
    </div>
  )
}

// ============================================================
// Stat card
// ============================================================

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  className,
}: {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  description: string
  className?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn('h-4 w-4 text-muted-foreground', className)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Quick filter button
// ============================================================

function QuickFilterButton({
  active,
  onClick,
  children,
  badge,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  badge?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background hover:bg-muted border-border text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            'inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold tabular-nums',
            active
              ? 'bg-primary-foreground text-primary'
              : 'bg-orange-500 text-white',
          )}
        >
          {badge}
        </span>
      )}
    </button>
  )
}