import { z } from 'zod'

// ============================================================
// Constants
// ============================================================

export const HOLIDAY_TYPES = ['NATIONAL', 'COLLECTIVE', 'COMPANY'] as const
export type HolidayType = (typeof HOLIDAY_TYPES)[number]

export const HOLIDAY_TYPE_LABELS: Record<string, string> = {
  NATIONAL: 'Libur Nasional',
  COLLECTIVE: 'Cuti Bersama',
  COMPANY: 'Libur Perusahaan',
}

export const HOLIDAY_TYPE_COLORS: Record<string, string> = {
  NATIONAL:
    'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
  COLLECTIVE:
    'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  COMPANY:
    'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
}

// ============================================================
// Create
// ============================================================

export const createHolidaySchema = z.object({
  date: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? 'Tanggal wajib diisi'
          : 'Tanggal harus berupa teks',
    })
    .trim()
    .min(1, 'Tanggal wajib diisi'),
  name: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? 'Nama libur wajib diisi'
          : 'Nama libur harus berupa teks',
    })
    .trim()
    .min(2, 'Nama libur minimal 2 karakter')
    .max(100, 'Nama libur maksimal 100 karakter'),
  type: z.enum(HOLIDAY_TYPES).default('NATIONAL'),
})

export type CreateHolidayInput = z.infer<typeof createHolidaySchema>

// ============================================================
// Update
// ============================================================

export const updateHolidaySchema = z.object({
  name: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? 'Nama libur wajib diisi'
          : 'Nama libur harus berupa teks',
    })
    .trim()
    .min(2, 'Nama libur minimal 2 karakter')
    .max(100, 'Nama libur maksimal 100 karakter'),
  type: z.enum(HOLIDAY_TYPES).optional(),
  isActive: z.boolean().optional(),
})

export type UpdateHolidayInput = z.infer<typeof updateHolidaySchema>

// ============================================================
// List query
// ============================================================

export const listHolidaysQuerySchema = z.object({
  q: z.string().trim().optional().default(''),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  type: z.string().trim().optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(50),
})

export type ListHolidaysQuery = z.infer<typeof listHolidaysQuerySchema>