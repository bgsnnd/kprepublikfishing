'use client'

import { useState, useRef } from 'react'
import { Loader2, Camera } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type ImageUploadProps = {
  value: string | null
  onChange: (url: string | null) => void
  folder:
    | 'users/avatar'
    | 'users/face'
    | 'attendance/selfie'
    | 'products/image'
    | 'categories/image'
  label?: string
  disabled?: boolean
  className?: string
  /** Mode kamera tersembunyi — tidak ada preview, hanya trigger */
  cameraOnly?: boolean
  /** Ref ke input (untuk trigger dari luar) */
  triggerRef?: React.RefObject<HTMLInputElement | null>
}

export function ImageUpload({
  value,
  onChange,
  folder,
  label,
  disabled,
  className,
  cameraOnly = false,
  triggerRef,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const internalRef = useRef<HTMLInputElement>(null)
  const inputRef = triggerRef ?? internalRef

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]

    // Reset input biar bisa ambil foto lagi
    if (inputRef.current) inputRef.current.value = ''

    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
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
      // Private bucket → url kosong, simpan key
      onChange(result.url || result.key)

      const saved = result.compression?.savedPercent
      toast.success(
        saved
          ? `Foto berhasil (hemat ${saved}%)`
          : 'Foto berhasil diupload',
      )
    } catch {
      toast.error('Tidak dapat terhubung ke server')
    } finally {
      setUploading(false)
    }
  }

  // ============================================================
  // MODE CAMERA-ONLY — hidden input + loading overlay
  // ============================================================
  if (cameraOnly) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFile}
          disabled={disabled || uploading}
          className="hidden"
        />

        {uploading && (
          <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm font-medium">Mengupload foto...</p>
              <p className="text-xs text-muted-foreground">
                Mohon tunggu sebentar
              </p>
            </div>
          </div>
        )}
      </>
    )
  }

  // ============================================================
  // MODE BIASA — preview + tombol
  // ============================================================
  const previewUrl = value?.startsWith('http') ? value : null

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-sm font-medium leading-none">{label}</label>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFile}
        disabled={disabled || uploading}
        className="hidden"
      />

      {value ? (
        <div className="relative w-full aspect-square rounded-xl overflow-hidden border bg-muted">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Upload"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
              <Camera className="h-8 w-8 mb-2" />
              <p className="text-xs">Foto terupload</p>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className={cn(
            'w-full aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors',
            'hover:bg-muted/50 hover:border-primary/50',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Mengupload...</p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
                <Camera className="h-7 w-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Ambil Foto</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Klik untuk buka kamera
                </p>
              </div>
            </>
          )}
        </button>
      )}
    </div>
  )
}