'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
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
import { SHIFT_STATUS_LABELS, SHIFT_STATUSES } from '@/lib/validation/shift'

// ============================================================
// Types
// ============================================================

type ShiftFormData = {
  id?: string
  username?: string
  shiftDate: string
  startTime: string  // "HH:mm" WIB
  endTime: string    // "HH:mm" WIB
  position: string
  status?: string
  notes: string
}

type ShiftFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  initialData?: ShiftFormData
}

const EMPTY_FORM: ShiftFormData = {
  shiftDate: '',
  startTime: '08:00',
  endTime: '17:00',
  position: '',
  notes: '',
}

// ============================================================
// Component
// ============================================================

export function ShiftFormDialog({
  open,
  onOpenChange,
  mode,
  initialData,
}: ShiftFormDialogProps) {
  const router = useRouter()
  const [form, setForm] = useState<ShiftFormData>(initialData ?? EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const isCreate = mode === 'create'

    if (!isCreate && !initialData?.id) {
      toast.error('ID shift tidak ditemukan')
      return
    }

    setLoading(true)
    setFieldErrors({})

    try {
      const endpoint = isCreate
        ? '/api/shifts'
        : `/api/shifts/${initialData?.id}`

      const method = isCreate ? 'POST' : 'PATCH'

      // ✅ Kirim "HH:mm" WIB mentah — API yang konversi ke UTC
      const body = isCreate
        ? {
            username: form.username,
            shiftDate: form.shiftDate,       // "2026-09-30"
            startTime: form.startTime,       // "15:00" WIB
            endTime: form.endTime,           // "00:00" WIB
            position: form.position,
            notes: form.notes,
          }
        : {
            startTime: form.startTime,       // "16:00" WIB
            endTime: form.endTime,           // "01:00" WIB
            position: form.position,
            status: form.status,
            notes: form.notes,
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
        isCreate ? 'Shift berhasil dibuat' : 'Shift berhasil diupdate',
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
          <DialogTitle className="text-lg">
            {mode === 'create' ? 'Tambah Shift' : 'Edit Shift'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Buat jadwal shift baru untuk karyawan.'
              : `Ubah jadwal shift ${initialData?.username ?? ''}.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Username — hanya di create */}
                {mode === 'create' && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="username">
                      Username Karyawan{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="username"
                      value={form.username ?? ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          username: e.target.value.toLowerCase(),
                        })
                      }
                      disabled={loading}
                      required
                      className="font-mono"
                      placeholder="superadmin"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Username karyawan (bukan email)
                    </p>
                    <FieldError messages={fieldErrors.username} />
                  </div>
                )}

                {/* Tanggal — hanya di create */}
                {mode === 'create' && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="shiftDate">
                      Tanggal Shift{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="shiftDate"
                      type="date"
                      value={form.shiftDate}
                      onChange={(e) =>
                        setForm({ ...form, shiftDate: e.target.value })
                      }
                      disabled={loading}
                      required
                    />
                    <FieldError messages={fieldErrors.shiftDate} />
                  </div>
                )}

                {/* Jam mulai */}
                <div className="space-y-2">
                  <Label htmlFor="startTime">
                    Jam Mulai <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={form.startTime}
                    onChange={(e) =>
                      setForm({ ...form, startTime: e.target.value })
                    }
                    disabled={loading}
                    required
                  />
                  <FieldError messages={fieldErrors.startTime} />
                </div>

                {/* Jam selesai */}
                <div className="space-y-2">
                  <Label htmlFor="endTime">
                    Jam Selesai <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={form.endTime}
                    onChange={(e) =>
                      setForm({ ...form, endTime: e.target.value })
                    }
                    disabled={loading}
                    required
                  />
                  <FieldError messages={fieldErrors.endTime} />
                </div>

                {/* Posisi */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="position">Posisi / Penempatan</Label>
                  <Input
                    id="position"
                    value={form.position}
                    onChange={(e) =>
                      setForm({ ...form, position: e.target.value })
                    }
                    disabled={loading}
                    placeholder="Misal: Kantin Pagi, Caddy Flight A"
                  />
                  <FieldError messages={fieldErrors.position} />
                </div>

                {/* Status — hanya di edit */}
                {mode === 'edit' && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Status</Label>
                    <Select
                      value={form.status ?? 'SCHEDULED'}
                      onValueChange={(v: string | null) =>
                        setForm({ ...form, status: v ?? 'SCHEDULED' })
                      }
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SHIFT_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {SHIFT_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError messages={fieldErrors.status} />
                  </div>
                )}

                {/* Catatan */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="notes">Catatan</Label>
                  <Input
                    id="notes"
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    disabled={loading}
                    placeholder="opsional"
                  />
                  <FieldError messages={fieldErrors.notes} />
                </div>
              </div>
            </div>
          </div>

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
                {mode === 'create' ? 'Simpan' : 'Update'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Field Error
// ============================================================

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null
  return (
    <div className="flex items-start gap-1.5 text-xs text-destructive">
      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
      <div>
        {messages.map((m) => (
          <div key={m}>{m}</div>
        ))}
      </div>
    </div>
  )
}