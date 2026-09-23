import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { getWorkDate } from '@/lib/attendance/helpers'

export const metadata = {
  title: 'Riwayat Absensi',
}

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  HADIR: 'Hadir',
  TERLAMBAT: 'Terlambat',
  IZIN: 'Izin',
  SAKIT: 'Sakit',
  CUTI: 'Cuti',
  ALPHA: 'Alpha',
}

const STATUS_COLORS: Record<string, string> = {
  HADIR: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  TERLAMBAT: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  IZIN: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  SAKIT: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  CUTI: 'bg-slate-500/15 text-slate-700 dark:text-slate-400',
  ALPHA: 'bg-red-500/15 text-red-700 dark:text-red-400',
}

function formatTime(iso: Date | null): string {
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
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}j ${m}m` : `${h}j`
}

export default async function RiwayatAbsensiPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const today = getWorkDate()

  // Ambil 30 hari terakhir
  const fromDate = new Date(today)
  fromDate.setDate(fromDate.getDate() - 30)

  const items = await prisma.attendance.findMany({
    where: {
      userId: session.userId,
      workDate: { gte: fromDate },
    },
    orderBy: { workDate: 'desc' },
    select: {
      id: true,
      workDate: true,
      checkIn: true,
      checkOut: true,
      status: true,
      lateMinutes: true,
      earlyLeaveMinutes: true,
      workDurationMinutes: true,
    },
  })

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/absensi"
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Riwayat Absensi</h1>
          <p className="text-xs text-muted-foreground">
            30 hari terakhir
          </p>
        </div>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Belum ada riwayat absensi
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((a) => {
            const date = new Date(a.workDate)
            const dayName = date.toLocaleDateString('id-ID', {
              timeZone: 'Asia/Jakarta',
              weekday: 'short',
            })
            const dateStr = date.toLocaleDateString('id-ID', {
              timeZone: 'Asia/Jakarta',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })

            return (
              <div
                key={a.id}
                className="rounded-xl border bg-card p-4 flex items-center gap-4"
              >
                {/* Tanggal */}
                <div className="flex-shrink-0 w-14 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    {dayName}
                  </div>
                  <div className="text-2xl font-bold tabular-nums leading-tight">
                    {date.getDate()}
                  </div>
                </div>

                {/* Jam masuk → keluar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="font-mono tabular-nums">
                      {formatTime(a.checkIn)}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-mono tabular-nums">
                      {a.checkOut ? formatTime(a.checkOut) : '—'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {dateStr} · {formatDuration(a.workDurationMinutes)}
                  </div>
                  {a.lateMinutes > 0 && (
                    <div className="text-[10px] text-amber-600 mt-0.5">
                      Terlambat {a.lateMinutes} menit
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="flex-shrink-0">
                  <span
                    className={`inline-flex px-2 py-1 rounded-md text-[10px] font-medium ${
                      STATUS_COLORS[a.status] ?? 'bg-muted'
                    }`}
                  >
                    {STATUS_LABELS[a.status] ?? a.status}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}