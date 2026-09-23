import { S3Client } from '@aws-sdk/client-s3'
import { env } from '@/lib/env'

const globalForS3 = globalThis as unknown as {
  s3: S3Client | undefined
}

export const s3 =
  globalForS3.s3 ??
  new S3Client({
    endpoint: env.AWS_ENDPOINT_URL_S3,
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  })

if (env.NODE_ENV !== 'production') {
  globalForS3.s3 = s3
}

// ============================================================
// Bucket config
// ============================================================

export const BUCKET_PUBLIC = env.AWS_BUCKET_PUBLIC
export const BUCKET_PRIVATE = env.AWS_BUCKET_PRIVATE
export const PUBLIC_URL = env.AWS_PUBLIC_URL

// Folder → bucket mapping
export const FOLDER_BUCKET: Record<string, string> = {
  'users/avatar': BUCKET_PUBLIC,
  'users/face': BUCKET_PUBLIC,
  'attendance/selfie': BUCKET_PRIVATE,   // ← private (data biometrik)
  'products/image': BUCKET_PUBLIC,
  'categories/image': BUCKET_PUBLIC,
}

export function getBucketForFolder(folder: string): string {
  return FOLDER_BUCKET[folder] ?? BUCKET_PUBLIC
}

export function isFolderPublic(folder: string): boolean {
  return getBucketForFolder(folder) === BUCKET_PUBLIC
}