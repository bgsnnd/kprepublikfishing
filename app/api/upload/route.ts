import { requireSession, buildAuditContext } from '@/lib/auth/context'
import { uploadFile, generateKey } from '@/lib/storage/upload'
import { compressImage, validateImage } from '@/lib/storage/compress'
import { writeAudit } from '@/lib/audit/log'
import { ok, withErrorHandler } from '@/lib/api/response'
import { BadRequestError, ForbiddenError } from '@/lib/errors'

// ============================================================
// Konfigurasi folder & permission
// ============================================================

const FOLDER_PERMISSIONS: Record<string, string> = {
  'users/avatar': 'user.manage',
  'users/face': 'user.manage',
  'attendance/selfie': 'attendance.self',
  'products/image': 'inventory.manage',
  'categories/image': 'inventory.manage',
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024 // 10 MB

// ============================================================
// POST /api/upload
// ============================================================

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await requireSession()

    const formData = await req.formData()
    const file = formData.get('file')
    const folder = formData.get('folder')

    // Validasi folder
    if (typeof folder !== 'string' || !FOLDER_PERMISSIONS[folder]) {
      throw new BadRequestError('Folder tidak valid')
    }

    // Cek permission
    const required = FOLDER_PERMISSIONS[folder]
    if (!session.permissions.includes(required)) {
      throw new ForbiddenError(
        `Butuh permission "${required}" untuk upload ke folder ini`,
      )
    }

    // Validasi file
    if (!(file instanceof File)) {
      throw new BadRequestError('File wajib diisi')
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      throw new BadRequestError('Ukuran file maksimal 10 MB')
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new BadRequestError('Format harus JPG, PNG, WebP, atau HEIC')
    }

    // Baca buffer
    const arrayBuffer = await file.arrayBuffer()
    const originalBuffer = Buffer.from(arrayBuffer)

    // Validasi gambar
    const validation = await validateImage(originalBuffer)
    if (!validation.valid) {
      throw new BadRequestError(validation.error ?? 'Gambar tidak valid')
    }

    // Kompres
    const compressed = await compressImage(originalBuffer, folder)

    // Generate key
    const key = generateKey({
      folder,
      userId: session.userId,
      filename: file.name.replace(/\.[^.]+$/, '.webp'),
    })

    // Upload ke Neon Storage — folder menentukan bucket
    const result = await uploadFile({
      file: compressed.buffer,
      key,
      contentType: 'image/webp',
      folder,  // ← folder, bukan isPublic
    })

    // Audit log
    const auditCtx = await buildAuditContext(session)
    await writeAudit({
      action: 'CREATE',
      entity: 'File',
      after: {
        key: result.key,
        folder,
        isPublic: result.isPublic,
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize,
        savedPercent: compressed.savedPercent,
      },
      module: 'storage',
      severity: 'INFO',
      context: auditCtx,
    })

    return ok({
      url: result.url,        // kosong kalau private
      key: result.key,
      isPublic: result.isPublic,
      size: result.size,
      width: compressed.width,
      height: compressed.height,
      format: compressed.format,
      compression: {
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize,
        savedPercent: compressed.savedPercent,
      },
    })
  }, { module: 'upload' })
}