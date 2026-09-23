import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'

// ============================================================
// Get single setting
// ============================================================

export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  const setting = await prisma.setting.findUnique({
    where: { key },
    select: { value: true },
  })
  return (setting?.value as T) ?? null
}

/**
 * Cached version — 60 detik.
 * Pakai ini di API/halaman yang sering diakses.
 */
export const getCachedSetting = unstable_cache(
  async (key: string) => getSetting(key),
  ['setting'],
  { revalidate: 60, tags: ['settings'] },
)

// ============================================================
// Get settings by category
// ============================================================

export type SettingItem = {
  key: string
  value: unknown
  type: string
  label: string
  description: string | null
  category: string
}

export async function getSettingsByCategory(
  category: string,
): Promise<SettingItem[]> {
  const settings = await prisma.setting.findMany({
    where: { category, isActive: true },
    orderBy: { key: 'asc' },
    select: {
      key: true,
      value: true,
      type: true,
      label: true,
      description: true,
      category: true,
    },
  })

  return settings
}

// ============================================================
// Get all settings, grouped by category
// ============================================================

export async function getAllSettingsGrouped(): Promise<
  Record<string, SettingItem[]>
> {
  const settings = await prisma.setting.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
    select: {
      key: true,
      value: true,
      type: true,
      label: true,
      description: true,
      category: true,
    },
  })

  const grouped: Record<string, SettingItem[]> = {}
  for (const s of settings) {
    if (!grouped[s.category]) grouped[s.category] = []
    grouped[s.category].push(s)
  }

  return grouped
}

// ============================================================
// Update setting
// ============================================================

export async function updateSetting(params: {
  key: string
  value: unknown
  updatedById: string
}): Promise<void> {
  const { key, value, updatedById } = params

  await prisma.setting.update({
    where: { key },
    data: {
      value: value as object,
      updatedById,
    },
  })
}

// ============================================================
// Update many settings sekaligus (bulk)
// ============================================================

export async function updateSettingsBulk(params: {
  settings: { key: string; value: unknown }[]
  updatedById: string
}): Promise<void> {
  const { settings, updatedById } = params

  await prisma.$transaction(
    settings.map((s) =>
      prisma.setting.update({
        where: { key: s.key },
        data: {
          value: s.value as object,
          updatedById,
        },
      }),
    ),
  )
}