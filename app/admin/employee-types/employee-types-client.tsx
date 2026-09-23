'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Search, Loader2, Briefcase } from 'lucide-react'
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
import type { ListEmployeeTypesResult } from '@/lib/employee-types/queries'
import type { ListEmployeeTypesQuery } from '@/lib/validation/employee-type'
import { EmployeeTypeFormDialog } from './employee-type-form-dialog'
import { EmployeeTypeActions } from './employee-type-actions'

type StatusFilter = 'all' | 'active' | 'inactive'

type Props = {
  initialData: ListEmployeeTypesResult
  initialQuery: ListEmployeeTypesQuery
}

export function EmployeeTypesClient({ initialData, initialQuery }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [q, setQ] = useState(initialQuery.q)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    initialQuery.status,
  )
  const [createOpen, setCreateOpen] = useState(false)

  function applyFilters(
    overrides: Partial<{
      q: string
      status: StatusFilter
      page: number
      perPage: number
    }> = {},
  ) {
    const params = new URLSearchParams(searchParams.toString())
    const nextQ = overrides.q ?? q
    const nextStatus = overrides.status ?? statusFilter
    const nextPage = overrides.page ?? 1
    const nextPerPage = overrides.perPage ?? initialData.perPage

    if (nextQ) params.set('q', nextQ)
    else params.delete('q')

    if (nextStatus && nextStatus !== 'all') params.set('status', nextStatus)
    else params.delete('status')

    if (nextPage > 1) params.set('page', String(nextPage))
    else params.delete('page')

    if (nextPerPage !== 20) params.set('perPage', String(nextPerPage))
    else params.delete('perPage')

    startTransition(() => {
      router.push(`/admin/employee-types?${params.toString()}`)
    })
  }

  const { items, total, page, totalPages, perPage } = initialData
  const startIdx = (page - 1) * perPage + 1
  const endIdx = Math.min(page * perPage, total)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tipe Karyawan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Master tipe karyawan untuk perhitungan gaji.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Tipe
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau kode..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilters({ q, page: 1 })
                }}
                className="pl-9"
              />
            </div>

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
          <CardTitle className="text-base">Daftar Tipe Karyawan</CardTitle>
          <CardDescription>
            {total === 0
              ? 'Tidak ada tipe karyawan ditemukan'
              : `Menampilkan ${startIdx}–${endIdx} dari ${total} tipe`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Briefcase className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Belum ada tipe karyawan
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead className="text-right">Jumlah User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px] text-right">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((et) => (
                    <TableRow key={et.code}>
                      <TableCell>
                        <div className="font-medium">{et.name}</div>
                        {et.description && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {et.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {et.code}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {et.userCount}
                      </TableCell>
                      <TableCell>
                        {et.isActive ? (
                          <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/15 dark:text-green-400">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Nonaktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <EmployeeTypeActions
                          employeeType={{
                            code: et.code,
                            name: et.name,
                            description: et.description,
                            isActive: et.isActive,
                            userCount: et.userCount,
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

      <EmployeeTypeFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
      />
    </div>
  )
}