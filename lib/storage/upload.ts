import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  s3,
  BUCKET_PUBLIC,
  PUBLIC_URL,
  getBucketForFolder,
} from './client'

export type UploadResult = {
  key: string
  url: string          // kosong kalau private
  size: number
  contentType: string
  isPublic: boolean
}

// ============================================================
// Upload file
// ============================================================

export async function uploadFile(params: {
  file: Buffer | Uint8Array
  key: string
  contentType: string
  folder: string
}): Promise<UploadResult> {
  const { file, key, contentType, folder } = params
  const bucket = getBucketForFolder(folder)
  const isPublic = bucket === BUCKET_PUBLIC

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
      CacheControl: isPublic
        ? 'public, max-age=31536000, immutable'
        : 'private, max-age=0, no-cache',
      // Tanpa ACL — Neon pakai bucket-level access
    }),
  )

  return {
    key,
    url: isPublic ? getPublicUrl(key) : '',
    size: file.byteLength,
    contentType,
    isPublic,
  }
}

// ============================================================
// Delete file
// ============================================================

export async function deleteFile(params: {
  key: string
  folder: string
}): Promise<void> {
  const bucket = getBucketForFolder(params.folder)

  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: params.key,
    }),
  )
}

// ============================================================
// Presigned URL — untuk file private
// ============================================================

export async function getPresignedUrl(params: {
  key: string
  folder: string
  expiresInSeconds?: number
}): Promise<string> {
  const { key, folder, expiresInSeconds = 3600 } = params
  const bucket = getBucketForFolder(folder)

  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: expiresInSeconds },
  )
}

// ============================================================
// Get URL — otomatis public atau presigned
// ============================================================

export async function getFileUrl(params: {
  key: string
  folder: string
  expiresInSeconds?: number
}): Promise<string> {
  const bucket = getBucketForFolder(params.folder)

  if (bucket === BUCKET_PUBLIC) {
    return getPublicUrl(params.key)
  }

  return getPresignedUrl(params)
}

// ============================================================
// Public URL
// ============================================================

export function getPublicUrl(key: string): string {
  const base = PUBLIC_URL.replace(/\/$/, '')
  const cleanKey = key.replace(/^\//, '')
  return `${base}/${cleanKey}`
}

// ============================================================
// Generate key unik
// ============================================================

export function generateKey(params: {
  folder: string
  userId?: string
  filename: string
}): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')

  const ext = params.filename.split('.').pop()?.toLowerCase() ?? 'bin'
  const random = crypto.randomUUID().slice(0, 8)

  const sanitized = params.filename
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)

  const base = `${sanitized || 'file'}-${random}.${ext}`

  if (params.userId) {
    return `${params.folder}/${params.userId}/${year}/${month}/${base}`
  }

  return `${params.folder}/${year}/${month}/${base}`
}