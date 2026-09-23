'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle
            className="h-12 w-12 text-destructive"
            strokeWidth={1.5}
          />
        </div>

        <h1 className="text-2xl font-bold tracking-tight">
          Terjadi Kesalahan
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ada yang error di aplikasi. Coba refresh atau balik ke dashboard.
        </p>

        {error.digest && (
          <p className="mt-3 text-xs text-muted-foreground font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Button onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Coba Lagi
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/'
              }
            }}
          >
            <Home className="mr-2 h-4 w-4" />
            Ke Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}