'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  AlertCircle,
  Locate,
  Clock,
  CheckCircle2,
  XCircle,
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

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type GpsState = {
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  loading: boolean
  error: string | null
}

export function CheckOutDialog({ open, onOpenChange }: Props) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [gps, setGps] = useState<GpsState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: false,
    error: null,
  })

  useEffect(() => {
    if (open && gps.latitude === null) {
      detectLocation()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function detectLocation() {
    if (!navigator.geolocation) {
      setGps((g) => ({
        ...g,
        error: 'Browser tidak support geolocation',
      }))
      return
    }

    setGps((g) => ({ ...g, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          loading: false,
          error: null,
        })
        toast.success(
          `Lokasi ditemukan (akurasi ~${Math.round(pos.coords.accuracy)}m)`,
        )
      },
      (err) => {
        setGps({
          latitude: null,
          longitude: null,
          accuracy: null,
          loading: false,
          error:
            err.code === 1
              ? 'Akses lokasi ditolak. Izinkan GPS di browser.'
              : 'Gagal ambil lokasi.',
        })
        toast.error('Gagal ambil lokasi')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})

    try {
      const res = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          latitude: gps.latitude,
          longitude: gps.longitude,
          accuracy: gps.accuracy,
          notes,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal absen')
        if (json.error?.fields) setFieldErrors(json.error.fields)
        return
      }

      const duration = json.data.workDurationMinutes
      const hours = Math.floor(duration / 60)
      const minutes = duration % 60
      toast.success(
        `Absen keluar berhasil (durasi ${hours}j ${minutes}m)`,
      )
      resetForm()
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setUsername('')
    setNotes('')
    setFieldErrors({})
    setGps({
      latitude: null,
      longitude: null,
      accuracy: null,
      loading: false,
      error: null,
    })
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm()
    onOpenChange(nextOpen)
  }

  const gpsReady = gps.latitude !== null && gps.longitude !== null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Absen Keluar
          </DialogTitle>
          <DialogDescription>
            Catat jam keluar karyawan. Durasi kerja dihitung otomatis.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">
                Username <span className="text-destructive">*</span>
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                disabled={loading}
                required
                placeholder="superadmin"
                className="font-mono"
                autoFocus
              />
              <FieldError messages={fieldErrors.username} />
            </div>

            {/* GPS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Lokasi GPS</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={detectLocation}
                  disabled={gps.loading}
                >
                  {gps.loading ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <Locate className="mr-2 h-3 w-3" />
                  )}
                  Deteksi Ulang
                </Button>
              </div>

              <div
                className={cn(
                  'rounded-lg border p-3 space-y-1.5',
                  gps.error
                    ? 'border-red-500/30 bg-red-500/5'
                    : gpsReady
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-amber-500/30 bg-amber-500/5',
                )}
              >
                {gps.loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mencari lokasi...
                  </div>
                ) : gps.error ? (
                  <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
                    <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{gps.error}</span>
                  </div>
                ) : gpsReady ? (
                  <>
                    <div className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>Lokasi ditemukan</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pl-6">
                      <span className="font-mono">
                        {gps.latitude?.toFixed(6)}
                      </span>
                      <span className="font-mono">
                        {gps.longitude?.toFixed(6)}
                      </span>
                      <span>
                        ±{Math.round(gps.accuracy ?? 0)}m
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    Belum ada lokasi
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
                placeholder="opsional"
              />
            </div>
          </div>

          <div className="shrink-0 border-t bg-muted/30 px-6 py-4">
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={loading || !gpsReady}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Clock className="mr-2 h-4 w-4" />
                Absen Keluar
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null
  return (
    <div className="flex items-start gap-1.5 text-xs text-destructive">
      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
      <div>
        {messages.map((m) => (
          <div key={m}>{m}</div>
        ))}
      </div>
    </div>
  )
}