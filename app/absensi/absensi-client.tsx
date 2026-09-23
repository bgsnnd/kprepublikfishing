/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Clock,
  Loader2,
  MapPin,
  RefreshCw,
  Timer,
  CalendarDays,
  History,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { CameraCapture } from '@/components/ui/camera-capture'
import { Greeting } from './greeting'
import { ShiftCard } from './shift-card'

// ============================================================
// Types
// ============================================================

type ShiftAttendance = {
  id: string
  checkIn: string
  checkOut: string | null
  status: string
  lateMinutes: number
  earlyLeaveMinutes: number
  workDurationMinutes: number | null
} | null

export type ShiftWithAttendance = {
  shiftId: string
  startTime: string
  endTime: string
  position: string | null
  status: string
  standardCheckIn: string
  standardCheckOut: string
  attendance: ShiftAttendance
}

type TodayStats = {
  totalShifts: number
  completedShifts: number
  totalLateMinutes: number
  totalDurationMinutes: number
}

type Config = {
  enabled: boolean
  requireGps: boolean
  requireSelfie: boolean
  allowOutsideRadius: boolean
  defaultLocation: {
    name: string
    latitude: number
    longitude: number
    radiusMeters: number
  } | null
}

type GpsState = {
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  distance: number | null
  withinRadius: boolean | null
  loading: boolean
  error: string | null
}

type PendingAction = {
  type: 'in' | 'out'
  shiftId: string
  attendanceId?: string
}

// ============================================================
// Helpers
// ============================================================

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return '—'
  if (minutes < 60) return `${minutes} menit`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} jam ${m} menit` : `${h} jam`
}

function getTimeNow(): string {
  return new Date().toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

// ============================================================
// Main Component
// ============================================================

export function AbsensiClient({ userName }: { userName: string }) {
  const router = useRouter()

  const [shifts, setShifts] = useState<ShiftWithAttendance[]>([])
  const [stats, setStats] = useState<TodayStats>({
    totalShifts: 0,
    completedShifts: 0,
    totalLateMinutes: 0,
    totalDurationMinutes: 0,
  })
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<'in' | 'out' | null>(null)
  const [now, setNow] = useState(getTimeNow())

  const [cameraOpen, setCameraOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  const [gps, setGps] = useState<GpsState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    distance: null,
    withinRadius: null,
    loading: false,
    error: null,
  })

  // ============================================================
  // Clock
  // ============================================================
  useEffect(() => {
    const interval = setInterval(() => setNow(getTimeNow()), 1000)
    return () => clearInterval(interval)
  }, [])

  // ============================================================
  // Fetch today
  // ============================================================
  const fetchToday = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance/today')
      const json = await res.json()
      if (json.success) {
        setShifts(json.data.shifts ?? [])
        setStats(
          json.data.stats ?? {
            totalShifts: 0,
            completedShifts: 0,
            totalLateMinutes: 0,
            totalDurationMinutes: 0,
          },
        )
        setConfig(json.data.config)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchToday()
  }, [fetchToday])

  // ============================================================
  // GPS
  // ============================================================
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGps((g) => ({ ...g, error: 'Browser tidak mendukung GPS' }))
      return
    }

    setGps((g) => ({ ...g, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        let distance: number | null = null
        let withinRadius: boolean | null = null

        if (config?.defaultLocation) {
          distance = calculateDistance(
            latitude,
            longitude,
            config.defaultLocation.latitude,
            config.defaultLocation.longitude,
          )
          withinRadius = distance <= config.defaultLocation.radiusMeters
        }

        setGps({
          latitude,
          longitude,
          accuracy,
          distance,
          withinRadius,
          loading: false,
          error: null,
        })
      },
      (err) => {
        setGps({
          latitude: null,
          longitude: null,
          accuracy: null,
          distance: null,
          withinRadius: null,
          loading: false,
          error:
            err.code === 1
              ? 'Izin lokasi ditolak'
              : 'Lokasi tidak terdeteksi',
        })
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }, [config])

  useEffect(() => {
    if (
      !loading &&
      config?.enabled &&
      config.requireGps &&
      gps.latitude === null &&
      !gps.loading
    ) {
      detectLocation()
    }
  }, [loading, config, gps.latitude, gps.loading, detectLocation])

  // ============================================================
  // Submit handlers
  // ============================================================
  async function submitCheckIn(shiftId: string, selfie: string | null) {
    setSubmitting('in')
    try {
      const res = await fetch('/api/attendance/self-check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId,
          latitude: gps.latitude,
          longitude: gps.longitude,
          accuracy: gps.accuracy,
          selfieUrl: selfie || undefined,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Absen masuk gagal')
        return
      }

      toast.success(
        json.data.lateMinutes > 0
          ? `Absen masuk tercatat — terlambat ${json.data.lateMinutes} menit`
          : 'Absen masuk tercatat',
      )

      setPendingAction(null)
      await fetchToday()
      router.refresh()
    } catch {
      toast.error('Koneksi ke server gagal')
    } finally {
      setSubmitting(null)
    }
  }

  async function submitCheckOut(attendanceId: string, selfie: string | null) {
    setSubmitting('out')
    try {
      const res = await fetch('/api/attendance/self-check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId,
          latitude: gps.latitude,
          longitude: gps.longitude,
          accuracy: gps.accuracy,
          selfieUrl: selfie || undefined,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Absen keluar gagal')
        return
      }

      toast.success('Absen keluar tercatat')

      setPendingAction(null)
      await fetchToday()
      router.refresh()
    } catch {
      toast.error('Koneksi ke server gagal')
    } finally {
      setSubmitting(null)
    }
  }

  // ============================================================
  // Button handlers
  // ============================================================
  function handleCheckIn(shiftId: string) {
    if (config?.requireGps && gps.latitude === null) {
      toast.error('Lokasi belum terdeteksi')
      return
    }

    if (
      !config?.allowOutsideRadius &&
      gps.withinRadius === false &&
      config?.defaultLocation
    ) {
      toast.error(`Anda di luar radius ${config.defaultLocation.name}`)
      return
    }

    const action: PendingAction = { type: 'in', shiftId }

    if (config?.requireSelfie) {
      setPendingAction(action)
      setCameraOpen(true)
      return
    }

    submitCheckIn(shiftId, null)
  }

  function handleCheckOut(shiftId: string, attendanceId: string) {
    if (config?.requireGps && gps.latitude === null) {
      toast.error('Lokasi belum terdeteksi')
      return
    }

    if (
      !config?.allowOutsideRadius &&
      gps.withinRadius === false &&
      config?.defaultLocation
    ) {
      toast.error(`Anda di luar radius ${config.defaultLocation.name}`)
      return
    }

    const action: PendingAction = { type: 'out', shiftId, attendanceId }

    if (config?.requireSelfie) {
      setPendingAction(action)
      setCameraOpen(true)
      return
    }

    submitCheckOut(attendanceId, null)
  }

  function handleCameraCapture(url: string) {
    const action = pendingAction
    if (!action) return
    setCameraOpen(false)

    if (action.type === 'in') {
      submitCheckIn(action.shiftId, url)
    } else if (action.attendanceId) {
      submitCheckOut(action.attendanceId, url)
    }
  }

  // ============================================================
  // Loading state
  // ============================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="h-6 w-6 animate-spin text-slate-400"
            strokeWidth={2.5}
          />
          <p className="text-sm text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    )
  }

  if (!config?.enabled) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
          <Clock className="h-7 w-7 text-slate-400" strokeWidth={2.5} />
        </div>
        <h2 className="text-base font-semibold">Modul absensi dinonaktifkan</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Hubungi administrator untuk informasi lebih lanjut
        </p>
      </div>
    )
  }

  const gpsReady = !config.requireGps || gps.latitude !== null
  const radiusOk = config.allowOutsideRadius || gps.withinRadius !== false

  return (
    <div className="space-y-5 pb-8">
      <CameraCapture
        open={cameraOpen}
        onClose={() => {
          setCameraOpen(false)
          setPendingAction(null)
        }}
        onCapture={handleCameraCapture}
        folder="attendance/selfie"
        facingMode="user"
        title={
          pendingAction?.type === 'in'
            ? 'Verifikasi Selfie — Absen Masuk'
            : 'Verifikasi Selfie — Absen Keluar'
        }
      />

      {/* GREETING */}
      <Greeting
        userName={userName}
        now={now}
        totalShifts={stats.totalShifts}
        completedShifts={stats.completedShifts}
        totalLateMinutes={stats.totalLateMinutes}
      />

      {/* GPS VERIFICATION */}
      {config.requireGps && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                  gps.loading
                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10'
                    : gps.error
                      ? 'bg-red-50 text-red-600 dark:bg-red-500/10'
                      : gps.latitude !== null && radiusOk
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'
                        : gps.latitude !== null
                          ? 'bg-red-50 text-red-600 dark:bg-red-500/10'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800',
                )}
              >
                {gps.loading ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    strokeWidth={2.5}
                  />
                ) : (
                  <MapPin className="h-4 w-4" strokeWidth={2.5} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">Lokasi</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {gps.loading
                    ? 'Memverifikasi...'
                    : gps.error
                      ? gps.error
                      : gps.latitude !== null
                        ? config.defaultLocation
                          ? radiusOk
                            ? `Dalam radius ${config.defaultLocation.name} · ${Math.round(gps.distance ?? 0)}m`
                            : `Di luar radius · ${Math.round(gps.distance ?? 0)}m`
                          : `Akurasi ±${Math.round(gps.accuracy ?? 0)}m`
                        : 'Lokasi belum terdeteksi'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={detectLocation}
              disabled={gps.loading}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 inline-flex items-center gap-1 shrink-0"
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', gps.loading && 'animate-spin')}
                strokeWidth={2.5}
              />
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* DAFTAR SHIFT */}
      {shifts.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <CalendarDays
              className="h-7 w-7 text-slate-400"
              strokeWidth={2.5}
            />
          </div>
          <h2 className="text-base font-semibold">Tidak ada shift hari ini</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Belum ada jadwal shift untuk Anda hari ini
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shifts.map((shift) => (
            <ShiftCard
              key={shift.shiftId}
              shift={shift}
              gpsReady={gpsReady}
              radiusOk={radiusOk}
              submitting={submitting}
              onCheckIn={() => handleCheckIn(shift.shiftId)}
              onCheckOut={(attendanceId: string) =>
                handleCheckOut(shift.shiftId, attendanceId)
              }
            />
          ))}
        </div>
      )}

      {/* RINGKASAN */}
      {shifts.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="p-5 border-b flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <Timer
                className="h-5 w-5 text-slate-600 dark:text-slate-400"
                strokeWidth={2.5}
              />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Ringkasan Hari Ini</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Total dari {stats.totalShifts} shift
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0">
            <StatBox label="Total Shift" value={String(stats.totalShifts)} />
            <StatBox
              label="Selesai"
              value={String(stats.completedShifts)}
              tone={
                stats.completedShifts === stats.totalShifts &&
                stats.totalShifts > 0
                  ? 'success'
                  : undefined
              }
            />
            <StatBox
              label="Terlambat"
              value={
                stats.totalLateMinutes > 0 ? `${stats.totalLateMinutes}m` : '—'
              }
              tone={stats.totalLateMinutes > 0 ? 'warning' : undefined}
            />
            <StatBox
              label="Total Durasi"
              value={formatDuration(stats.totalDurationMinutes)}
            />
          </div>
        </div>
      )}

      {/* RIWAYAT */}
      <Link
        href="/absensi/riwayat"
        className="group flex items-center justify-between rounded-xl border bg-card p-5 hover:border-slate-400 hover:shadow-sm transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <History className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-semibold">Riwayat Absensi</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Lihat seluruh riwayat kehadiran Anda
            </p>
          </div>
        </div>
        <ChevronRight
          className="h-5 w-5 text-muted-foreground group-hover:translate-x-0.5 transition-transform"
          strokeWidth={2.5}
        />
      </Link>
    </div>
  )
}

// ============================================================
// StatBox
// ============================================================

function StatBox({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'success' | 'warning'
}) {
  return (
    <div className="p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-lg font-semibold tabular-nums',
          tone === 'success' && 'text-emerald-600 dark:text-emerald-400',
          tone === 'warning' && 'text-amber-600 dark:text-amber-400',
        )}
      >
        {value}
      </p>
    </div>
  )
}