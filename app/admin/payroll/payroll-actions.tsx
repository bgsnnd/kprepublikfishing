'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MoreHorizontal,
  Loader2,
  Eye,
  CheckCircle2,
  Trash2,
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

// ============================================================
// Types
// ============================================================

type PayrollActionItem = {
  id: string
  userName: string
  periodMonth: number
  periodYear: number
  status: string
}

type Props = {
  payroll: PayrollActionItem
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

// ============================================================
// Component
// ============================================================

export function PayrollActions({ payroll }: Props) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const canApprove = payroll.status === 'DRAFT'
  const canDelete = payroll.status !== 'PAID'

  function goToDetail() {
    router.push(`/admin/payroll/${payroll.id}`)
  }

  async function handleApprove() {
    setLoading(true)
    try {
      const res = await fetch(`/api/payroll/${payroll.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: '' }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal approve')
        return
      }

      toast.success('Payroll disetujui')
      setApproveOpen(false)
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
      const res = await fetch(`/api/payroll/${payroll.id}`, {
        method: 'DELETE',
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal hapus')
        return
      }

      toast.success('Payroll dihapus')
      setDeleteOpen(false)
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
          {/* ✅ Ganti asChild + Link → onClick + router.push */}
          <DropdownMenuItem onClick={goToDetail}>
            <Eye className="mr-2 h-4 w-4" />
            Lihat Detail
          </DropdownMenuItem>

          {canApprove && (
            <DropdownMenuItem onClick={() => setApproveOpen(true)}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Setujui
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {canDelete && (
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Approve Dialog */}
      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Setujui Payroll?</AlertDialogTitle>
            <AlertDialogDescription>
              Payroll <strong>{payroll.userName}</strong> periode{' '}
              <strong>
                {MONTHS[payroll.periodMonth - 1]} {payroll.periodYear}
              </strong>{' '}
              akan disetujui. Setelah disetujui, payroll gak bisa di-edit lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleApprove()
              }}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Setujui
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Payroll?</AlertDialogTitle>
            <AlertDialogDescription>
              Payroll <strong>{payroll.userName}</strong> periode{' '}
              <strong>
                {MONTHS[payroll.periodMonth - 1]} {payroll.periodYear}
              </strong>{' '}
              akan dihapus permanen.
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