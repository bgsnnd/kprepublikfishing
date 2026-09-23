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

const passwordField = z
  .string({
    error: (issue) =>
      issue.input === undefined
        ? 'Password wajib diisi'
        : 'Password harus berupa teks',
  })
  .min(8, 'Password minimal 8 karakter')
  .max(72, 'Password maksimal 72 karakter')
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, {
    message: 'Password terlalu panjang (maks 72 byte)',
  })

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

const cuidField = z
  .string({
    error: (issue) =>
      issue.input === undefined
        ? 'ID wajib diisi'
        : 'ID harus berupa teks',
  })
  .trim()
  .min(1, 'ID tidak boleh kosong')

// ============================================================
// Login — pakai username (bukan email)
// ============================================================

export const loginSchema = z.object({
  username: usernameField,
  password: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? 'Password wajib diisi'
          : 'Password harus berupa teks',
    })
    .min(1, 'Password wajib diisi'),
})

export type LoginInput = z.infer<typeof loginSchema>

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
  employeeTypeId: cuidField.optional(),
  joinDate: z
    .string()
    .datetime({ message: 'Format tanggal tidak valid' })
    .optional()
    .or(z.literal('')),
  roleIds: z
    .array(cuidField, {
      error: (issue) =>
        issue.input === undefined
          ? 'Pilih minimal 1 role'
          : 'Role harus berupa array',
    })
    .min(1, 'Pilih minimal 1 role'),
})

export type CreateUserInput = z.infer<typeof createUserSchema>

// ============================================================
// Update User
// ============================================================

export const updateUserSchema = z.object({
  name: nameField.optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]*$/, 'Nomor telepon tidak valid')
    .max(20, 'Nomor telepon maksimal 20 karakter')
    .optional()
    .or(z.literal('')),
  employeeTypeId: cuidField.optional().nullable(),
  joinDate: z
    .string()
    .datetime()
    .optional()
    .nullable()
    .or(z.literal('')),
  isActive: z.boolean().optional(),
  roleIds: z.array(cuidField).min(1, 'Pilih minimal 1 role').optional(),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>

// ============================================================
// Change Password
// ============================================================

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Password lama wajib diisi'
            : 'Password lama harus berupa teks',
      })
      .min(1, 'Password lama wajib diisi'),
    newPassword: passwordField,
    confirmPassword: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Konfirmasi password wajib diisi'
            : 'Konfirmasi password harus berupa teks',
      })
      .min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'Password baru tidak boleh sama dengan password lama',
    path: ['newPassword'],
  })

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

// ============================================================
// Reset Password
// ============================================================

export const resetPasswordSchema = z.object({
  userId: cuidField,
  newPassword: passwordField,
})

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

// ============================================================
// Helper: format error Zod
// ============================================================

export type FieldErrors = Record<string, string[]>

export function formatZodError(error: z.ZodError): {
  message: string
  fields: FieldErrors
} {
  const fields: FieldErrors = {}

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_'
    if (!fields[key]) fields[key] = []
    fields[key].push(issue.message)
  }

  return {
    message: 'Validasi gagal',
    fields,
  }
}