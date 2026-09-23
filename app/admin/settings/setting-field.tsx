'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { SettingItem } from '@/lib/settings/queries'

type SettingFieldProps = {
  setting: SettingItem
  value: unknown
  onChange: (value: unknown) => void
}

const DAYS = [
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
  { value: 7, label: 'Minggu' },
]

const METHODS = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'FACE', label: 'Wajah' },
  { value: 'QR', label: 'QR Code' },
  { value: 'NFC', label: 'NFC' },
]

const STATUS_OPTIONS = [
  { value: 'HADIR', label: 'Hadir' },
  { value: 'TERLAMBAT', label: 'Terlambat' },
  { value: 'IZIN', label: 'Izin' },
  { value: 'SAKIT', label: 'Sakit' },
  { value: 'CUTI', label: 'Cuti' },
  { value: 'ALPHA', label: 'Alpha' },
]

const PERIOD_TYPES = [
  {
    value: 'MONTHLY_FULL',
    label: 'Bulanan (1 - 31)',
    description: 'Tanggal 1 sampai akhir bulan.',
  },
  {
    value: 'MONTHLY_CUSTOM',
    label: 'Bulanan Custom',
    description: 'Tanggal X bulan lalu - Y bulan ini.',
  },
  {
    value: 'WEEKLY',
    label: 'Mingguan',
    description: 'Senin - Minggu.',
  },
  {
    value: 'DAILY',
    label: 'Harian',
    description: '1 hari per periode.',
  },
]

export function SettingField({ setting, value, onChange }: SettingFieldProps) {
  // ============================================================
  // Boolean — Switch
  // ============================================================
  if (setting.type === 'boolean') {
    const checked =
      value === true || value === 'true' || String(value) === 'true'

    return (
      <div className="flex items-start justify-between gap-6 py-1">
        <div className="flex-1 min-w-0">
          <Label
            htmlFor={setting.key}
            className="text-sm font-medium cursor-pointer"
          >
            {setting.label}
          </Label>
          {setting.description && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {setting.description}
            </p>
          )}
        </div>
        <Switch
          id={setting.key}
          checked={checked}
          onCheckedChange={(v) => onChange(v)}
          className="shrink-0 mt-0.5"
        />
      </div>
    )
  }

  // ============================================================
  // Time
  // ============================================================
  if (setting.type === 'time') {
    return (
      <div className="space-y-2 py-1">
        <Label className="text-sm font-medium">{setting.label}</Label>
        <Input
          type="time"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-[160px]"
        />
        {setting.description && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {setting.description}
          </p>
        )}
      </div>
    )
  }

  // ============================================================
  // Number
  // ============================================================
  if (setting.type === 'number') {
    const isDecimal =
      setting.key.includes('threshold') || setting.key.includes('rate')
    const suffix = getNumberSuffix(setting.key)

    return (
      <div className="space-y-2 py-1">
        <Label className="text-sm font-medium">{setting.label}</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            step={isDecimal ? '0.1' : '1'}
            min={0}
            value={Number(value ?? 0)}
            onChange={(e) => onChange(Number(e.target.value))}
            className="max-w-[200px]"
          />
          {suffix && (
            <span className="text-sm text-muted-foreground">{suffix}</span>
          )}
        </div>
        {setting.description && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {setting.description}
          </p>
        )}
      </div>
    )
  }

  // ============================================================
  // payroll.period_type — Radio Picker
  // ============================================================
  if (setting.key === 'payroll.period_type') {
    // Normalisasi: buang tanda kutip kalau ada
    const raw = String(value ?? 'MONTHLY_CUSTOM')
    const selected = raw.replace(/^"|"$/g, '')

    return (
      <div className="space-y-3 py-1">
        <div>
          <Label className="text-sm font-medium">{setting.label}</Label>
          {setting.description && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {setting.description}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PERIOD_TYPES.map((p) => {
            const active = selected === p.value
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => onChange(p.value)}
                className={cn(
                  'text-left p-3 rounded-lg border-2 transition-all',
                  active
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{p.label}</p>
                  {active && (
                    <span className="text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {p.description}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ============================================================
  // attendance.work_days
  // ============================================================
  if (setting.key === 'attendance.work_days') {
    const days = Array.isArray(value) ? (value as number[]) : []

    function toggleDay(day: number) {
      if (days.includes(day)) {
        onChange(days.filter((d) => d !== day))
      } else {
        onChange([...days, day].sort((a, b) => a - b))
      }
    }

    return (
      <div className="space-y-3 py-1">
        <div>
          <Label className="text-sm font-medium">{setting.label}</Label>
          {setting.description && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {setting.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((d) => {
            const active = days.includes(d.value)
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={cn(
                  'px-3 py-1.5 rounded-md border text-xs font-medium transition-all',
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background hover:bg-muted border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {d.label}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {days.length} hari dipilih
        </p>
      </div>
    )
  }

  // ============================================================
  // attendance.methods
  // ============================================================
  if (setting.key === 'attendance.methods') {
    const methods = Array.isArray(value) ? (value as string[]) : []

    function toggleMethod(m: string) {
      if (methods.includes(m)) {
        onChange(methods.filter((x) => x !== m))
      } else {
        onChange([...methods, m])
      }
    }

    return (
      <div className="space-y-3 py-1">
        <div>
          <Label className="text-sm font-medium">{setting.label}</Label>
          {setting.description && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {setting.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {METHODS.map((m) => {
            const active = methods.includes(m.value)
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => toggleMethod(m.value)}
                className={cn(
                  'px-3 py-1.5 rounded-md border text-xs font-medium transition-all',
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background hover:bg-muted border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {m.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ============================================================
  // attendance.status_options
  // ============================================================
  if (setting.key === 'attendance.status_options') {
    const statuses = Array.isArray(value) ? (value as string[]) : []

    function toggleStatus(s: string) {
      if (statuses.includes(s)) {
        onChange(statuses.filter((x) => x !== s))
      } else {
        onChange([...statuses, s])
      }
    }

    return (
      <div className="space-y-3 py-1">
        <div>
          <Label className="text-sm font-medium">{setting.label}</Label>
          {setting.description && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {setting.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((s) => {
            const active = statuses.includes(s.value)
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => toggleStatus(s.value)}
                className={cn(
                  'px-3 py-1.5 rounded-md border text-xs font-medium transition-all',
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background hover:bg-muted border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {s.label}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {statuses.length} status dipilih
        </p>
      </div>
    )
  }

  // ============================================================
  // Fallback: string
  // ============================================================
  return (
    <div className="space-y-2 py-1">
      <Label className="text-sm font-medium">{setting.label}</Label>
      <Input
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-md"
      />
      {setting.description && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {setting.description}
        </p>
      )}
    </div>
  )
}

// ============================================================
// Helper: suffix number
// ============================================================

function getNumberSuffix(key: string): string | null {
  if (key.includes('threshold')) return '(0.0 - 1.0)'
  if (key.includes('percent')) return '%'
  if (key.includes('minutes')) return 'menit'
  if (key.includes('hours')) return 'jam'
  if (key.includes('meters')) return 'meter'
  if (key.includes('days')) return 'hari'
  if (key.includes('_per_minute')) return 'Rp/menit'
  if (key.includes('_per_day')) return 'Rp/hari'
  if (key.includes('_per_hour')) return 'Rp/jam'
  if (key.includes('_per_missing')) return 'Rp'
  if (key.includes('default_fee')) return 'Rp'
  if (key.includes('penalty')) return 'Rp'
  if (key.includes('rate')) return 'x'
  return null
}