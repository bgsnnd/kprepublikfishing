import { z } from 'zod'

const codeField = z
  .string({
    error: (issue) =>
      issue.input === undefined
        ? 'Kode wajib diisi'
        : 'Kode harus berupa teks',
  })
  .trim()
  .toUpperCase()
  .min(2, 'Kode minimal 2 karakter')
  .max(50, 'Kode maksimal 50 karakter')
  .regex(
    /^[A-Z0-9_]+$/,
    'Kode hanya boleh huruf kapital, angka, dan underscore',
  )

const nameField = z
  .string({
    error: (issue) =>
      issue.input === undefined
        ? 'Nama wajib diisi'
        : 'Nama harus berupa teks',
  })
  .trim()
  .min(2, 'Nama minimal 2 karakter')
  .max(100, 'Nama maksimal 100 karakter')

const descriptionField = z
  .string()
  .trim()
  .max(255, 'Deskripsi maksimal 255 karakter')
  .optional()
  .or(z.literal(''))

// ============================================================
// Create
// ============================================================

export const createEmployeeTypeSchema = z.object({
  code: codeField,
  name: nameField,
  description: descriptionField,
})

export type CreateEmployeeTypeInput = z.infer<
  typeof createEmployeeTypeSchema
>

// ============================================================
// Update
// ============================================================

export const updateEmployeeTypeSchema = z.object({
  name: nameField,
  description: descriptionField,
  isActive: z.boolean().optional(),
})

export type UpdateEmployeeTypeInput = z.infer<
  typeof updateEmployeeTypeSchema
>

// ============================================================
// List query
// ============================================================

export const listEmployeeTypesQuerySchema = z.object({
  q: z.string().trim().optional().default(''),
  status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export type ListEmployeeTypesQuery = z.infer<
  typeof listEmployeeTypesQuerySchema
>