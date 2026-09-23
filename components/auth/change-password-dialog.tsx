'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// ============================================================
// Types
// ============================================================

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ============================================================
// Component
// ============================================================

export function ChangePasswordDialog({ open, onOpenChange }: Props) {
  const router = useRouter()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  // Password strength
  const checks = {
    length: newPassword.length >= 8,
    lower: /[a-z]/.test(newPassword),
    upper: /[A-Z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
  }
  const passedChecks = Object.values(checks).filter(Boolean).length

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal ganti password')
        if (json.error?.fields) setFieldErrors(json.error.fields)
        return
      }

      toast.success('Password berhasil diganti')
      setSuccess(true)

      // Delay 2 detik, baru logout
      setTimeout(async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
        router.push('/login')
        router.refresh()
      }, 2000)
    } catch {
      toast.error('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowCurrent(false)
      setShowNew(false)
      setShowConfirm(false)
      setSuccess(false)
      setFieldErrors({})
    }
    onOpenChange(nextOpen)
  }

  // Success state
  if (success) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center text-center py-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold">Password Berhasil Diganti</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Anda akan logout otomatis dalam 2 detik.
              <br />
              Silakan login ulang dengan password baru.
            </p>
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-4" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-violet-600" />
            Ganti Password
          </DialogTitle>
          <DialogDescription>
            Masukkan password lama dan password baru Anda.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">
              Password Lama <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                required
                placeholder="Masukkan password lama"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showCurrent ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {fieldErrors.currentPassword?.map((m) => (
              <FieldError key={m} message={m} />
            ))}
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">
              Password Baru <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
                placeholder="Minimal 8 karakter"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showNew ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Password strength */}
            {newPassword.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-1 flex-1 rounded-full transition-colors',
                        i <= passedChecks
                          ? passedChecks === 4
                            ? 'bg-emerald-500'
                            : passedChecks >= 3
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          : 'bg-muted',
                      )}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <CheckItem passed={checks.length} label="Min 8 karakter" />
                  <CheckItem passed={checks.lower} label="Huruf kecil" />
                  <CheckItem passed={checks.upper} label="Huruf besar" />
                  <CheckItem passed={checks.number} label="Angka" />
                </div>
              </div>
            )}

            {fieldErrors.newPassword?.map((m) => (
              <FieldError key={m} message={m} />
            ))}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              Konfirmasi Password <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
                placeholder="Ulangi password baru"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {fieldErrors.confirmPassword?.map((m) => (
              <FieldError key={m} message={m} />
            ))}
          </div>

          {/* Info */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Setelah ganti password, Anda akan <strong>logout otomatis</strong>.
                Login ulang pake password baru.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword ||
                passedChecks < 4
              }
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ganti Password
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Sub-components
// ============================================================

function FieldError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-1.5 text-xs text-destructive">
      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function CheckItem({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-1',
        passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
      )}
    >
      <div
        className={cn(
          'h-3 w-3 rounded-full border flex items-center justify-center',
          passed
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-muted-foreground/30',
        )}
      >
        {passed && (
          <svg
            viewBox="0 0 12 12"
            className="h-2 w-2 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M2 6l3 3 5-5" />
          </svg>
        )}
      </div>
      <span>{label}</span>
    </div>
  )
}