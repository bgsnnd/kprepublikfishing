'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MoreHorizontal,
  Pencil,
  KeyRound,
  Power,
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
import { UserFormDialog } from './user-form-dialog'
import { ResetPasswordDialog } from './reset-password-dialog'

type RoleOption = {
  code: string
  name: string
  description: string | null
}
type EmployeeTypeOption = { code: string; name: string }

type UserActionsProps = {
  user: {
    username: string
    name: string
    isActive: boolean
  }
  roles: RoleOption[]
  employeeTypes: EmployeeTypeOption[]
}

type EditData = {
  username: string
  name: string
  email: string
  phone: string
  employeeTypeCode: string
  roleCodes: string[]
}

export function UserActions({ user, roles, employeeTypes }: UserActionsProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [editData, setEditData] = useState<EditData | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [toggleOpen, setToggleOpen] = useState(false)
  const [toggleLoading, setToggleLoading] = useState(false)

  async function openEdit() {
    setEditLoading(true)
    try {
      const res = await fetch(`/api/users/${user.username}`)
      if (!res.ok) {
        toast.error('Gagal memuat data user')
        return
      }
      const json = await res.json()
      const u = json.data

      setEditData({
        username: u.username,
        name: u.name,
        email: u.email,
        phone: u.phone ?? '',
        employeeTypeCode: u.employeeType?.code ?? '',
        roleCodes: u.roles.map((r: { code: string }) => r.code),
      })
      setEditOpen(true)
    } finally {
      setEditLoading(false)
    }
  }

  async function handleToggleActive() {
    setToggleLoading(true)
    try {
      const res = await fetch(`/api/users/${user.username}/toggle-active`, {
        method: 'POST',
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal mengubah status')
        return
      }

      toast.success(
        user.isActive ? 'User dinonaktifkan' : 'User diaktifkan',
      )
      setToggleOpen(false)
      router.refresh()
    } finally {
      setToggleLoading(false)
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
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={openEdit} disabled={editLoading}>
            {editLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Pencil className="mr-2 h-4 w-4" />
            )}
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setResetOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            Reset Password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setToggleOpen(true)}
            className={
              user.isActive ? 'text-destructive focus:text-destructive' : ''
            }
          >
            <Power className="mr-2 h-4 w-4" />
            {user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {editData && (
        <UserFormDialog
          key={editData.username}
          open={editOpen}
          onOpenChange={(o) => {
            setEditOpen(o)
            if (!o) setEditData(null)
          }}
          mode="edit"
          roles={roles}
          employeeTypes={employeeTypes}
          initialData={editData}
        />
      )}

      <ResetPasswordDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        username={user.username}
        userName={user.name}
      />

      <AlertDialog open={toggleOpen} onOpenChange={setToggleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {user.isActive ? 'Nonaktifkan User?' : 'Aktifkan User?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {user.isActive ? (
                <>
                  User <strong>{user.name}</strong> (@{user.username}) tidak
                  akan bisa login lagi sampai diaktifkan kembali.
                </>
              ) : (
                <>
                  User <strong>{user.name}</strong> (@{user.username}) akan
                  bisa login kembali.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggleLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleToggleActive()
              }}
              disabled={toggleLoading}
            >
              {toggleLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}