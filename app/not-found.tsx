'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Home, ArrowLeft, Ghost } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
          <Ghost className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
        </div>

        <h1 className="text-7xl font-bold tracking-tight text-foreground">
          404
        </h1>

        <h2 className="mt-4 text-xl font-semibold tracking-tight">
          Halaman Tidak Ditemukan
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Halaman yang lo cari gak ada, udah dipindahin, atau lo salah ketik
          URL-nya.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Button onClick={() => router.push('/')}>
            <Home className="mr-2 h-4 w-4" />
            Ke Dashboard
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Kalau lo yakin ini salah, hubungi admin.
        </p>
      </div>
    </div>
  )
}