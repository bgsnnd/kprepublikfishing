'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LOCATION_TYPE_LABELS } from '@/lib/validation/location'

// Dynamic import — Leaflet tidak bisa SSR
const LocationPicker = dynamic(
  () => import('./location-picker').then((m) => m.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="h-[320px] rounded-lg border bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    ),
  },
)

type LocationFormData = {
  id?: string
  code: string
  name: string
  type: string
  address: string
  latitude: number
  longitude: number
  radiusMeters: number
  isDefault: boolean
  isActive?: boolean
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  initialData?: LocationFormData
}

const DEFAULT_CENTER = { lat: -6.2088, lng: 106.8456 }

const EMPTY_FORM: LocationFormData = {
  code: '',
  name: '',
  type: 'OFFICE',
  address: '',
  latitude: DEFAULT_CENTER.lat,
  longitude: DEFAULT_CENTER.lng,
  radiusMeters: 100,
  isDefault: false,
}

export function LocationFormDialog({
  open,
  onOpenChange,
  mode,
  initialData,
}: Props) {
  const router = useRouter()
  const [form, setForm] = useState<LocationFormData>(
    initialData ?? EMPTY_FORM,
  )
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})

    try {
      const url =
        mode === 'create'
          ? '/api/locations'
          : `/api/locations/${initialData?.code}`

      const method = mode === 'create' ? 'POST' : 'PATCH'

      const body =
        mode === 'create'
          ? {
              code: form.code,
              name: form.name,
              type: form.type,
              address: form.address,
              latitude: form.latitude,
              longitude: form.longitude,
              radiusMeters: form.radiusMeters,
              isDefault: form.isDefault,
            }
          : {
              name: form.name,
              type: form.type,
              address: form.address,
              latitude: form.latitude,
              longitude: form.longitude,
              radiusMeters: form.radiusMeters,
              isDefault: form.isDefault,
              isActive: form.isActive,
            }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal menyimpan')
        if (json.error?.fields) setFieldErrors(json.error.fields)
        return
      }

      toast.success(
        mode === 'create'
          ? 'Lokasi berhasil dibuat'
          : 'Lokasi berhasil diupdate',
      )
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogTitle className="text-lg">
            {mode === 'create' ? 'Tambah Lokasi' : 'Edit Lokasi'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Tentukan nama, koordinat, dan radius lokasi.'
              : `Ubah data lokasi ${initialData?.name ?? ''}.`}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="px-6 py-5 space-y-5">
              {/* Info dasar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mode === 'create' && (
                  <div className="space-y-2">
                    <Label htmlFor="code">
                      Kode <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="code"
                      value={form.code}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          code: e.target.value
                            .toUpperCase()
                            .replace(/\s/g, '_'),
                        })
                      }
                      disabled={loading}
                      required
                      className="font-mono"
                      placeholder="KANTOR_PUSAT"
                    />
                    <FieldError messages={fieldErrors.code} />
                  </div>
                )}

                <div
                  className={
                    mode === 'create'
                      ? 'space-y-2'
                      : 'space-y-2 sm:col-span-2'
                  }
                >
                  <Label htmlFor="name">
                    Nama Lokasi <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    disabled={loading}
                    required
                    placeholder="Kantor Pusat"
                  />
                  <FieldError messages={fieldErrors.name} />
                </div>

                <div className="space-y-2">
                  <Label>Tipe</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v: string | null) =>
                      setForm({ ...form, type: v ?? 'OFFICE' })
                    }
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LOCATION_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    disabled={loading}
                    placeholder="opsional"
                  />
                </div>
              </div>

              {/* Peta */}
              <div className="space-y-2">
                <Label>Pilih Lokasi di Peta</Label>
                <p className="text-xs text-muted-foreground">
                  Klik peta untuk pilih titik. Geser marker untuk sesuaikan.
                </p>
                <LocationPicker
                  latitude={form.latitude}
                  longitude={form.longitude}
                  radiusMeters={form.radiusMeters}
                  onChange={(lat, lng) =>
                    setForm({ ...form, latitude: lat, longitude: lng })
                  }
                />
              </div>

              {/* Koordinat & radius */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="0.000001"
                    value={form.latitude}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        latitude: Number(e.target.value),
                      })
                    }
                    disabled={loading}
                    className="font-mono text-sm"
                  />
                  <FieldError messages={fieldErrors.latitude} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="0.000001"
                    value={form.longitude}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        longitude: Number(e.target.value),
                      })
                    }
                    disabled={loading}
                    className="font-mono text-sm"
                  />
                  <FieldError messages={fieldErrors.longitude} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="radius">
                    Radius <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="radius"
                      type="number"
                      min="10"
                      max="1000000"
                      value={form.radiusMeters}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          radiusMeters: Number(e.target.value),
                        })
                      }
                      disabled={loading}
                    />
                    <span className="text-sm text-muted-foreground shrink-0">
                      meter
                    </span>
                  </div>
                  <FieldError messages={fieldErrors.radiusMeters} />
                </div>
              </div>

              {/* Opsi */}
              <div className="flex items-center justify-between gap-6 py-2 border-t">
                <div>
                  <Label htmlFor="isDefault" className="cursor-pointer">
                    Jadikan Lokasi Default
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lokasi default dipakai untuk validasi absensi.
                  </p>
                </div>
                <Switch
                  id="isDefault"
                  checked={form.isDefault}
                  onCheckedChange={(v) =>
                    setForm({ ...form, isDefault: v })
                  }
                  disabled={loading}
                />
              </div>

              {mode === 'edit' && (
                <div className="flex items-center justify-between gap-6 py-2 border-t">
                  <div>
                    <Label htmlFor="isActive" className="cursor-pointer">
                      Aktif
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Lokasi nonaktif tidak muncul di dropdown absensi.
                    </p>
                  </div>
                  <Switch
                    id="isActive"
                    checked={form.isActive ?? true}
                    onCheckedChange={(v) =>
                      setForm({ ...form, isActive: v })
                    }
                    disabled={loading}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t bg-muted/30 px-6 py-4">
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'create' ? 'Simpan Lokasi' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null
  return (
    <div className="flex items-start gap-1.5 text-xs text-destructive">
      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
      <div>
        {messages.map((m) => (
          <div key={m}>{m}</div>
        ))}
      </div>
    </div>
  )
}