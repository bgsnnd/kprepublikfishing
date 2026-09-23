import { z } from 'zod'

// ============================================================
// Method
// ============================================================

export const ATTENDANCE_METHODS = [
  'MANUAL',  // Admin input absensi untuk karyawan
  'SELF',    // Karyawan absen sendiri via web/app
  'FACE',    // Face recognition (Flutter)
  'QR',      // Scan QR code
  'NFC',     // Tap NFC card
] as const

export type AttendanceMethod = (typeof ATTENDANCE_METHODS)[number]

export const ATTENDANCE_METHOD_LABELS: Record<string, string> = {
  MANUAL: 'Manual (Admin)',
  SELF: 'Absen Sendiri',
  FACE: 'Face Recognition',
  QR: 'Scan QR',
  NFC: 'Tap NFC',
}

// ============================================================
// Check-in
// ============================================================

export const checkInSchema = z.object({
  // ✅ WAJIB: shift yang mau di-absen
  shiftId: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? 'Shift wajib dipilih'
          : 'Shift harus berupa teks',
    })
    .trim()
    .min(1, 'Shift wajib dipilih'),

  // ✅ Opsional: cuma dipakai admin
  username: z.string().trim().optional(),

  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  accuracy: z.coerce.number().min(0).optional(),
  selfieUrl: z.string().trim().optional().or(z.literal('')),
  method: z.enum(ATTENDANCE_METHODS).default('MANUAL'),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
})

export type CheckInInput = z.infer<typeof checkInSchema>

// ============================================================
// Check-out
// ============================================================

export const checkOutSchema = z.object({
  // ✅ WAJIB: attendance yang mau di-checkout
  attendanceId: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? 'Absensi wajib dipilih'
          : 'Absensi harus berupa teks',
    })
    .trim()
    .min(1, 'Absensi wajib dipilih'),

  // ✅ Opsional: cuma dipakai admin
  username: z.string().trim().optional(),

  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  accuracy: z.coerce.number().min(0).optional(),
  selfieUrl: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
})

export type CheckOutInput = z.infer<typeof checkOutSchema>

// ============================================================
// Koreksi (admin edit)
// ============================================================

export const correctAttendanceSchema = z.object({
  checkIn: z.string().datetime().optional(),
  checkOut: z.string().datetime().nullable().optional(),
  status: z
    .enum(['HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'CUTI', 'ALPHA'])
    .optional(),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  correctionNote: z
    .string()
    .trim()
    .min(3, 'Alasan koreksi wajib diisi minimal 3 karakter')
    .max(500),
})

export type CorrectAttendanceInput = z.infer<typeof correctAttendanceSchema>

// ============================================================
// List query
// ============================================================

export const listAttendanceQuerySchema = z.object({
  q: z.string().trim().optional().default(''),
  date: z.string().trim().optional().default(''),
  dateFrom: z.string().trim().optional().default(''),
  dateTo: z.string().trim().optional().default(''),
  status: z.string().trim().optional().default(''),
  checkout: z.string().trim().optional().default(''),
  username: z.string().trim().optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export type ListAttendanceQuery = z.infer<typeof listAttendanceQuerySchema>

// ============================================================
// Status labels & colors
// ============================================================

export const ATTENDANCE_STATUS = [
  'HADIR',
  'TERLAMBAT',
  'IZIN',
  'SAKIT',
  'CUTI',
  'ALPHA',
] as const

export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[number]

export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  HADIR: 'Hadir',
  TERLAMBAT: 'Terlambat',
  IZIN: 'Izin',
  SAKIT: 'Sakit',
  CUTI: 'Cuti',
  ALPHA: 'Alpha',
}

// ============================================================
// Checkout filter labels
// ============================================================

export const CHECKOUT_FILTERS = ['all', 'pending', 'done'] as const
export type CheckoutFilter = (typeof CHECKOUT_FILTERS)[number]