'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Mail,
  AtSign,
  Shield,
  LogOut,
  Loader2,
  ChevronRight,
  Clock,
  KeyRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChangePasswordDialog } from '@/components/auth/change-password-dialog'

type Props = {
  user: {
    name: string
    username: string
    email: string
    roleCodes: string[]
    permissions: string[]
  }
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  KASIR_KANTIN: 'Kasir Kantin',
  KASIR_PANCING: 'Kasir Pancing',
  CADDY: 'Caddy',
  KARYAWAN: 'Karyawan',
}

export function ProfileClient({ user }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)

  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function handleLogout() {
    setLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <div className="rounded-2xl border bg-card p-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-violet-800 text-2xl font-bold text-white shadow-lg">
          {initials}
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight">{user.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">@{user.username}</p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {user.roleCodes.map((role) => (
            <span
              key={role}
              className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/20 dark:text-violet-400"
            >
              {ROLE_LABELS[role] ?? role}
            </span>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Informasi Akun</h2>
        </div>

        <div className="divide-y">
          <InfoRow icon={User} label="Nama" value={user.name} />
          <InfoRow icon={AtSign} label="Username" value={`@${user.username}`} />
          <InfoRow icon={Mail} label="Email" value={user.email} />
          <InfoRow
            icon={Shield}
            label="Role"
            value={user.roleCodes.map((r) => ROLE_LABELS[r] ?? r).join(', ')}
          />
        </div>
      </div>

      {/* Menu */}
      <div className="rounded-2xl border bg-card overflow-hidden divide-y">
        <button
          type="button"
          onClick={() => router.push('/absensi/riwayat')}
          className="w-full flex items-center justify-between px-4 py-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <Clock className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Riwayat Absensi</p>
              <p className="text-xs text-muted-foreground">
                Lihat seluruh riwayat kehadiran
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        <button
          type="button"
          onClick={() => setChangePasswordOpen(true)}
          className="w-full flex items-center justify-between px-4 py-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <KeyRound className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Ganti Password</p>
              <p className="text-xs text-muted-foreground">
                Ubah password akun Anda
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Logout */}
      <Button
        variant="outline"
        onClick={handleLogout}
        disabled={loading}
        className="w-full h-12 text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="mr-2 h-4 w-4" />
        )}
        Keluar dari Akun
      </Button>

      <p className="text-center text-xs text-muted-foreground pt-2">
        © {new Date().getFullYear()} KP Republik Fishing
      </p>

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-20 shrink-0">
        {label}
      </span>
      <span className="text-sm font-medium truncate flex-1 text-right">
        {value}
      </span>
    </div>
  )
}