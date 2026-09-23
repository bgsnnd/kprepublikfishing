/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Loader2, X, RefreshCw, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type CameraCaptureProps = {
  open: boolean
  onClose: () => void
  onCapture: (url: string) => void
  folder: 'attendance/selfie' | 'users/face' | 'users/avatar'
  facingMode?: 'user' | 'environment'
  title?: string
}

export function CameraCapture({
  open,
  onClose,
  onCapture,
  folder,
  facingMode = 'user',
  title = 'Ambil Foto',
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)

  // ============================================================
  // Start camera
  // ============================================================
  const startCamera = useCallback(async () => {
    try {
      setError(null)
      setReady(false)

      // Stop stream lama kalau ada
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setReady(true)
      }
    } catch (err) {
      console.error(err)
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Izin kamera ditolak. Aktifkan kamera di pengaturan browser.')
        } else if (err.name === 'NotFoundError') {
          setError('Kamera tidak ditemukan di perangkat ini.')
        } else {
          setError('Gagal mengakses kamera.')
        }
      }
    }
  }, [facingMode])

  // ============================================================
  // Stop camera
  // ============================================================
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setReady(false)
  }, [])

  // ============================================================
  // Lifecycle
  // ============================================================
  useEffect(() => {
    if (open) {
      startCamera()
    } else {
      stopCamera()
      setPreview(null)
      setBlob(null)
      setError(null)
    }

    return () => {
      stopCamera()
    }
  }, [open, startCamera, stopCamera])

  // ============================================================
  // Take photo (dari video ke canvas)
  // ============================================================
  function handleCapture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const width = video.videoWidth
    const height = video.videoHeight

    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Flip horizontal untuk kamera depan (mirror)
    if (facingMode === 'user') {
      ctx.translate(width, 0)
      ctx.scale(-1, 1)
    }

    ctx.drawImage(video, 0, 0, width, height)

    canvas.toBlob(
      (b) => {
        if (!b) return
        setBlob(b)
        setPreview(URL.createObjectURL(b))
      },
      'image/jpeg',
      0.9,
    )
  }

  // ============================================================
  // Retake
  // ============================================================
  function handleRetake() {
    setPreview(null)
    setBlob(null)
    if (!streamRef.current) {
      startCamera()
    }
  }

  // ============================================================
  // Upload & confirm
  // ============================================================
  async function handleConfirm() {
    if (!blob) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', new File([blob], 'selfie.jpg', { type: 'image/jpeg' }))
      formData.append('folder', folder)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal upload foto')
        return
      }

      const result = json.data
      const url = result.url || result.key

      toast.success(
        result.compression?.savedPercent
          ? `Foto berhasil (hemat ${result.compression.savedPercent}%)`
          : 'Foto berhasil',
      )

      onCapture(url)
      onClose()
    } catch {
      toast.error('Tidak dapat terhubung ke server')
    } finally {
      setUploading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <h2 className="text-white text-sm font-medium">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          disabled={uploading}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 backdrop-blur text-white hover:bg-white/20 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Camera / Preview */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-center px-6">
            <p className="text-white text-sm mb-4">{error}</p>
            <Button variant="outline" onClick={startCamera}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Coba Lagi
            </Button>
          </div>
        ) : preview ? (
          // Preview setelah ambil foto
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Preview"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          // Live camera
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={cn(
                'max-h-full max-w-full object-contain',
                facingMode === 'user' && 'scale-x-[-1]',
                !ready && 'opacity-0',
              )}
            />
            {!ready && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <Loader2 className="h-8 w-8 animate-spin mb-3" />
                <p className="text-sm">Membuka kamera...</p>
              </div>
            )}

            {/* Frame guide */}
            {ready && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-64 rounded-full border-4 border-white/30" />
              </div>
            )}
          </>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Footer controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 bg-gradient-to-t from-black/80 to-transparent">
        {preview ? (
          // Konfirmasi
          <div className="flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={handleRetake}
              disabled={uploading}
              className="flex flex-col items-center gap-1.5 text-white"
            >
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/10 backdrop-blur hover:bg-white/20 transition-colors">
                <RefreshCw className="h-5 w-5" />
              </div>
              <span className="text-xs">Ambil Ulang</span>
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={uploading}
              className="flex flex-col items-center gap-1.5 text-white"
            >
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30">
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <Check className="h-9 w-9" strokeWidth={3} />
                )}
              </div>
              <span className="text-xs font-medium">
                {uploading ? 'Mengupload...' : 'Gunakan Foto'}
              </span>
            </button>
          </div>
        ) : (
          // Capture button
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleCapture}
              disabled={!ready}
              className={cn(
                'flex items-center justify-center w-20 h-20 rounded-full transition-all',
                'bg-white hover:bg-white/90 active:scale-95',
                'border-4 border-white/30',
                !ready && 'opacity-50 cursor-not-allowed',
              )}
            >
              <div className="w-16 h-16 rounded-full bg-white border-2 border-black/10" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}