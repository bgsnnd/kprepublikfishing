'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search,
  Loader2,
  CalendarDays,
  Plus,
  X,
  Clock,
  CheckCircle2,
  Ban,
  Wand2,
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
import type { ListShiftsResult } from '@/lib/shifts/queries'
import type { ListShiftsQuery } from '@/lib/validation/shift'
import {
  SHIFT_STATUS_LABELS,
  SHIFT_STATUS_COLORS,
} from '@/lib/validation/shift'
import { formatTime } from '@/lib/attendance/helpers'
import { ShiftFormDialog } from './shift-form-dialog'
import { ShiftActions } from './shift-actions'
import { BulkShiftDialog } from './bulk-shift-dialog'
import { BulkConfirmDialog } from './bulk-confirm-dialog'

// ============================================================
// Types
// ============================================================

type Stats = {
  todayTotal: number
  todayConfirmed: number
  upcoming: number
  cancelled: number
}

type UserOption = {
  username: string
  name: string
  employeeType: { name: string } | null
}

type Props = {
  initialData: ListShiftsResult
  stats: Stats
  users: UserOption[]
  initialQuery: ListShiftsQuery
}

// ============================================================
// Component
// ============================================================

export function ScheduleClient({
  initialData,
  stats,
  users,
  initialQuery,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [q, setQ] = useState(initialQuery.q)
  const [date, setDate] = useState(initialQuery.date)
  const [statusFilter, setStatusFilter] = useState(initialQuery.status || 'all')
  const [showFilters, setShowFilters] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)

  function applyFilters(
    overrides: Partial<{
      q: string
      date: string
      status: string
      page: number
      perPage: number
    }> = {},
  ) {
    const params = new URLSearchParams(searchParams.toString())
    const nextQ = overrides.q ?? q
    const nextDate = overrides.date ?? date
    const nextStatus = overrides.status ?? statusFilter
    const nextPage = overrides.page ?? 1
    const nextPerPage = overrides.perPage ?? initialData.perPage

    if (nextQ) params.set('q', nextQ)
    else params.delete('q')

    if (nextDate) params.set('date', nextDate)
    else params.delete('date')

    if (nextStatus && nextStatus !== 'all') params.set('status', nextStatus)
    else params.delete('status')

    if (nextPage > 1) params.set('page', String(nextPage))
    else params.delete('page')

    if (nextPerPage !== 50) params.set('perPage', String(nextPerPage))
    else params.delete('perPage')

    startTransition(() => {
      router.push(`/admin/schedule?${params.toString()}`)
    })
  }

  function resetFilters() {
    setQ('')
    setDate('')
    setStatusFilter('all')
    startTransition(() => {
      router.push('/admin/schedule')
    })
  }

  const hasActiveFilters = q || date || (statusFilter && statusFilter !== 'all')

  const { items, total, page, totalPages, perPage } = initialData
  const startIdx = total === 0 ? 0 : (page - 1) * perPage + 1
  const endIdx = Math.min(page * perPage, total)

  return (
    <div className="space-y-6">
      {/* ==================== HEADER ==================== */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jadwal Shift</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Atur jadwal kerja karyawan harian atau mingguan.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setBulkConfirmOpen(true)}
            className="text-emerald-600 hover:text-emerald-700"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Konfirmasi Massal
          </Button>
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            <Wand2 className="mr-2 h-4 w-4" />
            Jadwal Massal
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Shift
          </Button>
        </div>
      </div>

      {/* ==================== STATS ==================== */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Shift Hari Ini"
          value={stats.todayTotal}
          icon={CalendarDays}
          description="terjadwal"
        />
        <StatCard
          title="Dikonfirmasi"
          value={stats.todayConfirmed}
          icon={CheckCircle2}
          description="siap bekerja"
          className="text-emerald-600"
        />
        <StatCard
          title="Akan Datang"
          value={stats.upcoming}
          icon={Clock}
          description="shift mendatang"
          className="text-blue-600"
        />
        <StatCard
          title="Dibatalkan"
          value={stats.cancelled}
          icon={Ban}
          description="total dibatalkan"
          className="text-slate-500"
        />
      </div>

      {/* ==================== FILTER ==================== */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Filter</CardTitle>
              <CardDescription>Cari & filter jadwal shift</CardDescription>
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
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Cari</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Nama, username, atau posisi..."
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
                    {Object.entries(SHIFT_STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ==================== TABLE ==================== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Shift</CardTitle>
          <CardDescription>
            {total === 0
              ? 'Tidak ada shift ditemukan'
              : `Menampilkan ${startIdx}–${endIdx} dari ${total} shift`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarDays className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Belum ada shift terjadwal
              </p>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkOpen(true)}
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  Jadwal Massal
                </Button>
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Shift
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Posisi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px] text-right">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium">{s.user.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          @{s.user.username}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(s.shiftDate).toLocaleDateString('id-ID', {
                            timeZone: 'Asia/Jakarta',
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(s.shiftDate).toLocaleDateString('id-ID', {
                            timeZone: 'Asia/Jakarta',
                            weekday: 'long',
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums">
                        {formatTime(s.startTime)} – {formatTime(s.endTime)}
                      </TableCell>
                      <TableCell>
                        {s.position ? (
                          <span className="text-sm">{s.position}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            SHIFT_STATUS_COLORS[s.status] ?? '',
                          )}
                        >
                          {SHIFT_STATUS_LABELS[s.status] ?? s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <ShiftActions
                          shift={{
                            id: s.id,
                            userName: s.user.name,
                            username: s.user.username,
                            shiftDate: s.shiftDate.toISOString(),
                            startTime: s.startTime.toISOString(),
                            endTime: s.endTime.toISOString(),
                            position: s.position,
                            status: s.status,
                            notes: s.notes,
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

      {/* ==================== DIALOGS ==================== */}
      <ShiftFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
      />
      <BulkShiftDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        users={users}
      />
      <BulkConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
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