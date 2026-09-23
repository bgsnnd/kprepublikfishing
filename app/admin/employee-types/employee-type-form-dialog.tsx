'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
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

type EmployeeTypeFormData = {
  code: string
  name: string
  description: string
  isActive: boolean
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  initialData?: EmployeeTypeFormData
}

const EMPTY_FORM: EmployeeTypeFormData = {
  code: '',
  name: '',
  description: '',
  isActive: true,
}

export function EmployeeTypeFormDialog({
  open,
  onOpenChange,
  mode,
  initialData,
}: Props) {
  const router = useRouter()
  const [form, setForm] = useState<EmployeeTypeFormData>(
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
          ? '/api/employee-types'
          : `/api/employee-types/${initialData?.code}`

      const method = mode === 'create' ? 'POST' : 'PATCH'

      const body =
        mode === 'create'
          ? {
              code: form.code,
              name: form.name,
              description: form.description,
            }
          : {
              name: form.name,
              description: form.description,
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
          ? 'Tipe karyawan berhasil dibuat'
          : 'Tipe karyawan berhasil diupdate',
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
      <DialogContent className="max-w-lg w-[95vw] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogTitle className="text-lg">
            {mode === 'create' ? 'Tambah Tipe Karyawan' : 'Edit Tipe Karyawan'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Buat tipe karyawan baru untuk penggajian.'
              : `Ubah data tipe ${initialData?.name ?? ''}.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="px-6 py-5 space-y-4">
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
                    placeholder="CADDY"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Huruf kapital, angka, underscore.
                  </p>
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
                  Nama <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  disabled={loading}
                  required
                  placeholder="Caddy"
                />
                <FieldError messages={fieldErrors.name} />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  disabled={loading}
                  placeholder="opsional"
                />
                <FieldError messages={fieldErrors.description} />
              </div>
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
                {mode === 'create' ? 'Simpan' : 'Update'}
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