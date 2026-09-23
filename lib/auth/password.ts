import bcrypt from 'bcryptjs'

/**
 * Cost factor untuk bcrypt. Semakin tinggi = semakin aman, tapi semakin lambat.
 * - 10 = ~100ms (minimal modern)
 * - 12 = ~300ms (recommended 2024)
 * - 14 = ~1s (untuk high-security)
 */
const BCRYPT_ROUNDS = 12

/**
 * Batas maksimum panjang password.
 * bcrypt hanya pakai 72 byte pertama — kalau lebih, akan diam-diam dipotong.
 * Kita tolak supaya user tahu.
 */
const MAX_PASSWORD_BYTES = 72

export async function hashPassword(plain: string): Promise<string> {
  if (!plain || plain.length < 8) {
    throw new Error('Password minimal 8 karakter')
  }

  if (Buffer.byteLength(plain, 'utf8') > MAX_PASSWORD_BYTES) {
    throw new Error('Password terlalu panjang (maks 72 byte)')
  }

  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  if (!plain || !hash) return false

  try {
    return await bcrypt.compare(plain, hash)
  } catch {
    return false
  }
}

/**
 * Cek apakah hash perlu di-rehash (kalau BCRYPT_ROUNDS naik).
 * Panggil ini setelah login sukses, kalau true, update passwordHash di DB.
 */
export function needsRehash(hash: string): boolean {
  try {
    const rounds = bcrypt.getRounds(hash)
    return rounds < BCRYPT_ROUNDS
  } catch {
    return true // hash tidak valid → wajib rehash
  }
}