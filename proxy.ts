import { NextResponse, type NextRequest } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/session'
import { getRequiredPermission } from '@/lib/auth/permissions'

/**
 * Path yang tidak butuh login (halaman publik).
 * API routes TIDAK dimasukkan sini — biar ditangani oleh blok khusus di bawah.
 */
const PUBLIC_PAGE_PATHS = ['/login', '/403']

/**
 * API routes yang memang publik (login, health check, dll).
 * Selain ini, API route akan dicek session-nya di proxy.
 */
const PUBLIC_API_PATHS = ['/api/auth/login', '/api/auth/logout']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ============================================================
  // 1. Skip file statis
  // ============================================================
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // ============================================================
  // 2. Halaman publik — langsung lanjut
  // ============================================================
  if (
    PUBLIC_PAGE_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + '/'),
    )
  ) {
    return NextResponse.next()
  }

  // ============================================================
  // 3. API publik — langsung lanjut
  // ============================================================
  if (
    PUBLIC_API_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + '/'),
    )
  ) {
    return NextResponse.next()
  }

  // ============================================================
  // 4. Cek session dari cookie
  // ============================================================
  const token = req.cookies.get('access_token')?.value
  const session = token ? await verifyAccessToken(token) : null

  // ============================================================
  // 5. API routes — kalau belum login, return JSON 401
  //    (BUKAN redirect HTML, karena API consumers expect JSON)
  // ============================================================
  if (pathname.startsWith('/api/')) {
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Sesi tidak valid atau sudah kedaluwarsa',
          },
        },
        { status: 401 },
      )
    }
    return NextResponse.next()
  }

  // ============================================================
  // 6. Halaman — kalau belum login, redirect ke /login
  // ============================================================
  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // ============================================================
  // 7. Cek permission untuk halaman
  // ============================================================
  const required = getRequiredPermission(pathname)
  if (required && !session.permissions.includes(required)) {
    const url = req.nextUrl.clone()
    url.pathname = '/403'
    return NextResponse.redirect(url)
  }

  // ============================================================
  // 8. Tambah request ID untuk tracing
  // ============================================================
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID()

  return NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(req.headers),
        'x-request-id': requestId,
      }),
    },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}