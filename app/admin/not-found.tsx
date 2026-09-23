'use client'

import { useRouter } from 'next/navigation'
import { Home, ArrowLeft, LayoutDashboard, Ghost } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AdminNotFound() {
  const router = useRouter()

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <Ghost className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
        </div>

        <h1 className="text-6xl font-bold tracking-tight">404</h1>

        <h2 className="mt-4 text-lg font-semibold">
          Halaman Admin Tidak Ditemukan
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          URL yang lo akses gak ada di panel admin.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Button onClick={() => router.push('/admin')}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard Admin
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </div>
      </div>
    </div>
  )
}