'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  CALC_METHOD_LABELS,
  TYPE_COLORS,
} from '@/lib/validation/salary-component'
import type {
  UserWithConfig,
  ComponentOption,
} from '@/lib/salary-config/queries'

// ============================================================
// Types
// ============================================================

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserWithConfig
  components: ComponentOption[]
}

// ============================================================
// Component
// ============================================================

export function UserConfigFormDialog({
  open,
  onOpenChange,
  user,
  components,
}: Props) {
  const router = useRouter()

  const availableComponents = components.filter(
    (c) => !user.configs.some((cfg) => cfg.componentId === c.id),
  )

  const [componentId, setComponentId] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const selectedComponent = components.find((c) => c.id === componentId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!componentId) {
      toast.error('Pilih komponen dulu')
      return
    }

    setLoading(true)
    setFieldErrors({})

    try {
      const res = await fetch('/api/salary-config/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          componentId,
          amount: Number(amount),
          reason,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal menyimpan')
        if (json.error?.fields) setFieldErrors(json.error.fields)
        return
      }

      toast.success(json.data?.message ?? 'Override ditambahkan')
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-violet-600" />
            Tambah Override Gaji
          </DialogTitle>
          <DialogDescription>
            User: <strong>{user.name}</strong>
          </DialogDescription>
        </DialogHeader>

        {availableComponents.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Semua komponen aktif udah dioverride untuk user ini.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Component */}
            <div className="space-y-2">
              <Label>
                Komponen <span className="text-destructive">*</span>
              </Label>
              <Select
                value={componentId}
                onValueChange={(v: string | null) => {
                  const val = v ?? ''
                  setComponentId(val)
                  const comp = components.find((c) => c.id === val)
                  if (comp?.defaultAmount) {
                    setAmount(comp.defaultAmount.toString())
                  }
                }}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih komponen">
                    {selectedComponent?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableComponents.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedComponent && (
                <div className="flex items-center gap-2 text-[10px]">
                  <Badge
                    variant="outline"
                    className={cn('h-4', TYPE_COLORS[selectedComponent.type])}
                  >
                    {selectedComponent.type === 'EARNING'
                      ? 'Pendapatan'
                      : 'Potongan'}
                  </Badge>
                  <span className="text-muted-foreground">
                    {CALC_METHOD_LABELS[selectedComponent.calcMethod]}
                  </span>
                </div>
              )}
              {fieldErrors.componentId?.map((m) => (
                <FieldError key={m} message={m} />
              ))}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">
                Nominal{' '}
                {selectedComponent?.calcMethod === 'PERCENTAGE' && '(%)'}
                <span className="text-destructive"> *</span>
              </Label>
              <Input
                id="amount"
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                required
                placeholder={
                  selectedComponent?.calcMethod === 'PERCENTAGE'
                    ? '2'
                    : '2500000'
                }
              />
              {fieldErrors.amount?.map((m) => (
                <FieldError key={m} message={m} />
              ))}
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Alasan (opsional)</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={loading}
                placeholder="Misal: sudah senior"
              />
              {fieldErrors.reason?.map((m) => (
                <FieldError key={m} message={m} />
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tambah
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function FieldError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-1.5 text-xs text-destructive">
      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}