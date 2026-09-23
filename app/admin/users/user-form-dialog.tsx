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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type RoleOption = {
  code: string
  name: string
  description: string | null
}
type EmployeeTypeOption = { code: string; name: string }

type UserFormData = {
  username?: string
  name: string
  email: string
  password?: string
  phone: string
  employeeTypeCode: string
  roleCodes: string[]
}

type UserFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  roles: RoleOption[]
  employeeTypes: EmployeeTypeOption[]
  initialData?: UserFormData
}

const EMPTY_FORM: UserFormData = {
  username: '',
  name: '',
  email: '',
  password: '',
  phone: '',
  employeeTypeCode: '',
  roleCodes: [],
}

export function UserFormDialog({
  open,
  onOpenChange,
  mode,
  roles,
  employeeTypes,
  initialData,
}: UserFormDialogProps) {
  const router = useRouter()
  const [form, setForm] = useState<UserFormData>(initialData ?? EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  function toggleRole(code: string) {
    setForm((f) => ({
      ...f,
      roleCodes: f.roleCodes.includes(code)
        ? f.roleCodes.filter((c) => c !== code)
        : [...f.roleCodes, code],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (mode === 'create' && !form.password) {
      setFieldErrors({ password: ['Password wajib diisi'] })
      return
    }

    setLoading(true)
    setFieldErrors({})

    try {
      const url =
        mode === 'create'
          ? '/api/users'
          : `/api/users/${initialData?.username}`

      const method = mode === 'create' ? 'POST' : 'PATCH'

      const body =
        mode === 'create'
          ? {
              username: form.username,
              name: form.name,
              email: form.email,
              password: form.password,
              phone: form.phone,
              employeeTypeCode: form.employeeTypeCode,
              roleCodes: form.roleCodes,
            }
          : {
              name: form.name,
              phone: form.phone,
              employeeTypeCode: form.employeeTypeCode,
              roleCodes: form.roleCodes,
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
        mode === 'create' ? 'User berhasil dibuat' : 'User berhasil diupdate',
      )
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  const selectedRoleCount = form.roleCodes.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogTitle className="text-lg">
            {mode === 'create' ? 'Tambah User Baru' : 'Edit User'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Lengkapi data akun dan tentukan role yang sesuai.'
              : `Ubah data untuk @${initialData?.username ?? ''}.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="px-6 py-5 space-y-5">
              {/* Grid 2 kolom */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                {/* Nama — full width */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">
                    Nama Lengkap <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    disabled={loading}
                    required
                    placeholder="Misal: Budi Santoso"
                  />
                  <FieldError messages={fieldErrors.name} />
                </div>

                {mode === 'create' && (
                  <>
                    {/* Username */}
                    <div className="space-y-2">
                      <Label htmlFor="username">
                        Username <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="username"
                        value={form.username ?? ''}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            username: e.target.value
                              .toLowerCase()
                              .replace(/\s/g, ''),
                          })
                        }
                        disabled={loading}
                        required
                        className="font-mono"
                        placeholder="budi_santoso"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Huruf kecil, angka, underscore. Minimal 3 karakter.
                      </p>
                      <FieldError messages={fieldErrors.username} />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        disabled={loading}
                        required
                        placeholder="nama@email.com"
                      />
                      <FieldError messages={fieldErrors.email} />
                    </div>

                    {/* Password — full width */}
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="password">
                        Password <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={form.password ?? ''}
                        onChange={(e) =>
                          setForm({ ...form, password: e.target.value })
                        }
                        disabled={loading}
                        required
                        placeholder="Minimal 8 karakter"
                      />
                      <FieldError messages={fieldErrors.password} />
                    </div>
                  </>
                )}

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">No. Telepon</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    disabled={loading}
                    placeholder="opsional"
                  />
                  <FieldError messages={fieldErrors.phone} />
                </div>

                {/* Employee Type */}
                <div className="space-y-2">
                  <Label>Tipe Karyawan</Label>
                  <Select
                    value={form.employeeTypeCode || 'none'}
                    onValueChange={(v: string | null) => {
                      const val = v ?? 'none'
                      setForm({
                        ...form,
                        employeeTypeCode: val === 'none' ? '' : val,
                      })
                    }}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Tidak ada —</SelectItem>
                      {employeeTypes.map((et) => (
                        <SelectItem key={et.code} value={et.code}>
                          {et.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError messages={fieldErrors.employeeTypeCode} />
                </div>
              </div>

              {/* Role — grid horizontal */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Role</Label>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {selectedRoleCount} dipilih
                  </span>
                </div>

                <div className="rounded-lg border overflow-hidden">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 divide-border/40">
                    {roles.map((r) => {
                      const checked = form.roleCodes.includes(r.code)
                      return (
                        <label
                          key={r.code}
                          className={cn(
                            'flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors border-b border-border/40 last:border-b-0',
                            checked ? 'bg-primary/5' : 'hover:bg-muted/30',
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleRole(r.code)}
                            disabled={loading}
                            className="mt-0.5 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div
                              className={cn(
                                'text-sm leading-tight',
                                checked && 'font-medium',
                              )}
                            >
                              {r.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
                              {r.code}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
                <FieldError messages={fieldErrors.roleCodes} />
              </div>
            </div>
          </div>

          {/* Footer — FIX: hapus nested div aneh */}
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
                {mode === 'create' ? 'Simpan User' : 'Simpan Perubahan'}
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