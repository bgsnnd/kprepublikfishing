import { z } from 'zod'

// ============================================================
// Upsert Role Salary Config
// ============================================================

export const upsertRoleSalaryConfigSchema = z.object({
  roleId: z.string().min(1, 'Role wajib dipilih'),
  componentId: z.string().min(1, 'Komponen wajib dipilih'),
  amount: z.coerce
    .number({
      error: (issue) =>
        issue.input === undefined
          ? 'Nominal wajib diisi'
          : 'Nominal harus berupa angka',
    })
    .int()
    .min(0, 'Nominal minimal 0'),
})

export type UpsertRoleSalaryConfigInput = z.infer<
  typeof upsertRoleSalaryConfigSchema
>

// ============================================================
// Upsert User Salary Config
// ============================================================

export const upsertUserSalaryConfigSchema = z.object({
  userId: z.string().min(1, 'User wajib dipilih'),
  componentId: z.string().min(1, 'Komponen wajib dipilih'),
  amount: z.coerce
    .number({
      error: (issue) =>
        issue.input === undefined
          ? 'Nominal wajib diisi'
          : 'Nominal harus berupa angka',
    })
    .int()
    .min(0, 'Nominal minimal 0'),
  reason: z.string().trim().max(255).optional().or(z.literal('')),
})

export type UpsertUserSalaryConfigInput = z.infer<
  typeof upsertUserSalaryConfigSchema
>