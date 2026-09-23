'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search, Check, Minus } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PermissionGroup } from '@/lib/roles/queries'

type RoleFormData = {
  id?: string
  code: string
  name: string
  description: string
  isActive: boolean
  permissionIds: string[]
}

type RoleFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  permissionGroups: PermissionGroup[]
  initialData?: RoleFormData
}

const EMPTY_FORM: RoleFormData = {
  code: '',
  name: '',
  description: '',
  isActive: true,
  permissionIds: [],
}

export function RoleFormDialog({
  open,
  onOpenChange,
  mode,
  permissionGroups,
  initialData,
}: RoleFormDialogProps) {
  const router = useRouter()
  const [form, setForm] = useState<RoleFormData>(initialData ?? EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [search, setSearch] = useState('')

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return permissionGroups
    const q = search.toLowerCase()
    return permissionGroups
      .map((g) => ({
        ...g,
        permissions: g.permissions.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.permissions.length > 0)
  }, [permissionGroups, search])

  function togglePermission(permId: string) {
    setForm((f) => ({
      ...f,
      permissionIds: f.permissionIds.includes(permId)
        ? f.permissionIds.filter((id) => id !== permId)
        : [...f.permissionIds, permId],
    }))
  }

  function toggleModule(group: PermissionGroup, selectAll: boolean) {
    const ids = group.permissions.map((p) => p.id)
    setForm((f) => ({
      ...f,
      permissionIds: selectAll
        ? Array.from(new Set([...f.permissionIds, ...ids]))
        : f.permissionIds.filter((id) => !ids.includes(id)),
    }))
  }

  function getModuleState(group: PermissionGroup): 'all' | 'none' | 'partial' {
    const ids = group.permissions.map((p) => p.id)
    const selected = ids.filter((id) => form.permissionIds.includes(id)).length
    if (selected === 0) return 'none'
    if (selected === ids.length) return 'all'
    return 'partial'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})

    try {
      const url =
        mode === 'create' ? '/api/roles' : `/api/roles/${initialData?.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const body =
        mode === 'create'
          ? {
              code: form.code,
              name: form.name,
              description: form.description,
              permissionIds: form.permissionIds,
            }
          : {
              name: form.name,
              description: form.description,
              isActive: form.isActive,
              permissionIds: form.permissionIds,
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
        mode === 'create' ? 'Role berhasil dibuat' : 'Role berhasil diupdate',
      )
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  const totalSelected = form.permissionIds.length
  const totalPermissions = permissionGroups.reduce(
    (acc, g) => acc + g.permissions.length,
    0,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'p-0 gap-0 overflow-hidden flex flex-col',
          'w-screen h-[100dvh] max-w-none rounded-none',
          'sm:w-[95vw] sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-xl',
          'lg:max-w-3xl',
        )}
      >
        {/* Header */}
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-4 border-b shrink-0">
          <DialogTitle className="text-lg">
            {mode === 'create' ? 'Tambah Role Baru' : 'Edit Role'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {mode === 'create'
              ? 'Tentukan nama role dan pilih permission yang sesuai.'
              : `Edit role ${initialData?.name ?? ''}.`}
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-5 sm:p-6 space-y-5">
              {/* ==================== INFO CARD ==================== */}
              <div className="rounded-xl border bg-card p-4 sm:p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Informasi Role</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Data dasar untuk role ini.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {mode === 'create' && (
                    <div className="space-y-2">
                      <Label htmlFor="code" className="text-xs">
                        Kode Role{' '}
                        <span className="text-destructive">*</span>
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
                        className="font-mono text-sm"
                        placeholder="KASIR_BARU"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Huruf kapital, angka, underscore. Unik.
                      </p>
                      {fieldErrors.code?.map((m) => (
                        <p key={m} className="text-xs text-destructive">
                          {m}
                        </p>
                      ))}
                    </div>
                  )}

                  <div
                    className={cn(
                      'space-y-2',
                      mode === 'edit' && 'sm:col-span-2',
                    )}
                  >
                    <Label htmlFor="name" className="text-xs">
                      Nama Role <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      disabled={loading}
                      required
                      placeholder="Kasir Baru"
                    />
                    {fieldErrors.name?.map((m) => (
                      <p key={m} className="text-xs text-destructive">
                        {m}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs">
                    Deskripsi
                  </Label>
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    disabled={loading}
                    placeholder="Jelaskan fungsi role ini..."
                    rows={2}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              {/* ==================== PERMISSION CARD ==================== */}
              <div className="rounded-xl border bg-card overflow-hidden">
                {/* Permission header */}
                <div className="p-4 sm:p-5 border-b bg-muted/20 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold">Permission</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Pilih aksi yang diizinkan untuk role ini.
                      </p>
                    </div>
                    <Badge
                      variant={totalSelected > 0 ? 'default' : 'secondary'}
                      className="tabular-nums shrink-0"
                    >
                      {totalSelected} / {totalPermissions}
                    </Badge>
                  </div>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Cari permission..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-9"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Permission list */}
                {filteredGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Search className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Tidak ada permission yang cocok
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredGroups.map((group) => {
                      const state = getModuleState(group)
                      const selectedCount = group.permissions.filter((p) =>
                        form.permissionIds.includes(p.id),
                      ).length

                      return (
                        <div key={group.module}>
                          {/* Module header */}
                          <div className="flex items-center gap-3 px-4 sm:px-5 py-3 bg-muted/30">
                            <button
                              type="button"
                              onClick={() =>
                                toggleModule(group, state !== 'all')
                              }
                              disabled={loading}
                              className={cn(
                                'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                                state === 'all' &&
                                  'bg-primary border-primary text-primary-foreground',
                                state === 'partial' &&
                                  'bg-primary/60 border-primary text-primary-foreground',
                                state === 'none' &&
                                  'border-input bg-background hover:border-primary',
                              )}
                            >
                              {state === 'all' && (
                                <Check className="h-3 w-3" strokeWidth={3} />
                              )}
                              {state === 'partial' && (
                                <Minus className="h-3 w-3" strokeWidth={3} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                toggleModule(group, state !== 'all')
                              }
                              disabled={loading}
                              className="flex-1 text-left min-w-0"
                            >
                              <span className="font-semibold text-sm">
                                {group.label}
                              </span>
                            </button>
                            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                              {selectedCount}/{group.permissions.length}
                            </span>
                          </div>

                          {/* Permission items — horizontal */}
                          <div className="divide-y divide-border/40">
                            {group.permissions.map((perm) => {
                              const checked = form.permissionIds.includes(
                                perm.id,
                              )
                              return (
                                <label
                                  key={perm.id}
                                  className={cn(
                                    'flex items-center gap-3 px-4 sm:px-5 py-2.5 cursor-pointer transition-colors',
                                    checked
                                      ? 'bg-primary/5'
                                      : 'hover:bg-muted/30',
                                  )}
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() =>
                                      togglePermission(perm.id)
                                    }
                                    disabled={loading}
                                    className="shrink-0"
                                  />
                                  <span
                                    className={cn(
                                      'text-sm flex-1 min-w-0 truncate',
                                      checked && 'font-medium',
                                    )}
                                  >
                                    {perm.name}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground font-mono shrink-0 hidden sm:inline">
                                    {perm.code}
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
<div className="shrink-0 border-t bg-muted/30 px-5 sm:px-6 py-5">
  <div className="flex flex-row justify-end gap-2">
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
      {mode === 'create' ? 'Simpan Role' : 'Simpan Perubahan'}
    </Button>
  </div>
</div>
        </form>
      </DialogContent>
    </Dialog>
  )
}