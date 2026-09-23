'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MoreHorizontal,
  Pencil,
  Power,
  Trash2,
  Star,
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
import { LocationFormDialog } from './location-form-dialog'
import type { LocationListItem } from '@/lib/locations/queries'

type Props = {
  location: LocationListItem
}

export function LocationActions({ location }: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [setDefaultOpen, setSetDefaultOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const hasRelations =
    location.userCount > 0 || location.attendanceCount > 0

  async function handleDelete() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/locations/${location.code}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal menghapus')
        return
      }

      toast.success(json.data?.message ?? 'Berhasil')
      setDeleteOpen(false)
      router.refresh()
    } finally {
      setActionLoading(false)
    }
  }

  async function handleActivate() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/locations/${location.code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: location.name,
          type: location.type,
          address: location.address ?? '',
          latitude: location.latitude,
          longitude: location.longitude,
          radiusMeters: location.radiusMeters,
          isActive: true,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error?.message ?? 'Gagal mengaktifkan')
        return
      }

      toast.success('Lokasi diaktifkan')
      setDeleteOpen(false)
      router.refresh()
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSetDefault() {
    setActionLoading(true)
    try {
      const res = await fetch(
        `/api/locations/${location.code}/set-default`,
        { method: 'POST' },
      )
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal set default')
        return
      }

      toast.success(json.data?.message ?? 'Berhasil')
      setSetDefaultOpen(false)
      router.refresh()
    } finally {
      setActionLoading(false)
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
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          {!location.isDefault && location.isActive && (
            <DropdownMenuItem onClick={() => setSetDefaultOpen(true)}>
              <Star className="mr-2 h-4 w-4" />
              Set Default
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {location.isActive ? (
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

      <LocationFormDialog
        key={location.code}
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        initialData={{
          id: location.id,
          code: location.code,
          name: location.name,
          type: location.type,
          address: location.address ?? '',
          latitude: location.latitude,
          longitude: location.longitude,
          radiusMeters: location.radiusMeters,
          isDefault: location.isDefault,
          isActive: location.isActive,
        }}
      />

      <AlertDialog open={setDefaultOpen} onOpenChange={setSetDefaultOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set sebagai Lokasi Default?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{location.name}</strong> akan menjadi lokasi default
              untuk validasi absensi. Lokasi default sebelumnya akan otomatis
              di-unset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleSetDefault()
              }}
              disabled={actionLoading}
            >
              {actionLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Set Default
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {location.isActive
                ? hasRelations
                  ? 'Nonaktifkan Lokasi?'
                  : 'Hapus Lokasi?'
                : 'Aktifkan Lokasi?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {location.isActive ? (
                hasRelations ? (
                  <>
                    Lokasi <strong>{location.name}</strong> masih terkait
                    dengan {location.userCount} user dan{' '}
                    {location.attendanceCount} absensi.
                    <br />
                    <br />
                    Lokasi akan <strong>dinonaktifkan</strong> — tidak muncul
                    di dropdown absensi, tapi data historis tetap aman.
                  </>
                ) : (
                  <>
                    Lokasi <strong>{location.name}</strong> tidak punya relasi
                    dengan user atau absensi.
                    <br />
                    <br />
                    Lokasi akan <strong>dihapus permanen</strong>.
                  </>
                )
              ) : (
                <>
                  Lokasi <strong>{location.name}</strong> akan aktif kembali.
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
                if (location.isActive) {
                  handleDelete()
                } else {
                  handleActivate()
                }
              }}
              disabled={actionLoading}
              className={
                location.isActive && !hasRelations
                  ? 'bg-destructive text-white hover:bg-destructive/90'
                  : ''
              }
            >
              {actionLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {location.isActive
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