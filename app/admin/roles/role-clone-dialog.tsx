/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type RoleCloneDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceRole: { id: string; code: string; name: string }
}

export function RoleCloneDialog({
  open,
  onOpenChange,
  sourceRole,
}: RoleCloneDialogProps) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (open) {
      setCode(`${sourceRole.code}_COPY`)
      setName(`${sourceRole.name} (Copy)`)
      setFieldErrors({})
    }
  }, [open, sourceRole])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})

    try {
      const res = await fetch(`/api/roles/${sourceRole.id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal clone role')
        if (json.error?.fields) setFieldErrors(json.error.fields)
        return
      }

      toast.success('Role berhasil di-clone')
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clone Role</DialogTitle>
          <DialogDescription>
            Duplikat role <strong>{sourceRole.name}</strong> beserta
            permission-nya ke role baru.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clone-code">Kode Role Baru</Label>
            <Input
              id="clone-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={loading}
              required
              className="font-mono"
            />
            {fieldErrors.code?.map((m) => (
              <p key={m} className="text-xs text-destructive">{m}</p>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="clone-name">Nama Role Baru</Label>
            <Input
              id="clone-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
            {fieldErrors.name?.map((m) => (
              <p key={m} className="text-xs text-destructive">{m}</p>
            ))}
          </div>

          <DialogFooter>
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
              Clone
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}