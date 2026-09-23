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

export const LOCATION_TYPES = ['OFFICE', 'POOL', 'WAREHOUSE', 'OTHER'] as const

const typeField = z.enum(LOCATION_TYPES, {
  error: () => 'Tipe tidak valid',
})

const latitudeField = z.coerce
  .number({
    error: () => 'Latitude harus berupa angka',
  })
  .min(-90, 'Latitude minimal -90')
  .max(90, 'Latitude maksimal 90')

const longitudeField = z.coerce
  .number({
    error: () => 'Longitude harus berupa angka',
  })
  .min(-180, 'Longitude minimal -180')
  .max(180, 'Longitude maksimal 180')

const radiusField = z.coerce
  .number({
    error: () => 'Radius harus berupa angka',
  })
  .int('Radius harus bilangan bulat')
  .min(10, 'Radius minimal 10 meter')
  .max(100000, 'Radius maksimal 10000 meter')

// ============================================================
// Create
// ============================================================

export const createLocationSchema = z.object({
  code: codeField,
  name: nameField,
  type: typeField.default('OFFICE'),
  address: z
    .string()
    .trim()
    .max(255, 'Alamat maksimal 255 karakter')
    .optional()
    .or(z.literal('')),
  latitude: latitudeField,
  longitude: longitudeField,
  radiusMeters: radiusField.default(100),
  isDefault: z.boolean().default(false),
})

export type CreateLocationInput = z.infer<typeof createLocationSchema>

// ============================================================
// Update
// ============================================================

export const updateLocationSchema = z.object({
  name: nameField,
  type: typeField,
  address: z
    .string()
    .trim()
    .max(255, 'Alamat maksimal 255 karakter')
    .optional()
    .or(z.literal('')),
  latitude: latitudeField,
  longitude: longitudeField,
  radiusMeters: radiusField,
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>

// ============================================================
// List query
// ============================================================

export const listLocationsQuerySchema = z.object({
  q: z.string().trim().optional().default(''),
  type: z.string().trim().optional().default(''),
  status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export type ListLocationsQuery = z.infer<typeof listLocationsQuerySchema>

// ============================================================
// Type labels
// ============================================================

export const LOCATION_TYPE_LABELS: Record<string, string> = {
  OFFICE: 'Kantor',
  POOL: 'Kolam',
  WAREHOUSE: 'Gudang',
  OTHER: 'Lainnya',
}