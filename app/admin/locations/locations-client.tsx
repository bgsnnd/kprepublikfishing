'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Search, Loader2, MapPin, Star } from 'lucide-react'
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
import { DataPagination } from '@/components/ui/data-pagination'
import type { ListLocationsResult } from '@/lib/locations/queries'
import type { ListLocationsQuery, LOCATION_TYPES } from '@/lib/validation/location'
import { LOCATION_TYPE_LABELS } from '@/lib/validation/location'
import { LocationFormDialog } from './location-form-dialog'
import { LocationActions } from './location-actions'

type StatusFilter = 'all' | 'active' | 'inactive'

type Props = {
  initialData: ListLocationsResult
  initialQuery: ListLocationsQuery
}

export function LocationsClient({ initialData, initialQuery }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [q, setQ] = useState(initialQuery.q)
  const [typeFilter, setTypeFilter] = useState(initialQuery.type || 'all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    initialQuery.status,
  )
  const [createOpen, setCreateOpen] = useState(false)

  function applyFilters(
    overrides: Partial<{
      q: string
      type: string
      status: StatusFilter
      page: number
      perPage: number
    }> = {},
  ) {
    const params = new URLSearchParams(searchParams.toString())
    const nextQ = overrides.q ?? q
    const nextType = overrides.type ?? typeFilter
    const nextStatus = overrides.status ?? statusFilter
    const nextPage = overrides.page ?? 1
    const nextPerPage = overrides.perPage ?? initialData.perPage

    if (nextQ) params.set('q', nextQ)
    else params.delete('q')

    if (nextType && nextType !== 'all') params.set('type', nextType)
    else params.delete('type')

    if (nextStatus && nextStatus !== 'all') params.set('status', nextStatus)
    else params.delete('status')

    if (nextPage > 1) params.set('page', String(nextPage))
    else params.delete('page')

    if (nextPerPage !== 20) params.set('perPage', String(nextPerPage))
    else params.delete('perPage')

    startTransition(() => {
      router.push(`/admin/locations?${params.toString()}`)
    })
  }

  const { items, total, page, totalPages, perPage } = initialData
  const startIdx = (page - 1) * perPage + 1
  const endIdx = Math.min(page * perPage, total)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lokasi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Master lokasi untuk geofencing absensi.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Lokasi
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama, kode, atau alamat..."
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
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="Semua tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {Object.entries(LOCATION_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(v: string | null) => {
                const val = (v ?? 'all') as StatusFilter
                setStatusFilter(val)
                applyFilters({ status: val, page: 1 })
              }}
            >
              <SelectTrigger className="sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Nonaktif</SelectItem>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Lokasi</CardTitle>
          <CardDescription>
            {total === 0
              ? 'Tidak ada lokasi ditemukan'
              : `Menampilkan ${startIdx}–${endIdx} dari ${total} lokasi`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Belum ada lokasi
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Koordinat</TableHead>
                    <TableHead className="text-right">Radius</TableHead>
                    <TableHead className="text-right">User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px] text-right">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((loc) => (
                    <TableRow key={loc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{loc.name}</span>
                          {loc.isDefault && (
                            <Badge
                              variant="default"
                              className="text-[10px] gap-1"
                            >
                              <Star className="h-3 w-3" />
                              Default
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                          {loc.code}
                        </div>
                        {loc.address && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {loc.address}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {LOCATION_TYPE_LABELS[loc.type] ?? loc.type}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {loc.radiusMeters} m
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {loc.userCount}
                      </TableCell>
                      <TableCell>
                        {loc.isActive ? (
                          <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/15 dark:text-green-400">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Nonaktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <LocationActions location={loc} />
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

      <LocationFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
      />
    </div>
  )
}