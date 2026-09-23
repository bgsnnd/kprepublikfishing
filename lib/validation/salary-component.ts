import { z } from 'zod'

// ============================================================
// Constants
// ============================================================

export const SALARY_COMPONENT_TYPES = ['EARNING', 'DEDUCTION'] as const
export type SalaryComponentType = (typeof SALARY_COMPONENT_TYPES)[number]

export const TYPE_LABELS: Record<string, string> = {
  EARNING: 'Pendapatan',
  DEDUCTION: 'Potongan',
}

export const TYPE_COLORS: Record<string, string> = {
  EARNING: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  DEDUCTION: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
}

export const CALC_METHODS = [
  'FIXED',
  'PER_DAY',
  'PER_HOUR',
  'PER_MINUTE',
  'PER_SESSION',
  'PERCENTAGE',
] as const
export type CalcMethod = (typeof CALC_METHODS)[number]

export const CALC_METHOD_LABELS: Record<string, string> = {
  FIXED: 'Tetap',
  PER_DAY: 'Per Hari',
  PER_HOUR: 'Per Jam',
  PER_MINUTE: 'Per Menit',
  PER_SESSION: 'Per Sesi',
  PERCENTAGE: 'Persentase',
}

export const CALC_METHOD_HINTS: Record<string, string> = {
  FIXED: 'Nominal tetap, dihitung 1x per periode',
  PER_DAY: 'Dikalikan jumlah hari hadir',
  PER_HOUR: 'Dikalikan total jam kerja',
  PER_MINUTE: 'Dikalikan total menit (misal: telat)',
  PER_SESSION: 'Dikalikan jumlah sesi (misal: caddy)',
  PERCENTAGE: 'Persen dari gaji pokok',
}

// ============================================================
// Create
// ============================================================

export const createSalaryComponentSchema = z.object({
  code: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? 'Kode wajib diisi'
          : 'Kode harus berupa teks',
    })
    .trim()
    .min(2, 'Kode minimal 2 karakter')
    .max(50, 'Kode maksimal 50 karakter')
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      'Kode harus HURUF BESAR, angka, dan underscore (contoh: BASIC_SALARY)',
    ),

  name: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? 'Nama wajib diisi'
          : 'Nama harus berupa teks',
    })
    .trim()
    .min(2, 'Nama minimal 2 karakter')
    .max(100, 'Nama maksimal 100 karakter'),

  description: z
    .string()
    .trim()
    .max(255, 'Deskripsi maksimal 255 karakter')
    .optional()
    .or(z.literal('')),

  type: z.enum(SALARY_COMPONENT_TYPES, {
    error: (issue) =>
      issue.input === undefined
        ? 'Tipe wajib dipilih'
        : 'Tipe harus EARNING atau DEDUCTION',
  }),

  calcMethod: z.enum(CALC_METHODS, {
    error: (issue) =>
      issue.input === undefined
        ? 'Metode perhitungan wajib dipilih'
        : 'Metode perhitungan tidak valid',
  }),

  defaultAmount: z.coerce.number().int().min(0).optional().nullable(),

  sortOrder: z.coerce.number().int().default(0),

  isTaxable: z.boolean().default(false),
})

export type CreateSalaryComponentInput = z.infer<
  typeof createSalaryComponentSchema
>

// ============================================================
// Update
// ============================================================

export const updateSalaryComponentSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(255).optional().or(z.literal('')),
  calcMethod: z.enum(CALC_METHODS).optional(),
  defaultAmount: z.coerce.number().int().min(0).optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
  isTaxable: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

export type UpdateSalaryComponentInput = z.infer<
  typeof updateSalaryComponentSchema
>

// ============================================================
// List Query
// ============================================================

export const listSalaryComponentsQuerySchema = z.object({
  q: z.string().trim().optional().default(''),
  type: z.string().trim().optional().default(''),
  active: z.string().trim().optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(50),
})

export type ListSalaryComponentsQuery = z.infer<
  typeof listSalaryComponentsQuerySchema
>