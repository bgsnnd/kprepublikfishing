'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MoreHorizontal,
  Pencil,
  Copy,
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
import { RoleFormDialog } from './role-form-dialog'
import { RoleCloneDialog } from './role-clone-dialog'
import type { RoleListItem, PermissionGroup } from '@/lib/roles/queries'

type RoleActionsProps = {
  role: RoleListItem
  permissionGroups: PermissionGroup[]
}

type EditData = {
  id: string
  code: string
  name: string
  description: string
  isActive: boolean
  permissionIds: string[]
}

export function RoleActions({ role, permissionGroups }: RoleActionsProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [editData, setEditData] = useState<EditData | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [cloneOpen, setCloneOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function openEdit() {
    setEditLoading(true)
    try {
      const res = await fetch(`/api/roles/${role.id}`)
      if (!res.ok) {
        toast.error('Gagal memuat data role')
        return
      }
      const json = await res.json()
      const r = json.data

      setEditData({
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description ?? '',
        isActive: r.isActive,
        permissionIds: r.permissionIds,
      })
      setEditOpen(true)
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDelete() {
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/roles/${role.id}`, { method: 'DELETE' })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal menghapus role')
        return
      }

      toast.success('Role berhasil dihapus')
      setDeleteOpen(false)
      router.refresh()
    } finally {
      setDeleteLoading(false)
    }
  }

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
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={openEdit} disabled={editLoading}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCloneOpen(true)}>
            <Copy className="mr-2 h-4 w-4" />
            Clone
          </DropdownMenuItem>
          {!role.isSystem && (
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

      {editData && (
        <RoleFormDialog
          key={editData.id}  // ← REMOUNT saat id berubah
          open={editOpen}
          onOpenChange={setEditOpen}
          mode="edit"
          permissionGroups={permissionGroups}
          initialData={editData}
        />
      )}

      <RoleCloneDialog
        open={cloneOpen}
        onOpenChange={setCloneOpen}
        sourceRole={{ id: role.id, code: role.code, name: role.name }}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Role?</AlertDialogTitle>
            <AlertDialogDescription>
              Role <strong>{role.name}</strong> ({role.code}) akan dihapus
              permanen.
              {role.userCount > 0 && (
                <>
                  <br />
                  <br />
                  <span className="text-destructive">
                    Role ini masih dipakai oleh {role.userCount} user. Hapus
                    assignment user terlebih dahulu.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleteLoading || role.userCount > 0}
            >
              {deleteLoading && (
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