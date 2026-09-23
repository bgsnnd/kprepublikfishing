'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MoreHorizontal,
  Pencil,
  Power,
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
import { EmployeeTypeFormDialog } from './employee-type-form-dialog'

type EmployeeType = {
  code: string
  name: string
  description: string | null
  isActive: boolean
  userCount: number
}

type Props = {
  employeeType: EmployeeType
}

export function EmployeeTypeActions({ employeeType }: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // ============================================================
  // HAPUS (hard atau soft — tergantung relasi)
  // ============================================================
  async function handleDelete() {
    setActionLoading(true)
    try {
      const res = await fetch(
        `/api/employee-types/${employeeType.code}`,
        { method: 'DELETE' },
      )
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal menghapus')
        return
      }

      const isHardDelete = json.data?.deleted === true
      toast.success(
        isHardDelete
          ? `Tipe "${employeeType.name}" dihapus permanen`
          : `Tipe "${employeeType.name}" dinonaktifkan`,
      )
      setDeleteOpen(false)
      router.refresh()
    } catch {
      toast.error('Tidak dapat terhubung ke server')
    } finally {
      setActionLoading(false)
    }
  }

  // ============================================================
  // AKTIFKAN kembali
  // ============================================================
  async function handleActivate() {
    setActionLoading(true)
    try {
      const res = await fetch(
        `/api/employee-types/${employeeType.code}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: employeeType.name,
            description: employeeType.description ?? '',
            isActive: true,
          }),
        },
      )
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal mengaktifkan')
        return
      }

      toast.success('Tipe karyawan diaktifkan')
      setDeleteOpen(false)
      router.refresh()
    } catch {
      toast.error('Tidak dapat terhubung ke server')
    } finally {
      setActionLoading(false)
    }
  }

  const hasRelations = employeeType.userCount > 0

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
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {employeeType.isActive ? (
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
              <Power className="mr-2 h-4 w-4" />
              Aktifkan
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <EmployeeTypeFormDialog
        key={employeeType.code}
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        initialData={{
          code: employeeType.code,
          name: employeeType.name,
          description: employeeType.description ?? '',
          isActive: employeeType.isActive,
        }}
      />

      {/* Delete/Activate Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {employeeType.isActive
                ? hasRelations
                  ? 'Nonaktifkan Tipe Karyawan?'
                  : 'Hapus Tipe Karyawan?'
                : 'Aktifkan Tipe Karyawan?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {employeeType.isActive ? (
                hasRelations ? (
                  <>
                    Tipe <strong>{employeeType.name}</strong> masih dipakai
                    oleh <strong>{employeeType.userCount} user</strong>, jadi
                    tidak bisa dihapus permanen.
                    <br />
                    <br />
                    Tipe ini akan <strong>dinonaktifkan</strong> — tidak
                    muncul di dropdown, tapi data historis tetap aman.
                  </>
                ) : (
                  <>
                    Tipe <strong>{employeeType.name}</strong> tidak punya
                    relasi dengan user manapun.
                    <br />
                    <br />
                    Tipe ini akan <strong>dihapus permanen</strong> dari
                    database.
                  </>
                )
              ) : (
                <>
                  Tipe <strong>{employeeType.name}</strong> akan aktif
                  kembali dan muncul di dropdown.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (employeeType.isActive) {
                  handleDelete()
                } else {
                  handleActivate()
                }
              }}
              disabled={actionLoading}
              className={
                employeeType.isActive && !hasRelations
                  ? 'bg-destructive text-white hover:bg-destructive/90'
                  : ''
              }
            >
              {actionLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {employeeType.isActive
                ? hasRelations
                  ? 'Nonaktifkan'
                  : 'Hapus Permanen'
                : 'Aktifkan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}