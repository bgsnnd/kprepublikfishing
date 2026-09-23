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

export const PAYROLL_STATUSES = [
  'DRAFT',
  'APPROVED',
  'PAID',
  'CANCELLED',
] as const
export type PayrollStatus = (typeof PAYROLL_STATUSES)[number]

export const PAYROLL_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  APPROVED: 'Disetujui',
  PAID: 'Dibayar',
  CANCELLED: 'Dibatalkan',
}

export const PAYROLL_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30',
  APPROVED: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  PAID: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  CANCELLED: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
}

// ============================================================
// Salary Component — Create
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
    .regex(/^[A-Z_]+$/, 'Kode harus HURUF BESAR dan underscore'),

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

  defaultAmount: z.coerce
    .number()
    .int()
    .min(0, 'Nominal minimal 0')
    .optional()
    .nullable(),

  sortOrder: z.coerce.number().int().default(0),

  isTaxable: z.boolean().default(false),
})

export type CreateSalaryComponentInput = z.infer<
  typeof createSalaryComponentSchema
>

// ============================================================
// Salary Component — Update
// ============================================================

export const updateSalaryComponentSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z
    .string()
    .trim()
    .max(255)
    .optional()
    .or(z.literal('')),
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
// Role Salary Config
// ============================================================

export const upsertRoleSalaryConfigSchema = z.object({
  roleId: z.string().min(1, 'Role wajib dipilih'),
  componentId: z.string().min(1, 'Komponen wajib dipilih'),
  amount: z.coerce.number().int().min(0, 'Nominal minimal 0'),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().nullable().optional(),
})

export type UpsertRoleSalaryConfigInput = z.infer<
  typeof upsertRoleSalaryConfigSchema
>

// ============================================================
// User Salary Config
// ============================================================

export const upsertUserSalaryConfigSchema = z.object({
  userId: z.string().min(1, 'User wajib dipilih'),
  componentId: z.string().min(1, 'Komponen wajib dipilih'),
  amount: z.coerce.number().int().min(0, 'Nominal minimal 0'),
  reason: z
    .string()
    .trim()
    .max(255, 'Alasan maksimal 255 karakter')
    .optional()
    .or(z.literal('')),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().nullable().optional(),
})

export type UpsertUserSalaryConfigInput = z.infer<
  typeof upsertUserSalaryConfigSchema
>

// ============================================================
// Generate Payroll
// ============================================================

export const generatePayrollSchema = z.object({
  periodMonth: z.coerce
    .number({
      error: (issue) =>
        issue.input === undefined
          ? 'Bulan wajib diisi'
          : 'Bulan harus berupa angka',
    })
    .int()
    .min(1, 'Bulan minimal 1')
    .max(12, 'Bulan maksimal 12'),

  periodYear: z.coerce
    .number({
      error: (issue) =>
        issue.input === undefined
          ? 'Tahun wajib diisi'
          : 'Tahun harus berupa angka',
    })
    .int()
    .min(2020, 'Tahun minimal 2020')
    .max(2100, 'Tahun maksimal 2100'),

    date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus yyyy-MM-dd')
    .optional()
    .or(z.literal('')),


  userIds: z.array(z.string().min(1)).optional(),
})

export type GeneratePayrollInput = z.infer<typeof generatePayrollSchema>

// ============================================================
// List Payroll Query
// ============================================================

export const listPayrollQuerySchema = z.object({
  q: z.string().trim().optional().default(''),
  periodMonth: z.coerce.number().int().min(1).max(12).optional(),
  periodYear: z.coerce.number().int().min(2020).max(2100).optional(),
  status: z.string().trim().optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export type ListPayrollQuery = z.infer<typeof listPayrollQuerySchema>

// ============================================================
// Approve / Pay
// ============================================================

export const approvePayrollSchema = z.object({
  notes: z.string().trim().max(500).optional().or(z.literal('')),
})

export type ApprovePayrollInput = z.infer<typeof approvePayrollSchema>