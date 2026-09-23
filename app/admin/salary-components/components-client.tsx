'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search,
  Loader2,
  Plus,
  X,
  Layers,
  TrendingUp,
  TrendingDown,
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
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ListSalaryComponentsResult } from '@/lib/salary-components/queries'
import type { ListSalaryComponentsQuery } from '@/lib/validation/salary-component'
import {
  CALC_METHOD_LABELS,
  TYPE_LABELS,
  TYPE_COLORS,
} from '@/lib/validation/salary-component'
import { ComponentFormDialog } from './component-form-dialog'
import { ComponentActions } from './component-actions'

// ============================================================
// Types
// ============================================================

type Props = {
  initialData: ListSalaryComponentsResult
  initialQuery: ListSalaryComponentsQuery
}

// ============================================================
// Component
// ============================================================

export function ComponentsClient({ initialData, initialQuery }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [q, setQ] = useState(initialQuery.q)
  const [typeFilter, setTypeFilter] = useState(initialQuery.type || 'all')
  const [activeFilter, setActiveFilter] = useState(initialQuery.active || 'all')
  const [createOpen, setCreateOpen] = useState(false)

  function applyFilters(
    overrides: Partial<{ q: string; type: string; active: string }> = {},
  ) {
    const params = new URLSearchParams(searchParams.toString())
    const nextQ = overrides.q ?? q
    const nextType = overrides.type ?? typeFilter
    const nextActive = overrides.active ?? activeFilter

    if (nextQ) params.set('q', nextQ)
    else params.delete('q')

    if (nextType && nextType !== 'all') params.set('type', nextType)
    else params.delete('type')

    if (nextActive && nextActive !== 'all') params.set('active', nextActive)
    else params.delete('active')

    startTransition(() => {
      router.push(`/admin/salary-components?${params.toString()}`)
    })
  }

  function resetFilters() {
    setQ('')
    setTypeFilter('all')
    setActiveFilter('all')
    startTransition(() => {
      router.push('/admin/salary-components')
    })
  }

  const hasActiveFilters =
    q ||
    (typeFilter && typeFilter !== 'all') ||
    (activeFilter && activeFilter !== 'all')

  const { items } = initialData
  const earnings = items.filter((i) => i.type === 'EARNING')
  const deductions = items.filter((i) => i.type === 'DEDUCTION')

  function formatAmount(n: number | null, calcMethod: string): string {
    if (n === null) return '—'
    if (calcMethod === 'PERCENTAGE') return `${n}%`
    return `Rp ${n.toLocaleString('id-ID')}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Komponen Gaji</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Master komponen pendapatan & potongan gaji.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Komponen
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Filter</CardTitle>
              <CardDescription>Cari & filter komponen</CardDescription>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Cari</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Kode / nama..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyFilters({ q })
                  }}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Tipe</Label>
              <Select
                value={typeFilter}
                onValueChange={(v: string | null) => {
                  const val = v ?? 'all'
                  setTypeFilter(val)
                  applyFilters({ type: val })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="EARNING">Pendapatan</SelectItem>
                  <SelectItem value="DEDUCTION">Potongan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Status</Label>
              <Select
                value={activeFilter}
                onValueChange={(v: string | null) => {
                  const val = v ?? 'all'
                  setActiveFilter(val)
                  applyFilters({ active: val })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Tidak ada komponen
            </p>
            <Button
              size="sm"
              className="mt-4"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Tambah Komponen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* EARNING */}
          {earnings.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-base">
                    Pendapatan ({earnings.length})
                  </CardTitle>
                </div>
                <CardDescription>Komponen yang menambah gaji</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {earnings.map((c) => (
                  <ComponentRow
                    key={c.id}
                    component={c}
                    formatAmount={formatAmount}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* DEDUCTION */}
          {deductions.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <CardTitle className="text-base">
                    Potongan ({deductions.length})
                  </CardTitle>
                </div>
                <CardDescription>Komponen yang mengurangi gaji</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {deductions.map((c) => (
                  <ComponentRow
                    key={c.id}
                    component={c}
                    formatAmount={formatAmount}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dialog */}
      <ComponentFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}

// ============================================================
// ComponentRow
// ============================================================

function ComponentRow({
  component,
  formatAmount,
}: {
  component: {
    id: string
    code: string
    name: string
    description: string | null
    type: string
    calcMethod: string
    defaultAmount: number | null
    isSystem: boolean
    isActive: boolean
  }
  formatAmount: (n: number | null, calcMethod: string) => string
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-colors',
        component.isActive
          ? 'bg-card hover:bg-muted/30'
          : 'bg-muted/20 opacity-60',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">{component.name}</p>
          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {component.code}
          </span>
          {component.isSystem && (
            <Badge variant="outline" className="text-[10px] h-4">
              Sistem
            </Badge>
          )}
          {!component.isActive && (
            <Badge variant="outline" className="text-[10px] h-4 bg-slate-500/15">
              Nonaktif
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <Badge
            variant="outline"
            className={cn('text-[10px] h-4', TYPE_COLORS[component.type])}
          >
            {TYPE_LABELS[component.type]}
          </Badge>
          <span>{CALC_METHOD_LABELS[component.calcMethod]}</span>
          <span className="font-mono tabular-nums">
            {formatAmount(component.defaultAmount, component.calcMethod)}
          </span>
        </div>
        {component.description && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {component.description}
          </p>
        )}
      </div>

      <ComponentActions
        component={{
          id: component.id,
          code: component.code,
          name: component.name,
          description: component.description,
          type: component.type,
          calcMethod: component.calcMethod,
          defaultAmount: component.defaultAmount,
          isSystem: component.isSystem,
          isActive: component.isActive,
        }}
      />
    </div>
  )
}