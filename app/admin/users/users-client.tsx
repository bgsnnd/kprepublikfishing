'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Search, Loader2, Users as UsersIcon } from 'lucide-react'
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
import type { ListUsersResult } from '@/lib/users/queries'
import type { ListUsersQuery } from '@/lib/validation/user'
import { UserFormDialog } from './user-form-dialog'
import { UserActions } from './user-actions'
import { DataPagination } from '@/components/ui/data-pagination'

type RoleOption = {
  code: string
  name: string
  description: string | null
}
type EmployeeTypeOption = { code: string; name: string }

type UsersClientProps = {
  initialData: ListUsersResult
  roles: RoleOption[]
  employeeTypes: EmployeeTypeOption[]
  initialQuery: ListUsersQuery
}

type StatusFilter = 'all' | 'active' | 'inactive'

export function UsersClient({
  initialData,
  roles,
  employeeTypes,
  initialQuery,
}: UsersClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [q, setQ] = useState(initialQuery.q)
  const [roleFilter, setRoleFilter] = useState(initialQuery.role || 'all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    initialQuery.status,
  )

  const [createOpen, setCreateOpen] = useState(false)

  function applyFilters(
    overrides: Partial<{
      q: string
      role: string
      status: StatusFilter
      page: number
      perPage: number
    }> = {},
  ) {
    const params = new URLSearchParams(searchParams.toString())
    const nextQ = overrides.q ?? q
    const nextRole = overrides.role ?? roleFilter
    const nextStatus = overrides.status ?? statusFilter
    const nextPage = overrides.page ?? 1
    const nextPerPage = overrides.perPage ?? initialData.perPage

    if (nextQ) params.set('q', nextQ)
    else params.delete('q')

    if (nextRole && nextRole !== 'all') params.set('role', nextRole)
    else params.delete('role')

    if (nextStatus && nextStatus !== 'all') params.set('status', nextStatus)
    else params.delete('status')

    if (nextPage > 1) params.set('page', String(nextPage))
    else params.delete('page')

    if (nextPerPage !== 20) params.set('perPage', String(nextPerPage))
    else params.delete('perPage')

    startTransition(() => {
      router.push(`/admin/users?${params.toString()}`)
    })
  }

  const { items, total, page, totalPages, perPage } = initialData
  const startIdx = (page - 1) * perPage + 1
  const endIdx = Math.min(page * perPage, total)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola user, role, dan status aktif
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah User
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama, email, atau username..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilters({ q, page: 1 })
                }}
                className="pl-9"
              />
            </div>

            <Select
              value={roleFilter}
              onValueChange={(v: string | null) => {
                const val = v ?? 'all'
                setRoleFilter(val)
                applyFilters({ role: val, page: 1 })
              }}
            >
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="Semua role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r.code} value={r.code}>
                    {r.name}
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
          <CardTitle className="text-base">Daftar User</CardTitle>
          <CardDescription>
            {total === 0
              ? 'Tidak ada user ditemukan'
              : `Menampilkan ${startIdx}–${endIdx} dari ${total} user`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UsersIcon className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Belum ada user</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px] text-right">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((u) => (
                    <TableRow key={u.username}>
                      <TableCell>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {u.email}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        @{u.username}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <Badge
                              key={r.code}
                              variant="secondary"
                              className="text-xs"
                            >
                              {r.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.employeeType ? (
                          <span className="text-sm">
                            {u.employeeType.name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {u.isActive ? (
                          <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/15 dark:text-green-400">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Nonaktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <UserActions
                          user={{
                            username: u.username,
                            name: u.name,
                            isActive: u.isActive,
                          }}
                          roles={roles}
                          employeeTypes={employeeTypes}
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
                    onPageChange={(p: number) =>
                      applyFilters({ page: p })
                    }
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

      <UserFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        roles={roles}
        employeeTypes={employeeTypes}
      />
    </div>
  )
}