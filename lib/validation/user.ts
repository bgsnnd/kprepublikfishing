import { z } from 'zod'

// ============================================================
// Reusable field schemas
// ============================================================

const emailField = z
  .string({
    error: (issue) =>
      issue.input === undefined
        ? 'Email wajib diisi'
        : 'Email harus berupa teks',
  })
  .trim()
  .toLowerCase()
  .min(1, 'Email wajib diisi')
  .max(255, 'Email maksimal 255 karakter')
  .email('Format email tidak valid')

const usernameField = z
  .string({
    error: (issue) =>
      issue.input === undefined
        ? 'Username wajib diisi'
        : 'Username harus berupa teks',
  })
  .trim()
  .toLowerCase()
  .min(3, 'Username minimal 3 karakter')
  .max(30, 'Username maksimal 30 karakter')
  .regex(
    /^[a-z0-9_]+$/,
    'Username hanya boleh huruf kecil, angka, dan underscore',
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

const passwordField = z
  .string({
    error: (issue) =>
      issue.input === undefined
        ? 'Password wajib diisi'
        : 'Password harus berupa teks',
  })
  .min(8, 'Password minimal 8 karakter')
  .max(72, 'Password maksimal 72 karakter')

// ============================================================
// Create User
// ============================================================

export const createUserSchema = z.object({
  email: emailField,
  username: usernameField,
  name: nameField,
  password: passwordField,
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]*$/, 'Nomor telepon tidak valid')
    .max(20, 'Nomor telepon maksimal 20 karakter')
    .optional()
    .or(z.literal('')),
  employeeTypeCode: z
    .string()
    .trim()
    .optional()
    .or(z.literal('')),
  roleCodes: z
    .array(z.string().min(1))
    .min(1, 'Pilih minimal 1 role'),
})

export type CreateUserInput = z.infer<typeof createUserSchema>

// ============================================================
// Update User
// ============================================================

export const updateUserSchema = z.object({
  name: nameField,
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]*$/, 'Nomor telepon tidak valid')
    .max(20, 'Nomor telepon maksimal 20 karakter')
    .optional()
    .or(z.literal('')),
  employeeTypeCode: z
    .string()
    .trim()
    .optional()
    .or(z.literal('')),
  roleCodes: z
    .array(z.string().min(1))
    .min(1, 'Pilih minimal 1 role'),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>

// ============================================================
// Reset Password
// ============================================================

export const resetUserPasswordSchema = z.object({
  newPassword: passwordField,
})

export type ResetUserPasswordInput = z.infer<typeof resetUserPasswordSchema>

// ============================================================
// Query filter untuk list users
// ============================================================

export const listUsersQuerySchema = z.object({
  q: z.string().trim().optional().default(''),
  role: z.string().trim().optional().default(''),
  status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>