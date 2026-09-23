'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Power,
  PowerOff,
} from 'lucide-react'
import { toast } from 'sonner'
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
import { HolidayEditDialog } from './holiday-edit-dialog'

// ============================================================
// Types
// ============================================================

type HolidayActionItem = {
  id: string
  date: string
  name: string
  type: string
  isActive: boolean
}

type Props = {
  holiday: HolidayActionItem
}

// ============================================================
// Component
// ============================================================

export function HolidayActions({ holiday }: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      const res = await fetch(`/api/holidays/${holiday.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal menghapus libur')
        return
      }

      toast.success('Hari libur berhasil dihapus')
      setDeleteOpen(false)
      router.refresh()
    } catch {
      toast.error('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActive() {
    setLoading(true)
    try {
      const res = await fetch(`/api/holidays/${holiday.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: holiday.name,
          type: holiday.type,
          isActive: !holiday.isActive,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal mengubah status')
        return
      }

      toast.success(
        holiday.isActive
          ? 'Hari libur dinonaktifkan'
          : 'Hari libur diaktifkan',
      )
      router.refresh()
    } catch {
      toast.error('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        {/* ✅ Tanpa asChild — pakai className langsung */}
        <DropdownMenuTrigger
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggleActive}>
            {holiday.isActive ? (
              <>
                <PowerOff className="mr-2 h-4 w-4" />
                Nonaktifkan
              </>
            ) : (
              <>
                <Power className="mr-2 h-4 w-4" />
                Aktifkan
              </>
            )}
          </DropdownMenuItem>
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

      {/* Edit Dialog — kasih key biar re-mount */}
      <HolidayEditDialog
        key={editOpen ? `edit-${holiday.id}` : 'edit-closed'}
        open={editOpen}
        onOpenChange={setEditOpen}
        holiday={holiday}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Hari Libur?</AlertDialogTitle>
            <AlertDialogDescription>
              Hari libur <strong>{holiday.name}</strong> (
              {new Date(holiday.date).toLocaleDateString('id-ID', {
                timeZone: 'UTC',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
              ) akan dihapus permanen. Bulk create berikutnya tidak akan skip
              tanggal ini lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}