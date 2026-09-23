/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useState, useEffect } from 'react'
import {
  Loader2,
  AlertCircle,
  MapPin,
  Clock,
  XCircle,
  Camera,
  User,
  Calendar,
  FileText,
  History,
  ExternalLink,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ATTENDANCE_STATUS_LABELS } from '@/lib/validation/attendance'
import { formatDuration } from '@/lib/attendance/helpers'
import { ATTENDANCE_METHOD_LABELS } from '@/lib/validation/attendance'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  attendanceId: string
}

type AttendanceDetail = {
  id: string
  workDate: string
  checkIn: string
  checkOut: string | null
  method: string
  status: string
  lateMinutes: number
  earlyLeaveMinutes: number
  workDurationMinutes: number | null
  checkInLat: number | null
  checkInLng: number | null
  checkInDistance: number | null
  checkInAccuracy: number | null
  checkInSelfieUrl: string | null
  checkOutLat: number | null
  checkOutLng: number | null
  checkOutDistance: number | null
  checkOutAccuracy: number | null
  checkOutSelfieUrl: string | null
  isCorrected: boolean
  correctedAt: string | null
  correctionNote: string | null
  notes: string | null
  createdAt: string
  checkInLocation: { name: string; code: string } | null
  user: {
    username: string
    name: string
    employeeType: { name: string } | null
  }
}

const STATUS_COLORS: Record<string, string> = {
  HADIR:
    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  TERLAMBAT:
    'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  IZIN: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  SAKIT:
    'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
  CUTI: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30',
  ALPHA: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
}

export function AttendanceDetailDialog({
  open,
  onOpenChange,
  attendanceId,
}: Props) {
  const [data, setData] = useState<AttendanceDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open || !attendanceId) return

    const controller = new AbortController()
    let cancelled = false

    Promise.resolve().then(() => {
      if (cancelled) return
      setLoading(true)
      setData(null)
    })

    fetch(`/api/attendance/${attendanceId}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        if (json.success) setData(json.data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof Error && err.name === 'AbortError') return
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [open, attendanceId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-lg">Detail Absensi</DialogTitle>
              <DialogDescription className="mt-1">
                Informasi lengkap kehadiran karyawan.
              </DialogDescription>
            </div>
            {data && (
              <Badge
                variant="outline"
                className={cn(
                  'text-xs shrink-0',
                  STATUS_COLORS[data.status] ?? '',
                )}
              >
                {ATTENDANCE_STATUS_LABELS[data.status] ?? data.status}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                Gagal memuat data
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Info Utama */}
              <div className="rounded-lg border divide-y overflow-hidden bg-card">
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-x">
                  <InfoCell
                    icon={User}
                    label="Karyawan"
                    value={data.user.name}
                    sub={`@${data.user.username}`}
                  />
                  <InfoCell
                    icon={Calendar}
                    label="Tanggal Kerja"
                    value={new Date(data.workDate).toLocaleDateString(
                      'id-ID',
                      {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      },
                    )}
                  />
                  <InfoCell
                    icon={Clock}
                    label="Durasi Kerja"
                    value={formatDuration(data.workDurationMinutes)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-x">
                  <InfoCell
                    label="Jam Masuk"
                    value={new Date(data.checkIn).toLocaleTimeString(
                      'id-ID',
                      {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      },
                    )}
                    sub={
                      data.lateMinutes > 0
                        ? `Terlambat ${data.lateMinutes} menit`
                        : 'Tepat waktu'
                    }
                    subClass={
                      data.lateMinutes > 0
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }
                  />
                  <InfoCell
                    label="Jam Keluar"
                    value={
                      data.checkOut
                        ? new Date(data.checkOut).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })
                        : '—'
                    }
                    sub={
                      data.earlyLeaveMinutes > 0
                        ? `Pulang ${data.earlyLeaveMinutes} menit lebih awal`
                        : undefined
                    }
                    subClass="text-amber-600"
                  />
                  <InfoCell
                    label="Metode"
                    value={ATTENDANCE_METHOD_LABELS[data.method] ?? data.method}
                    mono
                    />
                </div>
              </div>

              {/* GPS Check-In */}
              {data.checkInLat && data.checkInLng && (
                <div className="space-y-2">
                  <SectionTitle icon={MapPin} title="Lokasi Check-In" />
                  <div className="rounded-lg border bg-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <InfoRow
                      label="Koordinat"
                      value={`${data.checkInLat.toFixed(6)}, ${data.checkInLng.toFixed(6)}`}
                      mono
                    />
                    <InfoRow
                      label="Jarak dari Lokasi"
                      value={
                        data.checkInDistance !== null
                          ? `${Math.round(data.checkInDistance)} m`
                          : '—'
                      }
                      mono
                    />
                    <InfoRow
                      label="Akurasi GPS"
                      value={
                        data.checkInAccuracy !== null
                          ? `±${Math.round(data.checkInAccuracy)} m`
                          : '—'
                      }
                      mono
                    />
                  </div>
                  {data.checkInLocation && (
                    <div className="text-xs text-muted-foreground">
                      Lokasi:{' '}
                      <span className="font-medium text-foreground">
                        {data.checkInLocation.name}
                      </span>{' '}
                      <span className="font-mono">
                        ({data.checkInLocation.code})
                      </span>
                    </div>
                  )}
                  <a
                    href={`https://www.google.com/maps?q=${data.checkInLat},${data.checkInLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Lihat di Google Maps
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Foto Selfie Check-In */}
              {data.checkInSelfieUrl && (
                <div className="space-y-2">
                  <SectionTitle icon={Camera} title="Foto Selfie Check-In" />
                  <SelfieDisplay url={data.checkInSelfieUrl} />
                </div>
              )}

              {/* GPS Check-Out */}
              {data.checkOutLat && data.checkOutLng && (
                <div className="space-y-2">
                  <SectionTitle icon={MapPin} title="Lokasi Check-Out" />
                  <div className="rounded-lg border bg-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <InfoRow
                      label="Koordinat"
                      value={`${data.checkOutLat.toFixed(6)}, ${data.checkOutLng.toFixed(6)}`}
                      mono
                    />
                    <InfoRow
                      label="Jarak dari Lokasi"
                      value={
                        data.checkOutDistance !== null
                          ? `${Math.round(data.checkOutDistance)} m`
                          : '—'
                      }
                      mono
                    />
                    <InfoRow
                      label="Akurasi GPS"
                      value={
                        data.checkOutAccuracy !== null
                          ? `±${Math.round(data.checkOutAccuracy)} m`
                          : '—'
                      }
                      mono
                    />
                  </div>
                </div>
              )}

              {/* Foto Selfie Check-Out */}
              {data.checkOutSelfieUrl && (
                <div className="space-y-2">
                  <SectionTitle icon={Camera} title="Foto Selfie Check-Out" />
                  <SelfieDisplay url={data.checkOutSelfieUrl} />
                </div>
              )}

              {/* Koreksi */}
              {data.isCorrected && (
                <div className="space-y-2">
                  <SectionTitle icon={History} title="Riwayat Koreksi" />
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge
                        variant="outline"
                        className="text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-400"
                      >
                        Dikoreksi
                      </Badge>
                      {data.correctedAt && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(data.correctedAt).toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>
                    {data.correctionNote && (
                      <p className="text-sm text-muted-foreground">
                        {data.correctionNote}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Catatan */}
              {data.notes && (
                <div className="space-y-2">
                  <SectionTitle icon={FileText} title="Catatan" />
                  <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                    {data.notes}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">ID:</span>
                    <span className="font-mono text-[10px]">{data.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Dibuat:</span>
                    <span>
                      {new Date(data.createdAt).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Sub-components
// ============================================================

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  )
}

function InfoCell({
  icon: Icon,
  label,
  value,
  sub,
  subClass,
  mono = false,
}: {
  icon?: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
  subClass?: string
  mono?: boolean
}) {
  return (
    <div className="px-4 py-3 min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div
        className={cn('text-sm truncate', mono && 'font-mono text-xs')}
        title={value}
      >
        {value}
      </div>
      {sub && (
        <div
          className={cn(
            'text-xs mt-0.5',
            subClass ?? 'text-muted-foreground',
          )}
        >
          {sub}
        </div>
      )}
    </div>
  )
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="space-y-1 min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
        {label}
      </div>
      <div className={cn('text-sm break-all', mono && 'font-mono text-xs')}>
        {value}
      </div>
    </div>
  )
}

/**
 * Tampilkan selfie dari bucket private.
 * Fetch presigned URL dari API, tampilkan gambar.
 */
function SelfieDisplay({ url }: { url: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!url) return

    // Kalau URL public, langsung pakai
    if (url.startsWith('http')) {
      setImageUrl(url)
      setLoading(false)
      return
    }

    // Private key → minta presigned URL
    setLoading(true)
    fetch(
      `/api/storage/signed-url?key=${encodeURIComponent(url)}&folder=attendance/selfie`,
    )
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setImageUrl(json.data.url)
        else setError(json.error?.message ?? 'Gagal memuat foto')
      })
      .catch(() => setError('Gagal memuat foto'))
      .finally(() => setLoading(false))
  }, [url])

  if (loading) {
    return (
      <div className="rounded-lg border bg-muted/30 h-64 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !imageUrl) {
    return (
      <div className="rounded-lg border bg-muted/30 h-32 flex flex-col items-center justify-center text-center">
        <XCircle className="h-8 w-8 text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground">
          {error ?? 'Foto tidak tersedia'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden bg-muted/30">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Selfie absensi"
        className="w-full max-h-96 object-contain"
      />
    </div>
  )
}