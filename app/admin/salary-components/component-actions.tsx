'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MoreHorizontal,
  Loader2,
  Pencil,
  Trash2,
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
import { ComponentFormDialog } from './component-form-dialog'

// ============================================================
// Types
// ============================================================

type ComponentItem = {
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

type Props = {
  component: ComponentItem
}

// ============================================================
// Component
// ============================================================

export function ComponentActions({ component }: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleToggleActive() {
    setLoading(true)
    try {
      const res = await fetch(`/api/salary-components/${component.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !component.isActive }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal mengubah status')
        return
      }

      toast.success(
        component.isActive ? 'Komponen dinonaktifkan' : 'Komponen diaktifkan',
      )
      router.refresh()
    } catch {
      toast.error('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    try {
      const res = await fetch(`/api/salary-components/${component.id}`, {
        method: 'DELETE',
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal menghapus')
        return
      }

      toast.success('Komponen dihapus')
      setDeleteOpen(false)
      router.refresh()
    } catch {
      toast.error('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  const canDelete = !component.isSystem

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
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
            {component.isActive ? (
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

          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <ComponentFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        initialData={component}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Komponen?</AlertDialogTitle>
            <AlertDialogDescription>
              Komponen <strong>{component.name}</strong> (
              <code className="text-xs">{component.code}</code>) akan dihapus
              permanen. Tindakan ini tidak bisa dibatalkan.
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