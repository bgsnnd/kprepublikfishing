'use client'

import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  LogIn,
  LogOut,
  Timer,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ShiftWithAttendance } from './absensi-client'

// ============================================================
// Types
// ============================================================

type Props = {
  shift: ShiftWithAttendance
  gpsReady: boolean
  radiusOk: boolean
  submitting: 'in' | 'out' | null
  onCheckIn: () => void
  onCheckOut: (attendanceId: string) => void
}

// ============================================================
// Helpers
// ============================================================

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return '—'
  if (minutes < 60) return `${minutes} menit`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} jam ${m} menit` : `${h} jam`
}

// ============================================================
// Component
// ============================================================

export function ShiftCard({
  shift,
  gpsReady,
  radiusOk,
  submitting,
  onCheckIn,
  onCheckOut,
}: Props) {
  const att = shift.attendance
  const hasCheckedIn = !!att?.checkIn
  const hasCheckedOut = !!att?.checkOut
  const isDone = hasCheckedIn && hasCheckedOut
  const isWorking = hasCheckedIn && !hasCheckedOut

  const canCheckIn = !hasCheckedIn && gpsReady && radiusOk && !submitting
  const canCheckOut =
    isWorking && gpsReady && radiusOk && !submitting && !!att?.id

  return (
    <div
      className={cn(
        'rounded-xl border bg-card overflow-hidden transition-all',
        isDone && 'border-emerald-200 dark:border-emerald-500/20',
        isWorking && 'border-blue-200 dark:border-blue-500/20',
      )}
    >
      {/* Header */}
      <div className="p-4 border-b flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              isDone
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                : isWorking
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800',
            )}
          >
            {isDone ? (
              <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
            ) : isWorking ? (
              <Clock className="h-5 w-5" strokeWidth={2.5} />
            ) : (
              <CalendarDays className="h-5 w-5" strokeWidth={2.5} />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold">
                {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
              </p>
              {isDone && (
                <span className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                  Selesai
                </span>
              )}
              {isWorking && (
                <span className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
                  Bekerja
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {shift.position ?? 'Tanpa posisi'}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Absen masuk */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <LogIn
              className={cn(
                'h-4 w-4',
                hasCheckedIn ? 'text-emerald-500' : 'text-slate-400',
              )}
              strokeWidth={2.5}
            />
            <span className="text-muted-foreground">Masuk</span>
          </div>
          <div className="text-right">
            {hasCheckedIn && att ? (
              <>
                <p className="text-sm font-semibold tabular-nums">
                  {formatTime(att.checkIn)}
                </p>
                {att.lateMinutes > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Terlambat {att.lateMinutes} menit
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Belum absen</p>
            )}
          </div>
        </div>

        {/* Absen keluar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <LogOut
              className={cn(
                'h-4 w-4',
                hasCheckedOut ? 'text-slate-500' : 'text-slate-400',
              )}
              strokeWidth={2.5}
            />
            <span className="text-muted-foreground">Keluar</span>
          </div>
          <div className="text-right">
            {hasCheckedOut && att ? (
              <>
                <p className="text-sm font-semibold tabular-nums">
                  {formatTime(att.checkOut)}
                </p>
                {att.earlyLeaveMinutes > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Pulang awal {att.earlyLeaveMinutes} menit
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Belum absen</p>
            )}
          </div>
        </div>

        {/* Durasi */}
        {isDone && att?.workDurationMinutes !== null && (
          <div className="flex items-center justify-between gap-3 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Timer className="h-4 w-4 text-slate-400" strokeWidth={2.5} />
              <span className="text-muted-foreground">Durasi</span>
            </div>
            <p className="text-sm font-semibold tabular-nums">
              {formatDuration(att.workDurationMinutes)}
            </p>
          </div>
        )}

        {/* Action buttons */}
        {!isDone && (
          <div className="pt-2 flex gap-2">
            {!hasCheckedIn && (
              <button
                type="button"
                onClick={onCheckIn}
                disabled={!canCheckIn}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2',
                  canCheckIn
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-muted text-muted-foreground cursor-not-allowed',
                )}
              >
                {submitting === 'in' ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    strokeWidth={2.5}
                  />
                ) : (
                  <LogIn className="h-4 w-4" strokeWidth={2.5} />
                )}
                Absen Masuk
              </button>
            )}

            {isWorking && att?.id && (
              <button
                type="button"
                onClick={() => onCheckOut(att.id)}
                disabled={!canCheckOut}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2',
                  canCheckOut
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-muted text-muted-foreground cursor-not-allowed',
                )}
              >
                {submitting === 'out' ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    strokeWidth={2.5}
                  />
                ) : (
                  <LogOut className="h-4 w-4" strokeWidth={2.5} />
                )}
                Absen Keluar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}