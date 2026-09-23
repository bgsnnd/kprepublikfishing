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
import { ATTENDANCE_STATUS_LABELS } from '@/lib/validation/attendance'

type Attendance = {
  id: string
  username: string
  userName: string
  workDate: string
  checkIn: string
  checkOut: string | null
  status: string
  notes: string | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  attendance: Attendance
}

/**
 * Konversi ISO string → "YYYY-MM-DDTHH:mm" untuk input datetime-local
 */
function toLocalDateTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const tzOffset = d.getTimezoneOffset() * 60000
  const local = new Date(d.getTime() - tzOffset)
  return local.toISOString().slice(0, 16)
}

export function AttendanceCorrectDialog({
  open,
  onOpenChange,
  attendance,
}: Props) {
  const router = useRouter()
  const [checkIn, setCheckIn] = useState(
    toLocalDateTime(attendance.checkIn),
  )
  const [checkOut, setCheckOut] = useState(
    toLocalDateTime(attendance.checkOut),
  )
  const [status, setStatus] = useState(attendance.status)
  const [notes, setNotes] = useState(attendance.notes ?? '')
  const [correctionNote, setCorrectionNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})

    try {
      const body: Record<string, unknown> = {
        status,
        notes,
        correctionNote,
      }

      if (checkIn) {
        body.checkIn = new Date(checkIn).toISOString()
      }

      // checkOut bisa null (hapus jam keluar)
      if (checkOut) {
        body.checkOut = new Date(checkOut).toISOString()
      } else if (attendance.checkOut) {
        body.checkOut = null
      }

      const res = await fetch(`/api/attendance/${attendance.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal koreksi')
        if (json.error?.fields) setFieldErrors(json.error.fields)
        return
      }

      toast.success('Absensi berhasil dikoreksi')
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
      <DialogContent className="max-w-lg w-[95vw] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Koreksi Absensi
          </DialogTitle>
          <DialogDescription>
            Koreksi data absensi <strong>{attendance.userName}</strong>.
            Tindakan akan tercatat di audit log.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkIn">Jam Masuk</Label>
                <Input
                  id="checkIn"
                  type="datetime-local"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  disabled={loading}
                />
                <FieldError messages={fieldErrors.checkIn} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkOut">Jam Keluar</Label>
                <Input
                  id="checkOut"
                  type="datetime-local"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  disabled={loading}
                  placeholder="Kosongkan jika belum keluar"
                />
                <p className="text-xs text-muted-foreground">
                  Kosongkan jika karyawan belum keluar
                </p>
                <FieldError messages={fieldErrors.checkOut} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(v: string | null) =>
                  setStatus(v ?? 'HADIR')
                }
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ATTENDANCE_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
                placeholder="opsional"
              />
            </div>

            <div className="space-y-2 pt-3 border-t">
              <Label htmlFor="correctionNote">
                Alasan Koreksi <span className="text-destructive">*</span>
              </Label>
              <Input
                id="correctionNote"
                value={correctionNote}
                onChange={(e) => setCorrectionNote(e.target.value)}
                disabled={loading}
                required
                placeholder="Misal: lupa check-out, koreksi jam masuk"
              />
              <p className="text-xs text-muted-foreground">
                Alasan koreksi wajib diisi untuk audit trail
              </p>
              <FieldError messages={fieldErrors.correctionNote} />
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
                Simpan Koreksi
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

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