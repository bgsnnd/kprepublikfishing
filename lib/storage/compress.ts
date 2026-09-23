import sharp from 'sharp'

type CompressConfig = {
  maxWidth: number
  maxHeight: number
  quality: number
}

/**
 * Config kompresi per folder — optimal antara ukuran & kualitas.
 */
const COMPRESS_CONFIG: Record<string, CompressConfig> = {
  // Foto profil — kecil, cukup untuk UI
  'users/avatar': {
    maxWidth: 400,
    maxHeight: 400,
    quality: 85,
  },

  // Foto wajah referensi — butuh detail untuk face recognition
  'users/face': {
    maxWidth: 800,
    maxHeight: 800,
    quality: 90,
  },

  // Selfie absensi — cukup untuk verifikasi wajah
  'attendance/selfie': {
    maxWidth: 640,
    maxHeight: 640,
    quality: 80,
  },

  // Foto produk — jelas untuk kasir & katalog
  'products/image': {
    maxWidth: 800,
    maxHeight: 800,
    quality: 85,
  },

  // Foto kategori — icon, kecil cukup
  'categories/image': {
    maxWidth: 400,
    maxHeight: 400,
    quality: 85,
  },
}

const DEFAULT_CONFIG: CompressConfig = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 85,
}

export type CompressResult = {
  buffer: Buffer
  originalSize: number
  compressedSize: number
  savedPercent: number
  width: number
  height: number
  format: string
}

export async function compressImage(
  buffer: Buffer,
  folder: string,
): Promise<CompressResult> {
  const config = COMPRESS_CONFIG[folder] ?? DEFAULT_CONFIG

  const image = sharp(buffer)
  const metadata = await image.metadata()

  const compressed = await image
    .resize(config.maxWidth, config.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality: config.quality,
      effort: 4, // 0-6, makin tinggi makin kecil tapi lambat
    })
    .toBuffer({ resolveWithObject: true })

  const originalSize = buffer.byteLength
  const compressedSize = compressed.data.byteLength
  const savedPercent = Number(
    ((1 - compressedSize / originalSize) * 100).toFixed(1),
  )

  return {
    buffer: compressed.data,
    originalSize,
    compressedSize,
    savedPercent,
    width: compressed.info.width,
    height: compressed.info.height,
    format: 'webp',
  }
}

/**
 * Validasi gambar — cek sebelum kompres.
 */
export async function validateImage(buffer: Buffer): Promise<{
  valid: boolean
  error?: string
  width?: number
  height?: number
  format?: string
}> {
  try {
    const metadata = await sharp(buffer).metadata()

    if (!metadata.width || !metadata.height) {
      return { valid: false, error: 'File bukan gambar valid' }
    }

    // Minimal resolusi
    if (metadata.width < 100 || metadata.height < 100) {
      return { valid: false, error: 'Resolusi minimal 100×100 piksel' }
    }

    // Maksimal resolusi (jaga-jaga)
    if (metadata.width > 8000 || metadata.height > 8000) {
      return { valid: false, error: 'Resolusi maksimal 8000×8000 piksel' }
    }

    return {
      valid: true,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    }
  } catch {
    return { valid: false, error: 'File tidak bisa dibaca sebagai gambar' }
  }
}