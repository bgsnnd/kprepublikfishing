'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Loader2,
  User,
  Lock,
  AlertCircle,
  Fish,
  ArrowRight,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const nextUrl = searchParams.get('next') ?? ''

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setLoading(true)
    setError(null)
    setFieldErrors({})

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error?.message ?? 'Username atau password salah')

        if (json.error?.fields) {
          setFieldErrors(json.error.fields)
        }

        return
      }

      // ============================================================
      // Tentukan redirect
      // - `nextUrl` cuma dipake kalau user punya permission admin
      // - selain itu, pake `redirectTo` dari API
      // ============================================================
      const permissions: string[] = json.data.permissions ?? []

      const isAdmin =
        permissions.includes('user.manage') ||
        permissions.includes('role.manage') ||
        permissions.includes('attendance.manage') ||
        permissions.includes('pos.kantin') ||
        permissions.includes('pos.pancing') ||
        permissions.includes('pos.report') ||
        permissions.includes('audit.read') ||
        permissions.includes('system.settings')

      const targetUrl =
        isAdmin && nextUrl ? nextUrl : json.data.redirectTo || '/absensi'

      router.push(targetUrl)
      router.refresh()
    } catch {
      setError('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[390px]">
      {/* Brand */}
      <div className="mb-10">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white">
            <Fish className="h-5 w-5" />
          </div>

          <div className="leading-none">
            <p className="text-[15px] font-semibold tracking-tight text-foreground">
              KP Republik Fishing
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Management System
            </p>
          </div>
        </div>

        <h1 className="text-[30px] font-semibold tracking-tight text-foreground">
          Selamat datang
        </h1>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Masuk menggunakan akun Anda untuk melanjutkan.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

          <span className="leading-5">{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm font-medium">
            Username
          </Label>

          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              id="username"
              type="text"
              autoComplete="username"
              autoFocus
              required
              disabled={loading}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              className="h-11 border-border bg-background pl-10 shadow-none transition-colors focus-visible:border-violet-500 focus-visible:ring-1 focus-visible:ring-violet-500"
            />
          </div>

          {fieldErrors.username?.map((msg) => (
            <p key={msg} className="text-xs text-destructive">
              {msg}
            </p>
          ))}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Password
          </Label>

          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              className="h-11 border-border bg-background pl-10 shadow-none transition-colors focus-visible:border-violet-500 focus-visible:ring-1 focus-visible:ring-violet-500"
            />
          </div>

          {fieldErrors.password?.map((msg) => (
            <p key={msg} className="text-xs text-destructive">
              {msg}
            </p>
          ))}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={loading}
          className="mt-2 h-11 w-full bg-violet-600 text-white shadow-none hover:bg-violet-700"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Memproses...
            </>
          ) : (
            <>
              Masuk
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      {/* Footer */}
      <div className="mt-10 border-t border-border pt-5">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} KP Republik Fishing
        </p>
      </div>
    </div>
  )
}