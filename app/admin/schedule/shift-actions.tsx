'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MoreHorizontal,
  Pencil,
  CheckCircle2,
  Ban,
  Trash2,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ShiftFormDialog } from './shift-form-dialog'

// ============================================================
// Types
// ============================================================

type Shift = {
  id: string
  userName: string
  username: string
  shiftDate: string
  startTime: string
  endTime: string
  position: string | null
  status: string
  notes: string | null
}

type Props = {
  shift: Shift
}

const WIB_TZ = 'Asia/Jakarta'

// ============================================================
// Helpers — Timezone WIB
// ============================================================

/**
 * ISO string (UTC) → "HH:mm" WIB
 */
function toTimeWIB(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-GB', {
    timeZone: WIB_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * ISO string (UTC) → "yyyy-MM-dd" WIB
 */
function toDateWIB(iso: string): string {
  const d = new Date(iso)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: WIB_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

// ============================================================
// Component
// ============================================================

export function ShiftActions({ shift }: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // ✅ Konversi ISO UTC → "yyyy-MM-dd" + "HH:mm" WIB untuk edit dialog
  const wibDate = toDateWIB(shift.shiftDate)
  const wibStart = toTimeWIB(shift.startTime)
  const wibEnd = toTimeWIB(shift.endTime)

  // ✅ Konversi "yyyy-MM-dd" + "HH:mm" WIB → ISO UTC untuk API
  function buildISO(timeWIB: string): string {
    const [year, month, day] = wibDate.split('-').map(Number)
    const [hours, minutes] = timeWIB.split(':').map(Number)
    return new Date(
      Date.UTC(year, month - 1, day, hours - 7, minutes, 0, 0),
    ).toISOString()
  }

  // ============================================================
  // Konfirmasi shift
  // ============================================================
  async function handleConfirm() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/shifts/${shift.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: buildISO(wibStart), // ✅ ISO UTC
          endTime: buildISO(wibEnd),     // ✅ ISO UTC
          position: shift.position ?? '',
          status: 'CONFIRMED',
          notes: shift.notes ?? '',
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal konfirmasi')
        return
      }

      toast.success('Shift dikonfirmasi')
      setConfirmOpen(false)
      router.refresh()
    } finally {
      setActionLoading(false)
    }
  }

  // ============================================================
  // Batalkan shift
  // ============================================================
  async function handleCancel() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/shifts/${shift.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: buildISO(wibStart),
          endTime: buildISO(wibEnd),
          position: shift.position ?? '',
          status: 'CANCELLED',
          notes: shift.notes ?? '',
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal batalkan')
        return
      }

      toast.success('Shift dibatalkan')
      setCancelOpen(false)
      router.refresh()
    } finally {
      setActionLoading(false)
    }
  }

  // ============================================================
  // Hapus shift
  // ============================================================
  async function handleDelete() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/shifts/${shift.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal hapus')
        return
      }

      toast.success('Shift dihapus')
      setDeleteOpen(false)
      router.refresh()
    } finally {
      setActionLoading(false)
    }
  }

  const isCancelled = shift.status === 'CANCELLED'
  const isConfirmed = shift.status === 'CONFIRMED'

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>

          {!isConfirmed && !isCancelled && (
            <DropdownMenuItem onClick={() => setConfirmOpen(true)}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Konfirmasi
            </DropdownMenuItem>
          )}

          {!isCancelled && (
            <DropdownMenuItem
              onClick={() => setCancelOpen(true)}
              className="text-amber-600 focus:text-amber-600"
            >
              <Ban className="mr-2 h-4 w-4" />
              Batalkan
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* EDIT DIALOG — kirim WIB "HH:mm", bukan ISO */}
      <ShiftFormDialog
        key={shift.id}
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        initialData={{
          username: shift.username,
          shiftDate: wibDate,        // "2026-09-30"
          startTime: wibStart,       // "15:00"
          endTime: wibEnd,           // "00:00"
          position: shift.position ?? '',
          status: shift.status,
          notes: shift.notes ?? '',
        }}
      />

      {/* KONFIRMASI */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Shift?</AlertDialogTitle>
            <AlertDialogDescription>
              Shift <strong>{shift.userName}</strong> akan ditandai{' '}
              <strong>Dikonfirmasi</strong> — siap untuk bekerja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleConfirm()
              }}
              disabled={actionLoading}
            >
              {actionLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Konfirmasi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* BATALKAN */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Shift?</AlertDialogTitle>
            <AlertDialogDescription>
              Shift <strong>{shift.userName}</strong> akan ditandai{' '}
              <strong>Dibatalkan</strong>. Karyawan tidak dijadwalkan bekerja
              pada jam ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleCancel()
              }}
              disabled={actionLoading}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {actionLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Batalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* HAPUS */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Shift?</AlertDialogTitle>
            <AlertDialogDescription>
              Shift <strong>{shift.userName}</strong> tanggal{' '}
              {new Date(shift.shiftDate).toLocaleDateString('id-ID', {
                timeZone: WIB_TZ,
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}{' '}
              akan dihapus permanen. Tindakan ini akan tercatat di audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={actionLoading}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {actionLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}