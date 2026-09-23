import { z } from 'zod'

export const createRoleSchema = z.object({
  code: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? 'Kode role wajib diisi'
          : 'Kode role harus berupa teks',
    })
    .trim()
    .toUpperCase()
    .min(2, 'Kode role minimal 2 karakter')
    .max(50, 'Kode role maksimal 50 karakter')
    .regex(
      /^[A-Z0-9_]+$/,
      'Kode role hanya boleh huruf kapital, angka, dan underscore',
    ),
  name: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? 'Nama role wajib diisi'
          : 'Nama role harus berupa teks',
    })
    .trim()
    .min(2, 'Nama role minimal 2 karakter')
    .max(100, 'Nama role maksimal 100 karakter'),
  description: z
    .string()
    .trim()
    .max(255, 'Deskripsi maksimal 255 karakter')
    .optional()
    .or(z.literal('')),
  permissionIds: z
    .array(z.string().min(1))
    .default([]),
})

export type CreateRoleInput = z.infer<typeof createRoleSchema>

export const updateRoleSchema = z.object({
  name: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? 'Nama role wajib diisi'
          : 'Nama role harus berupa teks',
    })
    .trim()
    .min(2, 'Nama role minimal 2 karakter')
    .max(100, 'Nama role maksimal 100 karakter'),
  description: z
    .string()
    .trim()
    .max(255, 'Deskripsi maksimal 255 karakter')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean().optional(),
  permissionIds: z
    .array(z.string().min(1))
    .default([]),
})

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>

export const cloneRoleSchema = z.object({
  sourceId: z.string().min(1, 'Role sumber wajib diisi'),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Kode role minimal 2 karakter')
    .max(50, 'Kode role maksimal 50 karakter')
    .regex(
      /^[A-Z0-9_]+$/,
      'Kode role hanya boleh huruf kapital, angka, dan underscore',
    ),
  name: z
    .string()
    .trim()
    .min(2, 'Nama role minimal 2 karakter')
    .max(100, 'Nama role maksimal 100 karakter'),
})

export type CloneRoleInput = z.infer<typeof cloneRoleSchema>