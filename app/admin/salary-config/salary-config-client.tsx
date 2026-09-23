'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Plus,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  RoleWithConfig,
  ComponentOption,
} from '@/lib/salary-config/queries'
import {
  CALC_METHOD_LABELS,
  TYPE_COLORS,
} from '@/lib/validation/salary-component'
import { ConfigFormDialog } from './config-form-dialog'
import { ConfigActions } from './config-actions'

// ============================================================
// Types
// ============================================================

type Props = {
  roles: RoleWithConfig[]
  components: ComponentOption[]
}

// ============================================================
// Component
// ============================================================

export function SalaryConfigClient({ roles, components }: Props) {
  const router = useRouter()
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    roles[0]?.id ?? '',
  )
  const [addOpen, setAddOpen] = useState(false)

  const selectedRole = roles.find((r) => r.id === selectedRoleId)

  const earnings = selectedRole?.configs.filter(
    (c) => c.componentType === 'EARNING',
  ) ?? []
  const deductions = selectedRole?.configs.filter(
    (c) => c.componentType === 'DEDUCTION',
  ) ?? []

  function formatAmount(n: number, calcMethod: string): string {
    if (calcMethod === 'PERCENTAGE') return `${n}%`
    return `Rp ${n.toLocaleString('id-ID')}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Setting Gaji</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Atur komponen gaji default per role.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* ✅ Ganti asChild + Link → onClick + router.push */}
          <Button
            variant="outline"
            onClick={() => router.push('/admin/salary-config/user')}
          >
            <Wallet className="mr-2 h-4 w-4" />
            Override per User
          </Button>
          <Button onClick={() => setAddOpen(true)} disabled={!selectedRole}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Komponen
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-4">
        {/* Role List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Role</CardTitle>
            <CardDescription>{roles.length} role</CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-1">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left transition-colors',
                    selectedRoleId === role.id
                      ? 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/30'
                      : 'hover:bg-muted',
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{role.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {role.code}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {role.configs.length}
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Config Detail */}
        <div className="lg:col-span-3 space-y-5">
          {!selectedRole ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Coins className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Pilih role untuk melihat config
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Earning */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                    <div>
                      <CardTitle className="text-base">
                        Pendapatan ({earnings.length})
                      </CardTitle>
                      <CardDescription>
                        Komponen yang menambah gaji
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {earnings.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      Belum ada komponen pendapatan
                    </div>
                  ) : (
                    earnings.map((c) => (
                      <ConfigRow
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
                        Potongan ({deductions.length})
                      </CardTitle>
                      <CardDescription>
                        Komponen yang mengurangi gaji
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {deductions.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      Belum ada komponen potongan
                    </div>
                  ) : (
                    deductions.map((c) => (
                      <ConfigRow
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
      {selectedRole && (
        <ConfigFormDialog
          key={addOpen ? `add-${selectedRole.id}` : 'add-closed'}
          open={addOpen}
          onOpenChange={setAddOpen}
          role={selectedRole}
          components={components}
        />
      )}
    </div>
  )
}

// ============================================================
// ConfigRow
// ============================================================

function ConfigRow({
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
        </div>
      </div>

      <span className="text-sm font-semibold tabular-nums">
        {formatAmount(config.amount, config.calcMethod)}
      </span>

      <ConfigActions config={config} />
    </div>
  )
}