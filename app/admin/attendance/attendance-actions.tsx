'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MoreHorizontal,
  Eye,
  Pencil,
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
import { AttendanceDetailDialog } from './attendance-detail-dialog'
import { AttendanceCorrectDialog } from './attendance-correct-dialog'

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
  attendance: Attendance
}

export function AttendanceActions({ attendance }: Props) {
  const router = useRouter()
  const [detailOpen, setDetailOpen] = useState(false)
  const [correctOpen, setCorrectOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function handleDelete() {
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/attendance/${attendance.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal menghapus')
        return
      }

      toast.success('Absensi dihapus')
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
          {/* LIHAT DETAIL */}
          <DropdownMenuItem onClick={() => setDetailOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Lihat Detail
          </DropdownMenuItem>

          {/* KOREKSI */}
          <DropdownMenuItem onClick={() => setCorrectOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Koreksi
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* HAPUS */}
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* DETAIL DIALOG */}
      <AttendanceDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        attendanceId={attendance.id}
      />

      {/* KOREKSI DIALOG */}
      <AttendanceCorrectDialog
        open={correctOpen}
        onOpenChange={setCorrectOpen}
        attendance={attendance}
      />

      {/* DELETE CONFIRM */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Absensi?</AlertDialogTitle>
            <AlertDialogDescription>
              Absensi <strong>{attendance.userName}</strong> tanggal{' '}
              {new Date(attendance.workDate).toLocaleDateString('id-ID')} akan
              dihapus permanen. Tindakan ini akan tercatat di audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleteLoading}
              className="bg-destructive text-white hover:bg-destructive/90"
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