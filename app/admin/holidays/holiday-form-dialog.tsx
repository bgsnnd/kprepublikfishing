'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, CalendarDays } from 'lucide-react'
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
}

// ============================================================
// Component
// ============================================================

export function HolidayFormDialog({ open, onOpenChange }: Props) {
  const router = useRouter()

  const [date, setDate] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<string>('NATIONAL')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})

    try {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, name, type }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal menyimpan libur')
        if (json.error?.fields) setFieldErrors(json.error.fields)
        return
      }

      toast.success('Hari libur berhasil ditambahkan')
      handleOpenChange(false)
      router.refresh()
    } catch {
      toast.error('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setDate('')
      setName('')
      setType('NATIONAL')
      setFieldErrors({})
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-violet-600" />
            Tambah Hari Libur
          </DialogTitle>
          <DialogDescription>
            Tambahkan tanggal libur. Bulk create shift akan otomatis skip
            tanggal ini.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Tanggal */}
          <div className="space-y-2">
            <Label htmlFor="holiday-date">
              Tanggal <span className="text-destructive">*</span>
            </Label>
            <Input
              id="holiday-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={loading}
              required
            />
            {fieldErrors.date?.map((m) => (
              <FieldError key={m} message={m} />
            ))}
          </div>

          {/* Nama */}
          <div className="space-y-2">
            <Label htmlFor="holiday-name">
              Nama Libur <span className="text-destructive">*</span>
            </Label>
            <Input
              id="holiday-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              placeholder="cth: Hari Kemerdekaan RI"
              required
            />
            {fieldErrors.name?.map((m) => (
              <FieldError key={m} message={m} />
            ))}
          </div>

          {/* Tipe */}
          <div className="space-y-2">
            <Label htmlFor="holiday-type">Tipe</Label>
            <Select
              value={type}
              onValueChange={(v: string | null) => setType(v ?? 'NATIONAL')}
              disabled={loading}
            >
              <SelectTrigger id="holiday-type">
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

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
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