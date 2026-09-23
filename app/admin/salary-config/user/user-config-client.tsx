'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Users,
  Plus,
  Wallet,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type {
  UserWithConfig,
  ComponentOption,
} from '@/lib/salary-config/queries'
import {
  CALC_METHOD_LABELS,
  TYPE_COLORS,
} from '@/lib/validation/salary-component'
import { UserConfigFormDialog } from './user-config-form-dialog'
import { UserConfigActions } from './user-config-actions'

// ============================================================
// Types
// ============================================================

type Props = {
  users: UserWithConfig[]
  components: ComponentOption[]
}

// ============================================================
// Component
// ============================================================

export function UserConfigClient({ users, components }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string>(
    users[0]?.id ?? '',
  )
  const [addOpen, setAddOpen] = useState(false)

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()),
  )

  const selectedUser = users.find((u) => u.id === selectedUserId)

  const earnings =
    selectedUser?.configs.filter((c) => c.componentType === 'EARNING') ?? []
  const deductions =
    selectedUser?.configs.filter((c) => c.componentType === 'DEDUCTION') ?? []

  function formatAmount(n: number, calcMethod: string): string {
    if (calcMethod === 'PERCENTAGE') return `${n}%`
    return `Rp ${n.toLocaleString('id-ID')}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin/salary-config')}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Override Gaji per User
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Atur gaji khusus per user (override config role).
            </p>
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)} disabled={!selectedUser}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Override
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-4">
        {/* User List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">User</CardTitle>
            <CardDescription>{filteredUsers.length} user</CardDescription>
          </CardHeader>
          <CardContent className="p-2 space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-7 h-8 text-xs"
              />
            </div>

            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  User tidak ditemukan
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left transition-colors',
                      selectedUserId === user.id
                        ? 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/30'
                        : 'hover:bg-muted',
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        @{user.username}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {user.configs.length}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Config Detail */}
        <div className="lg:col-span-3 space-y-5">
          {!selectedUser ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Pilih user untuk melihat override
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Info User */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                      {selectedUser.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        {selectedUser.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{selectedUser.username}
                        {selectedUser.roleName && ` · ${selectedUser.roleName}`}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground rounded-lg bg-muted/30 p-2">
                    Kalau kosong, gaji pakai config role. Override di sini cuma
                    buat komponen yang mau dibedain.
                  </div>
                </CardContent>
              </Card>

              {/* Earning */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                    <div>
                      <CardTitle className="text-base">
                        Override Pendapatan ({earnings.length})
                      </CardTitle>
                      <CardDescription>
                        Komponen pendapatan yang dioverride
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {earnings.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      Belum ada override pendapatan
                    </div>
                  ) : (
                    earnings.map((c) => (
                      <UserConfigRow
                        key={c.id}
                        config={c}
                        formatAmount={formatAmount}
                      />
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Deduction */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                    <div>
                      <CardTitle className="text-base">
                        Override Potongan ({deductions.length})
                      </CardTitle>
                      <CardDescription>
                        Komponen potongan yang dioverride
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {deductions.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      Belum ada override potongan
                    </div>
                  ) : (
                    deductions.map((c) => (
                      <UserConfigRow
                        key={c.id}
                        config={c}
                        formatAmount={formatAmount}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Dialog */}
      {selectedUser && (
        <UserConfigFormDialog
          key={addOpen ? `add-${selectedUser.id}` : 'add-closed'}
          open={addOpen}
          onOpenChange={setAddOpen}
          user={selectedUser}
          components={components}
        />
      )}
    </div>
  )
}

// ============================================================
// UserConfigRow
// ============================================================

function UserConfigRow({
  config,
  formatAmount,
}: {
  config: {
    id: string
    componentCode: string
    componentName: string
    componentType: string
    calcMethod: string
    amount: number
    reason: string | null
  }
  formatAmount: (n: number, calcMethod: string) => string
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">{config.componentName}</p>
          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {config.componentCode}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <Badge
            variant="outline"
            className={cn('text-[10px] h-4', TYPE_COLORS[config.componentType])}
          >
            {CALC_METHOD_LABELS[config.calcMethod]}
          </Badge>
          {config.reason && (
            <span className="text-[10px] italic truncate">{config.reason}</span>
          )}
        </div>
      </div>

      <span className="text-sm font-semibold tabular-nums">
        {formatAmount(config.amount, config.calcMethod)}
      </span>

      <UserConfigActions config={config} />
    </div>
  )
}