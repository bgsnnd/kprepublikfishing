'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  AlertCircle,
  Users,
  CalendarDays,
  Wand2,
  CheckSquare,
  Square,
  Info,
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
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { DAY_LABELS_SHORT, DAY_LABELS } from '@/lib/validation/shift'

// ============================================================
// Types
// ============================================================

type UserOption = {
  username: string
  name: string
  employeeType: { name: string } | null
}

type BulkShiftDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: UserOption[]
}

const DAYS = [1, 2, 3, 4, 5, 6, 0] // Senin-Minggu

type PreviewDate = {
  date: Date
  dateStr: string
  dayOfWeek: number
  included: boolean
}

// ============================================================
// Component
// ============================================================

export function BulkShiftDialog({
  open,
  onOpenChange,
  users,
}: BulkShiftDialogProps) {
  const router = useRouter()

  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('17:00')
  const [position, setPosition] = useState('')
  const [notes, setNotes] = useState('')
  const [skipConflicts, setSkipConflicts] = useState(true)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  // ============================================================
  // Preview: daftar tanggal + status included/skipped
  // ============================================================
  const previewDates = useMemo<PreviewDate[]>(() => {
    if (!dateFrom || !dateTo) return []

    const [startY, startM, startD] = dateFrom.split('-').map(Number)
    const [endY, endM, endD] = dateTo.split('-').map(Number)

    const start = new Date(Date.UTC(startY, startM - 1, startD))
    const end = new Date(Date.UTC(endY, endM - 1, endD))

    if (start > end) return []

    const result: PreviewDate[] = []
    const cursor = new Date(start)

    while (cursor <= end) {
      const dayOfWeek = cursor.getUTCDay()
      const included = selectedDays.includes(dayOfWeek)
      result.push({
        date: new Date(cursor),
        dateStr: cursor.toISOString().slice(0, 10),
        dayOfWeek,
        included,
      })
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    return result
  }, [dateFrom, dateTo, selectedDays])

  const includedCount = previewDates.filter((d) => d.included).length
  const skippedCount = previewDates.filter((d) => !d.included).length
  const previewCount = selectedUsers.length * includedCount

  // ============================================================
  // Handlers
  // ============================================================
  function toggleUser(username: string) {
    setSelectedUsers((prev) =>
      prev.includes(username)
        ? prev.filter((u) => u !== username)
        : [...prev, username],
    )
  }

  function selectAllUsers() {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.map((u) => u.username))
    }
  }

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort((a, b) => a - b),
    )
  }

  function selectWeekdays() {
    setSelectedDays([1, 2, 3, 4, 5])
  }

  function selectAllDays() {
    setSelectedDays([0, 1, 2, 3, 4, 5, 6])
  }

  function clearDays() {
    setSelectedDays([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})

    try {
      const res = await fetch('/api/shifts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernames: selectedUsers,
          dateFrom,
          dateTo,
          daysOfWeek: selectedDays,
          startTime,
          endTime,
          position,
          notes,
          skipConflicts,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal bulk create')
        if (json.error?.fields) setFieldErrors(json.error.fields)
        return
      }

      const { created, skipped, message } = json.data

      toast.success(
        message ??
          `${created} shift berhasil dibuat${skipped > 0 ? `, ${skipped} dilewati (konflik)` : ''}`,
      )
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setSelectedUsers([])
      setDateFrom('')
      setDateTo('')
      setSelectedDays([1, 2, 3, 4, 5])
      setStartTime('08:00')
      setEndTime('17:00')
      setPosition('')
      setNotes('')
      setSkipConflicts(true)
      setFieldErrors({})
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-violet-600" />
            Buat Jadwal Massal
          </DialogTitle>
          <DialogDescription>
            Buat shift untuk beberapa karyawan sekaligus dalam beberapa tanggal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="px-6 py-5 space-y-6">
              {/* ==================== KARYAWAN ==================== */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Karyawan <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="tabular-nums">
                      {selectedUsers.length} / {users.length}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={selectAllUsers}
                      className="h-7 text-xs"
                    >
                      {selectedUsers.length === users.length ? (
                        <>
                          <Square className="h-3 w-3 mr-1" />
                          Hapus Semua
                        </>
                      ) : (
                        <>
                          <CheckSquare className="h-3 w-3 mr-1" />
                          Pilih Semua
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border max-h-[200px] overflow-y-auto divide-y">
                  {users.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Tidak ada user aktif
                    </div>
                  ) : (
                    users.map((user) => {
                      const checked = selectedUsers.includes(user.username)
                      return (
                        <label
                          key={user.username}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors',
                            checked ? 'bg-violet-500/5' : 'hover:bg-muted/30',
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleUser(user.username)}
                            disabled={loading}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">
                              {user.name}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              @{user.username}
                              {user.employeeType && (
                                <> · {user.employeeType.name}</>
                              )}
                            </div>
                          </div>
                        </label>
                      )
                    })
                  )}
                </div>

                {fieldErrors.usernames?.map((m) => (
                  <FieldError key={m} message={m} />
                ))}
              </div>

              {/* ==================== TANGGAL ==================== */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Rentang Tanggal <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Dari</span>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Sampai</span>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
                {fieldErrors.dateFrom?.map((m) => (
                  <FieldError key={m} message={m} />
                ))}
                {fieldErrors.dateTo?.map((m) => (
                  <FieldError key={m} message={m} />
                ))}
              </div>

              {/* ==================== HARI ==================== */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>
                    Hari Kerja <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={selectWeekdays}
                      disabled={loading}
                      className="h-7 text-xs"
                    >
                      Sen–Jum
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={selectAllDays}
                      disabled={loading}
                      className="h-7 text-xs"
                    >
                      Semua
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearDays}
                      disabled={loading}
                      className="h-7 text-xs"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => {
                    const active = selectedDays.includes(day)
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        disabled={loading}
                        className={cn(
                          'px-3 py-2 rounded-lg border text-sm font-medium transition-all min-w-[60px]',
                          active
                            ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                            : 'bg-background hover:bg-muted border-border text-muted-foreground',
                        )}
                      >
                        {DAY_LABELS_SHORT[day]}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <Info className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>
                    Uncheck hari libur rutin (misal Kamis). Tanggal yang
                    di-skip otomatis gak dapet shift.
                  </span>
                </p>
                {fieldErrors.daysOfWeek?.map((m) => (
                  <FieldError key={m} message={m} />
                ))}
              </div>

              {/* ==================== JAM ==================== */}
              <div className="space-y-3">
                <Label>
                  Jam Kerja <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Mulai</span>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">
                      Selesai
                    </span>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
                {fieldErrors.endTime?.map((m) => (
                  <FieldError key={m} message={m} />
                ))}
              </div>

              {/* ==================== POSISI & CATATAN ==================== */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-position">Posisi</Label>
                  <Input
                    id="bulk-position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    disabled={loading}
                    placeholder="opsional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bulk-notes">Catatan</Label>
                  <Input
                    id="bulk-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={loading}
                    placeholder="opsional"
                  />
                </div>
              </div>

              {/* ==================== SKIP CONFLICTS ==================== */}
              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors">
                <Checkbox
                  checked={skipConflicts}
                  onCheckedChange={(c) => setSkipConflicts(c === true)}
                  disabled={loading}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium">
                    Lewati shift yang sudah ada
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Kalau karyawan sudah punya shift di tanggal yang sama,
                    shift baru akan dilewati — gak akan dobel.
                  </div>
                </div>
              </label>

              {/* ==================== PREVIEW ==================== */}
              <div className="rounded-lg border-2 border-violet-500/30 bg-violet-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-violet-700 dark:text-violet-400 font-medium">
                      Preview
                    </div>
                    <div className="text-2xl font-bold tabular-nums mt-1 text-violet-900 dark:text-violet-300">
                      {previewCount} shift
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {selectedUsers.length} karyawan × {includedCount} hari
                      {skippedCount > 0 && (
                        <>
                          {' '}
                          ·{' '}
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            {skippedCount} tanggal di-skip
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <Wand2 className="h-8 w-8 text-violet-500/40" />
                </div>

                {/* Visual daftar tanggal */}
                {previewDates.length > 0 && (
                  <div className="border-t border-violet-500/20 pt-3">
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      Tanggal yang akan dibuat:
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto">
                      {previewDates.map((d) => (
                        <div
                          key={d.dateStr}
                          className={cn(
                            'px-2 py-1 rounded text-xs font-medium border tabular-nums',
                            d.included
                              ? 'bg-violet-600 text-white border-violet-600'
                              : 'bg-muted/50 text-muted-foreground border-border line-through',
                          )}
                          title={
                            d.included
                              ? 'Dapat shift'
                              : `${DAY_LABELS[d.dayOfWeek]} — di-skip`
                          }
                        >
                          {d.date.getUTCDate()}{' '}
                          {d.date.toLocaleDateString('id-ID', {
                            timeZone: 'UTC',
                            month: 'short',
                          })}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-violet-600" />
                        Dapat shift
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-muted-foreground/40" />
                        Di-skip
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ==================== FOOTER ==================== */}
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
              <Button
                type="submit"
                disabled={
                  loading ||
                  selectedUsers.length === 0 ||
                  !dateFrom ||
                  !dateTo ||
                  selectedDays.length === 0 ||
                  previewCount === 0
                }
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Buat {previewCount} Shift
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Field Error
// ============================================================

function FieldError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-1.5 text-xs text-destructive">
      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}