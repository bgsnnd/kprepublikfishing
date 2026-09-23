import { z } from 'zod'

// ============================================================
// Constants
// ============================================================

export const SHIFT_STATUSES = [
  'SCHEDULED',
  'CONFIRMED',
  'SWAPPED',
  'CANCELLED',
] as const

export type ShiftStatus = (typeof SHIFT_STATUSES)[number]

export const SHIFT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Terjadwal',
  CONFIRMED: 'Dikonfirmasi',
  SWAPPED: 'Ditukar',
  CANCELLED: 'Dibatalkan',
}

export const SHIFT_STATUS_COLORS: Record<string, string> = {
  SCHEDULED:
    'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  CONFIRMED:
    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  SWAPPED:
    'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  CANCELLED:
    'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30',
}

// Label hari (0=Minggu, 1=Senin, ..., 6=Sabtu)
export const DAY_LABELS: Record<number, string> = {
  0: 'Minggu',
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
}

export const DAY_LABELS_SHORT: Record<number, string> = {
  0: 'Min',
  1: 'Sen',
  2: 'Sel',
  3: 'Rab',
  4: 'Kam',
  5: 'Jum',
  6: 'Sab',
}

// ============================================================
// Create
// ============================================================

export const createShiftSchema = z
  .object({
    username: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'User wajib dipilih'
            : 'User harus berupa teks',
      })
      .trim()
      .min(1, 'User wajib dipilih'),
    shiftDate: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Tanggal wajib diisi'
            : 'Tanggal harus berupa teks',
      })
      .trim()
      .min(1, 'Tanggal wajib diisi'),
    startTime: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Jam mulai wajib diisi'
            : 'Jam mulai harus berupa teks',
      })
      .trim()
      .min(1, 'Jam mulai wajib diisi'),
    endTime: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Jam selesai wajib diisi'
            : 'Jam selesai harus berupa teks',
      })
      .trim()
      .min(1, 'Jam selesai wajib diisi'),
    position: z
      .string()
      .trim()
      .max(100, 'Posisi maksimal 100 karakter')
      .optional()
      .or(z.literal('')),
    notes: z
      .string()
      .trim()
      .max(500, 'Catatan maksimal 500 karakter')
      .optional()
      .or(z.literal('')),
  })
  .refine((d) => !d.startTime || !d.endTime || d.endTime > d.startTime, {
    message: 'Jam selesai harus lebih besar dari jam mulai',
    path: ['endTime'],
  })

export type CreateShiftInput = z.infer<typeof createShiftSchema>

// ============================================================
// Update
// ============================================================

export const updateShiftSchema = z
  .object({
    startTime: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Jam mulai wajib diisi'
            : 'Jam mulai harus berupa teks',
      })
      .trim()
      .min(1, 'Jam mulai wajib diisi'),
    endTime: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Jam selesai wajib diisi'
            : 'Jam selesai harus berupa teks',
      })
      .trim()
      .min(1, 'Jam selesai wajib diisi'),
    position: z
      .string()
      .trim()
      .max(100, 'Posisi maksimal 100 karakter')
      .optional()
      .or(z.literal('')),
    status: z.enum(SHIFT_STATUSES).optional(),
    notes: z
      .string()
      .trim()
      .max(500, 'Catatan maksimal 500 karakter')
      .optional()
      .or(z.literal('')),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: 'Jam selesai harus lebih besar dari jam mulai',
    path: ['endTime'],
  })

export type UpdateShiftInput = z.infer<typeof updateShiftSchema>

// ============================================================
// List query
// ============================================================

export const listShiftsQuerySchema = z.object({
  q: z.string().trim().optional().default(''),
  date: z.string().trim().optional().default(''),
  dateFrom: z.string().trim().optional().default(''),
  dateTo: z.string().trim().optional().default(''),
  username: z.string().trim().optional().default(''),
  status: z.string().trim().optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(50),
})

export type ListShiftsQuery = z.infer<typeof listShiftsQuerySchema>

// ============================================================
// Bulk create
// ============================================================

export const bulkCreateShiftSchema = z
  .object({
    usernames: z
      .array(z.string().min(1))
      .min(1, 'Pilih minimal 1 karyawan'),
    dateFrom: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Tanggal mulai wajib diisi'
            : 'Tanggal mulai harus berupa teks',
      })
      .trim()
      .min(1, 'Tanggal mulai wajib diisi'),
    dateTo: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Tanggal selesai wajib diisi'
            : 'Tanggal selesai harus berupa teks',
      })
      .trim()
      .min(1, 'Tanggal selesai wajib diisi'),
    daysOfWeek: z
      .array(z.coerce.number().int().min(0).max(6))
      .min(1, 'Pilih minimal 1 hari'),
    startTime: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Jam mulai wajib diisi'
            : 'Jam mulai harus berupa teks',
      })
      .trim()
      .min(1, 'Jam mulai wajib diisi'),
    endTime: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Jam selesai wajib diisi'
            : 'Jam selesai harus berupa teks',
      })
      .trim()
      .min(1, 'Jam selesai wajib diisi'),
    position: z
      .string()
      .trim()
      .max(100, 'Posisi maksimal 100 karakter')
      .optional()
      .or(z.literal('')),
    notes: z
      .string()
      .trim()
      .max(500, 'Catatan maksimal 500 karakter')
      .optional()
      .or(z.literal('')),
    skipConflicts: z.boolean().default(true),
    skipHolidays: z.boolean().default(true),
  })
  .refine((d) => d.dateFrom <= d.dateTo, {
    message: 'Tanggal selesai harus setelah tanggal mulai',
    path: ['dateTo'],
  })
  .refine((d) => d.endTime > d.startTime, {
    message: 'Jam selesai harus lebih besar dari jam mulai',
    path: ['endTime'],
  })

  

export type BulkCreateShiftInput = z.infer<typeof bulkCreateShiftSchema>