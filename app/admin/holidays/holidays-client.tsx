'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Loader2, CalendarDays, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import type { ListHolidaysResult } from '@/lib/holidays/queries'
import type { ListHolidaysQuery } from '@/lib/validation/holiday'
import {
  HOLIDAY_TYPE_LABELS,
  HOLIDAY_TYPE_COLORS,
} from '@/lib/validation/holiday'
import { HolidayFormDialog } from './holiday-form-dialog'
import { HolidayActions } from './holiday-actions'

// ============================================================
// Types
// ============================================================

type Props = {
  initialData: ListHolidaysResult
  initialQuery: ListHolidaysQuery
}

// ============================================================
// Component
// ============================================================

export function HolidaysClient({ initialData, initialQuery }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [q, setQ] = useState(initialQuery.q)
  const [typeFilter, setTypeFilter] = useState(initialQuery.type || 'all')
  const [createOpen, setCreateOpen] = useState(false)

  function applyFilters(
    overrides: Partial<{
      q: string
      type: string
      page: number
      perPage: number
    }> = {},
  ) {
    const params = new URLSearchParams(searchParams.toString())
    const nextQ = overrides.q ?? q
    const nextType = overrides.type ?? typeFilter
    const nextPage = overrides.page ?? 1
    const nextPerPage = overrides.perPage ?? initialData.perPage

    if (nextQ) params.set('q', nextQ)
    else params.delete('q')

    if (nextType && nextType !== 'all') params.set('type', nextType)
    else params.delete('type')

    if (nextPage > 1) params.set('page', String(nextPage))
    else params.delete('page')

    if (nextPerPage !== 50) params.set('perPage', String(nextPerPage))
    else params.delete('perPage')

    startTransition(() => {
      router.push(`/admin/holidays?${params.toString()}`)
    })
  }

  function resetFilters() {
    setQ('')
    setTypeFilter('all')
    startTransition(() => {
      router.push('/admin/holidays')
    })
  }

  const hasActiveFilters = q || (typeFilter && typeFilter !== 'all')

  const { items, total, page, totalPages, perPage } = initialData
  const startIdx = total === 0 ? 0 : (page - 1) * perPage + 1
  const endIdx = Math.min(page * perPage, total)

  return (
    <div className="space-y-6">
      {/* ==================== HEADER ==================== */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hari Libur</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola tanggal merah, cuti bersama, dan libur perusahaan. Bulk
            create shift otomatis skip tanggal ini.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Libur
        </Button>
      </div>

      {/* ==================== FILTER ==================== */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Filter</CardTitle>
              <CardDescription>Cari & filter hari libur</CardDescription>
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
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama libur..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilters({ q, page: 1 })
                }}
                className="pl-9"
              />
            </div>

            <Select
              value={typeFilter}
              onValueChange={(v: string | null) => {
                const val = v ?? 'all'
                setTypeFilter(val)
                applyFilters({ type: val, page: 1 })
              }}
            >
              <SelectTrigger className="sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {Object.entries(HOLIDAY_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="secondary"
              onClick={() => applyFilters({ q, page: 1 })}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Cari'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ==================== TABLE ==================== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Hari Libur</CardTitle>
          <CardDescription>
            {total === 0
              ? 'Tidak ada hari libur'
              : `Menampilkan ${startIdx}–${endIdx} dari ${total} hari libur`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarDays className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Belum ada hari libur
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Tambah Libur
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px] text-right">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {new Date(h.date).toLocaleDateString('id-ID', {
                            timeZone: 'UTC',
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(h.date).toLocaleDateString('id-ID', {
                            timeZone: 'UTC',
                            weekday: 'long',
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{h.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            HOLIDAY_TYPE_COLORS[h.type] ?? '',
                          )}
                        >
                          {HOLIDAY_TYPE_LABELS[h.type] ?? h.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            h.isActive
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30',
                          )}
                        >
                          {h.isActive ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <HolidayActions
                          holiday={{
                            id: h.id,
                            date: h.date.toISOString(),
                            name: h.name,
                            type: h.type,
                            isActive: h.isActive,
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

      {/* ==================== DIALOG ==================== */}
      <HolidayFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}