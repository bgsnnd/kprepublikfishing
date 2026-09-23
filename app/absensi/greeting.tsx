'use client'

import { Clock } from 'lucide-react'

type Props = {
  userName: string
  now: string
  totalShifts: number
  completedShifts: number
  totalLateMinutes: number
}

export function Greeting({
  userName,
  now,
  totalShifts,
  completedShifts,
  totalLateMinutes,
}: Props) {
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Pagi' : hour < 15 ? 'Siang' : hour < 18 ? 'Sore' : 'Malam'

  const today = new Date().toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <p className="text-sm text-muted-foreground">{greeting},</p>
        <h1 className="text-2xl font-bold tracking-tight">{userName}</h1>
        <p className="text-xs text-muted-foreground mt-1">{today}</p>
      </div>

      {/* Clock Card */}
      <div className="rounded-2xl border bg-gradient-to-br from-violet-600 to-violet-800 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-violet-200 uppercase tracking-wide">
              Waktu Sekarang
            </p>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-5xl font-bold tabular-nums tracking-tight">
                {now.slice(0, 5)}
              </span>
              <span className="text-lg font-medium text-violet-200 tabular-nums">
                {now.slice(6)}
              </span>
            </div>
            <p className="text-xs text-violet-200 mt-1">WIB</p>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <Clock className="h-8 w-8 text-white" strokeWidth={2} />
          </div>
        </div>

        {totalShifts > 0 && (
          <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between text-sm">
            <span className="text-violet-200">
              {completedShifts}/{totalShifts} shift selesai
            </span>
            {totalLateMinutes > 0 && (
              <span className="text-amber-200 font-medium">
                Telat {totalLateMinutes}m
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}