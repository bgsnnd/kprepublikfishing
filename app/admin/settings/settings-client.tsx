'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { SettingField } from './setting-field'
import type { SettingItem } from '@/lib/settings/queries'

type SettingsClientProps = {
  initialSettings: Record<string, SettingItem[]>
}

const CATEGORY_LABELS: Record<
  string,
  { label: string; description: string }
> = {
  attendance: {
    label: 'Absensi',
    description: 'Pengaturan jam kerja, GPS, dan aturan absensi.',
  },
  pos: {
    label: 'Kasir',
    description: 'Pengaturan penjualan dan pembayaran.',
  },
  payroll: {
    label: 'Penggajian',
    description: 'Pengaturan komponen dan periode gaji.',
  },
  general: {
    label: 'Umum',
    description: 'Pengaturan umum aplikasi.',
  },
}

const CATEGORY_ORDER = ['attendance', 'payroll', 'pos', 'general']

export function SettingsClient({ initialSettings }: SettingsClientProps) {
  const router = useRouter()

  // Urutin kategori sesuai CATEGORY_ORDER
  const categories = Object.keys(initialSettings).sort((a, b) => {
    const idxA = CATEGORY_ORDER.indexOf(a)
    const idxB = CATEGORY_ORDER.indexOf(b)
    if (idxA === -1 && idxB === -1) return a.localeCompare(b)
    if (idxA === -1) return 1
    if (idxB === -1) return -1
    return idxA - idxB
  })

  const [activeTab, setActiveTab] = useState(categories[0] ?? 'attendance')
  const [dirtyValues, setDirtyValues] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)

  const isDirty = Object.keys(dirtyValues).length > 0

  function handleChange(key: string, value: unknown) {
    setDirtyValues((prev) => ({ ...prev, [key]: value }))
  }

  function resetDirty() {
    setDirtyValues({})
    toast.info('Perubahan dibatalkan')
  }

  async function handleSave() {
    if (!isDirty) return

    setSaving(true)
    try {
      const settings = Object.entries(dirtyValues).map(([key, value]) => ({
        key,
        value,
      }))

      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Gagal menyimpan')
        return
      }

      toast.success('Pengaturan berhasil disimpan')
      setDirtyValues({})
      router.refresh()
    } catch {
      toast.error('Tidak dapat terhubung ke server')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Konfigurasi aplikasi. Semua perubahan langsung aktif tanpa deploy
            ulang.
          </p>
        </div>

        {isDirty && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetDirty}
              disabled={saving}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Simpan ({Object.keys(dirtyValues).length})
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start flex-wrap h-auto">
          {categories.map((cat) => {
            const meta = CATEGORY_LABELS[cat] ?? {
              label: cat,
              description: '',
            }
            const catDirtyCount = Object.keys(dirtyValues).filter((k) =>
              initialSettings[cat]?.some((s) => s.key === k),
            ).length

            return (
              <TabsTrigger key={cat} value={cat} className="gap-2">
                {meta.label}
                {catDirtyCount > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                    {catDirtyCount}
                  </span>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {categories.map((cat) => {
          const meta = CATEGORY_LABELS[cat] ?? {
            label: cat,
            description: '',
          }

          return (
            <TabsContent key={cat} value={cat} className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{meta.label}</CardTitle>
                  <CardDescription>{meta.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {initialSettings[cat].map((setting) => (
                    <SettingField
                      key={setting.key}
                      setting={setting}
                      value={
                        setting.key in dirtyValues
                          ? dirtyValues[setting.key]
                          : setting.value
                      }
                      onChange={(v) => handleChange(setting.key, v)}
                    />
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>

      {/* Floating save bar */}
      {isDirty && (
        <div className="fixed bottom-6 right-6 z-50 shadow-lg rounded-lg border bg-background p-3 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {Object.keys(dirtyValues).length} perubahan belum disimpan
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetDirty}
            disabled={saving}
          >
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Simpan
          </Button>
        </div>
      )}
    </div>
  )
}