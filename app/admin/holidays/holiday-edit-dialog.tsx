'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, Pencil } from 'lucide-react'
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
  HOLIDAY_TYPES,
  HOLIDAY_TYPE_LABELS,
} from '@/lib/validation/holiday'

// ============================================================
// Types
// ============================================================

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  holiday: {
    id: string
    date: string
    name: string
    type: string
    isActive: boolean
  }
}

// ============================================================
// Component
// ============================================================

export function HolidayEditDialog({ open, onOpenChange, holiday }: Props) {
  const router = useRouter()

  // ✅ Langsung dari props — component di-remount via `key` di parent
  const [name, setName] = useState(holiday.name)
  const [type, setType] = useState<string>(holiday.type)
  const [isActive, setIsActive] = useState(holiday.isActive)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})

    try {
      const res = await fetch(`/api/holidays/${holiday.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, isActive }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal menyimpan perubahan')
        if (json.error?.fields) setFieldErrors(json.error.fields)
        return
      }

      toast.success('Hari libur berhasil diperbarui')
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
            <Pencil className="h-5 w-5 text-violet-600" />
            Edit Hari Libur
          </DialogTitle>
          <DialogDescription>
            Ubah nama, tipe, atau status aktif hari libur.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Tanggal (readonly) */}
          <div className="space-y-2">
            <Label>Tanggal</Label>
            <Input
              type="date"
              value={holiday.date.slice(0, 10)}
              disabled
              readOnly
            />
            <p className="text-xs text-muted-foreground">
              Tanggal tidak bisa diubah. Hapus & buat baru kalau perlu ganti.
            </p>
          </div>

          {/* Nama */}
          <div className="space-y-2">
            <Label htmlFor="edit-holiday-name">
              Nama Libur <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-holiday-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
            {fieldErrors.name?.map((m) => (
              <FieldError key={m} message={m} />
            ))}
          </div>

          {/* Tipe */}
          <div className="space-y-2">
            <Label htmlFor="edit-holiday-type">Tipe</Label>
            <Select
              value={type}
              onValueChange={(v: string | null) => setType(v ?? 'NATIONAL')}
              disabled={loading}
            >
              <SelectTrigger id="edit-holiday-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOLIDAY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {HOLIDAY_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.type?.map((m) => (
              <FieldError key={m} message={m} />
            ))}
          </div>

          {/* Status Aktif */}
          <div className="flex items-center gap-3 p-3 rounded-lg border">
            <input
              id="edit-holiday-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={loading}
              className="h-4 w-4"
            />
            <Label
              htmlFor="edit-holiday-active"
              className="text-sm cursor-pointer flex-1"
            >
              Aktif — bulk create akan skip tanggal ini
            </Label>
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
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Field Error
// ============================================================

function FieldError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-1.5 text-xs text-destructive">
      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}