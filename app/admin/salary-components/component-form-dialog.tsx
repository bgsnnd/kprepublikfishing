'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, Plus, Pencil } from 'lucide-react'
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
import {
  CALC_METHODS,
  CALC_METHOD_LABELS,
  CALC_METHOD_HINTS,
} from '@/lib/validation/salary-component'

// ============================================================
// Types
// ============================================================

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: 'create' | 'edit'
  initialData?: {
    id: string
    code: string
    name: string
    description: string | null
    type: string
    calcMethod: string
    defaultAmount: number | null
  }
}

// ============================================================
// Component
// ============================================================

export function ComponentFormDialog({
  open,
  onOpenChange,
  mode = 'create',
  initialData,
}: Props) {
  const router = useRouter()
  const isEdit = mode === 'edit'

  // ✅ Init langsung dari props — component di-remount via `key` di parent
  const [code, setCode] = useState(initialData?.code ?? '')
  const [name, setName] = useState(initialData?.name ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [type, setType] = useState(initialData?.type ?? 'EARNING')
  const [calcMethod, setCalcMethod] = useState(
    initialData?.calcMethod ?? 'FIXED',
  )
  const [defaultAmount, setDefaultAmount] = useState(
    initialData?.defaultAmount?.toString() ?? '',
  )
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})

    try {
      const endpoint = isEdit
        ? `/api/salary-components/${initialData?.id}`
        : '/api/salary-components'

      const method = isEdit ? 'PATCH' : 'POST'

      const body = isEdit
        ? {
            name,
            description,
            calcMethod,
            defaultAmount: defaultAmount ? Number(defaultAmount) : null,
          }
        : {
            code,
            name,
            description,
            type,
            calcMethod,
            defaultAmount: defaultAmount ? Number(defaultAmount) : null,
            sortOrder: 0,
            isTaxable: false,
          }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal menyimpan')
        if (json.error?.fields) setFieldErrors(json.error.fields)
        return
      }

      toast.success(
        isEdit ? 'Komponen diupdate' : 'Komponen ditambahkan',
      )
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
      <DialogContent className="max-w-lg w-[95vw] max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? (
              <Pencil className="h-5 w-5 text-violet-600" />
            ) : (
              <Plus className="h-5 w-5 text-violet-600" />
            )}
            {isEdit ? 'Edit Komponen' : 'Tambah Komponen'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Ubah nama, metode, atau nominal default.'
              : 'Buat komponen gaji baru.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="px-6 py-5 space-y-4">
              {/* Code */}
              <div className="space-y-2">
                <Label htmlFor="code">
                  Kode <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))
                  }
                  disabled={loading || isEdit}
                  required
                  className="font-mono"
                  placeholder="BASIC_SALARY"
                />
                <p className="text-[10px] text-muted-foreground">
                  Huruf besar, angka, underscore. Gak bisa diubah setelah dibuat.
                </p>
                {fieldErrors.code?.map((m) => (
                  <FieldError key={m} message={m} />
                ))}
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nama <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  required
                  placeholder="Gaji Pokok"
                />
                {fieldErrors.name?.map((m) => (
                  <FieldError key={m} message={m} />
                ))}
              </div>

              {/* Type — hanya create */}
              {!isEdit && (
                <div className="space-y-2">
                  <Label>
                    Tipe <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={type}
                    onValueChange={(v: string | null) => setType(v ?? 'EARNING')}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EARNING">Pendapatan</SelectItem>
                      <SelectItem value="DEDUCTION">Potongan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Calc Method */}
              <div className="space-y-2">
                <Label>
                  Metode Perhitungan <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={calcMethod}
                  onValueChange={(v: string | null) =>
                    setCalcMethod(v ?? 'FIXED')
                  }
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CALC_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {CALC_METHOD_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  {CALC_METHOD_HINTS[calcMethod]}
                </p>
              </div>

              {/* Default Amount */}
              <div className="space-y-2">
                <Label htmlFor="defaultAmount">
                  Nominal Default
                  {calcMethod === 'PERCENTAGE' && ' (%)'}
                </Label>
                <Input
                  id="defaultAmount"
                  type="number"
                  min={0}
                  value={defaultAmount}
                  onChange={(e) => setDefaultAmount(e.target.value)}
                  disabled={loading}
                  placeholder={
                    calcMethod === 'PERCENTAGE' ? '2' : '2500000'
                  }
                />
                <p className="text-[10px] text-muted-foreground">
                  Opsional. Bisa di-override di config role / user.
                </p>
                {fieldErrors.defaultAmount?.map((m) => (
                  <FieldError key={m} message={m} />
                ))}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                  placeholder="opsional"
                />
                {fieldErrors.description?.map((m) => (
                  <FieldError key={m} message={m} />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t bg-muted/30 px-6 py-4">
            <div className="flex items-center justify-end gap-2">
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
                {isEdit ? 'Simpan' : 'Tambah'}
              </Button>
            </div>
          </div>
        </form>
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