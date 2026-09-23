// app/api/storage/signed-url/route.ts
import { requirePermission } from '@/lib/auth/context'
import { getPresignedUrl } from '@/lib/storage/upload'
import { ok, withErrorHandler } from '@/lib/api/response'
import { BadRequestError } from '@/lib/errors'

const ALLOWED_FOLDERS = [
  'users/avatar',
  'users/face',
  'attendance/selfie',
  'products/image',
  'categories/image',
]

export async function GET(req: Request) {
  return withErrorHandler(async () => {
    await requirePermission('attendance.read')

    const url = new URL(req.url)
    const key = url.searchParams.get('key')
    const folder = url.searchParams.get('folder')

    if (!key || !folder) {
      throw new BadRequestError('Parameter key & folder wajib')
    }

    if (!ALLOWED_FOLDERS.includes(folder)) {
      throw new BadRequestError('Folder tidak valid')
    }

    const signedUrl = await getPresignedUrl({
      key,
      folder,
      expiresInSeconds: 3600,
    })

    return ok({ url: signedUrl })
  }, { module: 'storage.signed-url' })
}