import 'dotenv/config'
import {
  uploadFile,
  generateKey,
  deleteFile,
  getFileUrl,
  getPublicUrl,
  getPresignedUrl,
} from '../lib/storage/upload'
import { getBucketForFolder } from '../lib/storage/client'

// ============================================================
// Dummy image (1×1 pixel PNG, 68 bytes)
// ============================================================

const DUMMY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

// ============================================================
// Test upload ke bucket public
// ============================================================

async function testPublicUpload() {
  console.log('\n📤 Test 1: Upload ke bucket PUBLIC (products/image)')
  console.log('─'.repeat(60))

  const key = generateKey({
    folder: 'products/image',
    filename: 'test-product.png',
  })

  console.log('Key:', key)
  console.log('Bucket:', getBucketForFolder('products/image'))

  const result = await uploadFile({
    file: DUMMY_PNG,
    key,
    contentType: 'image/png',
    folder: 'products/image',
  })

  console.log('\n✅ Upload sukses:')
  console.log('   Key:', result.key)
  console.log('   URL:', result.url)
  console.log('   Size:', result.size, 'bytes')
  console.log('   isPublic:', result.isPublic)

  if (!result.url) {
    throw new Error('❌ Public upload harus punya URL!')
  }

  return result.key
}

// ============================================================
// Test upload ke bucket private
// ============================================================

async function testPrivateUpload() {
  console.log('\n📤 Test 2: Upload ke bucket PRIVATE (attendance/selfie)')
  console.log('─'.repeat(60))

  const key = generateKey({
    folder: 'attendance/selfie',
    userId: 'test-user-123',
    filename: 'test-selfie.png',
  })

  console.log('Key:', key)
  console.log('Bucket:', getBucketForFolder('attendance/selfie'))

  const result = await uploadFile({
    file: DUMMY_PNG,
    key,
    contentType: 'image/png',
    folder: 'attendance/selfie',
  })

  console.log('\n✅ Upload sukses:')
  console.log('   Key:', result.key)
  console.log('   URL:', result.url || '(kosong — file private)')
  console.log('   Size:', result.size, 'bytes')
  console.log('   isPublic:', result.isPublic)

  if (result.url) {
    throw new Error('❌ Private upload TIDAK boleh punya public URL!')
  }

  return result.key
}

// ============================================================
// Test presigned URL untuk file private
// ============================================================

async function testPresignedUrl(key: string) {
  console.log('\n🔐 Test 3: Presigned URL untuk file PRIVATE')
  console.log('─'.repeat(60))

  const url = await getPresignedUrl({
    key,
    folder: 'attendance/selfie',
    expiresInSeconds: 3600,
  })

  console.log('✅ Presigned URL berhasil dibuat:')
  console.log('   ', url.slice(0, 100) + '...')

  // Cek URL bisa diakses
  const res = await fetch(url)
  console.log('   HTTP status:', res.status)

  if (res.status !== 200) {
    throw new Error(`❌ Presigned URL gagal diakses (status ${res.status})`)
  }

  console.log('   ✅ File bisa diakses via presigned URL')
}

// ============================================================
// Test getFileUrl (auto public/presigned)
// ============================================================

async function testGetFileUrl() {
  console.log('\n🔄 Test 4: getFileUrl() auto-detect')
  console.log('─'.repeat(60))

  const publicKey = generateKey({
    folder: 'users/avatar',
    filename: 'avatar-test.png',
  })

  await uploadFile({
    file: DUMMY_PNG,
    key: publicKey,
    contentType: 'image/png',
    folder: 'users/avatar',
  })

  const publicUrl = await getFileUrl({
    key: publicKey,
    folder: 'users/avatar',
  })
  console.log('   Public file URL:', publicUrl.slice(0, 80) + '...')

  if (!publicUrl.startsWith('http')) {
    throw new Error('❌ getFileUrl public harus return URL langsung')
  }

  console.log('   ✅ Public: URL langsung')

  return publicKey
}

// ============================================================
// Cleanup
// ============================================================

async function cleanup(keys: { key: string; folder: string }[]) {
  console.log('\n🧹 Cleanup: hapus file test')
  console.log('─'.repeat(60))

  for (const { key, folder } of keys) {
    try {
      await deleteFile({ key, folder })
      console.log(`   ✅ Deleted: ${key}`)
    } catch (err) {
      console.log(`   ⚠️  Gagal delete ${key}:`, err)
    }
  }
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║   TEST NEON OBJECT STORAGE — 2 BUCKET               ║')
  console.log('╚══════════════════════════════════════════════════════╝')

  const cleanupList: { key: string; folder: string }[] = []

  try {
    // Test 1: Public upload
    const publicKey = await testPublicUpload()
    cleanupList.push({ key: publicKey, folder: 'products/image' })

    // Test 2: Private upload
    const privateKey = await testPrivateUpload()
    cleanupList.push({ key: privateKey, folder: 'attendance/selfie' })

    // Test 3: Presigned URL
    await testPresignedUrl(privateKey)

    // Test 4: getFileUrl auto
    const avatarKey = await testGetFileUrl()
    cleanupList.push({ key: avatarKey, folder: 'users/avatar' })

    // Cleanup
    await cleanup(cleanupList)

    console.log('\n╔══════════════════════════════════════════════════════╗')
    console.log('║   ✅ SEMUA TEST BERHASIL!                            ║')
    console.log('╚══════════════════════════════════════════════════════╝\n')
  } catch (err) {
    console.error('\n❌ TEST GAGAL:', err)

    // Tetap coba cleanup
    if (cleanupList.length > 0) {
      await cleanup(cleanupList).catch(() => {})
    }

    process.exit(1)
  }
}

main()