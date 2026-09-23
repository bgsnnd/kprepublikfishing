'use client'

import { useState } from 'react'
import { Plus, Shield, KeyRound, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import type {
  RoleListItem,
  PermissionGroup,
} from '@/lib/roles/queries'
import { RoleFormDialog } from './role-form-dialog'
import { RoleActions } from './role-actions'

type RolesClientProps = {
  initialRoles: RoleListItem[]
  permissionGroups: PermissionGroup[]
}

export function RolesClient({ initialRoles, permissionGroups }: RolesClientProps) {
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Role & Permission</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola role dan hak aksesnya. Semua permission dapat diubah tanpa deploy ulang.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Role
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Role</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {initialRoles.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {initialRoles.filter((r) => r.isSystem).length} role sistem
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Permission</CardTitle>
            <KeyRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {permissionGroups.reduce((acc, g) => acc + g.permissions.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              dalam {permissionGroups.length} module
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignment</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {initialRoles.reduce((acc, r) => acc + r.userCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              user-role assignments
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Role</CardTitle>
          <CardDescription>
            Role dengan label &ldquo;Sistem&rdquo; tidak dapat dihapus.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead className="text-right">User</TableHead>
                <TableHead className="text-right">Permission</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px] text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialRoles.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.name}</span>
                      {r.isSystem && (
                        <Badge variant="outline" className="text-[10px]">
                          Sistem
                        </Badge>
                      )}
                    </div>
                    {r.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {r.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {r.code}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.userCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.permissionCount}
                  </TableCell>
                  <TableCell>
                    {r.isActive ? (
                      <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/15 dark:text-green-400">
                        Aktif
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <RoleActions
                      role={r}
                      permissionGroups={permissionGroups}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RoleFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        permissionGroups={permissionGroups}
      />
    </div>
  )
}