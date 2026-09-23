import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/lib/prisma'
import type { ListLocationsQuery } from '@/lib/validation/location'

export type LocationListItem = {
  id: string
  code: string
  name: string
  type: string
  address: string | null
  latitude: number
  longitude: number
  radiusMeters: number
  isActive: boolean
  isDefault: boolean
  userCount: number
  attendanceCount: number
  createdAt: Date
}

export type ListLocationsResult = {
  items: LocationListItem[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export async function listLocations(
  query: ListLocationsQuery,
): Promise<ListLocationsResult> {
  const { q, type, status, page, perPage } = query

  const where: Prisma.LocationWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { code: { contains: q, mode: 'insensitive' } },
            { address: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(type ? { type } : {}),
    ...(status === 'active' ? { isActive: true } : {}),
    ...(status === 'inactive' ? { isActive: false } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.location.count({ where }),
    prisma.location.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { isActive: 'desc' }, { name: 'asc' }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        address: true,
        latitude: true,
        longitude: true,
        radiusMeters: true,
        isActive: true,
        isDefault: true,
        createdAt: true,
        _count: {
          select: {
            attendances: true,
            defaultUsers: true,
          },
        },
      },
    }),
  ])

  return {
    items: items.map((l) => ({
      id: l.id,
      code: l.code,
      name: l.name,
      type: l.type,
      address: l.address,
      latitude: l.latitude,
      longitude: l.longitude,
      radiusMeters: l.radiusMeters,
      isActive: l.isActive,
      isDefault: l.isDefault,
      userCount: l._count.defaultUsers,
      attendanceCount: l._count.attendances,
      createdAt: l.createdAt,
    })),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

export async function getLocationDetail(identifier: string) {
  const location = await prisma.location.findFirst({
    where: {
      OR: [{ id: identifier }, { code: identifier }],
    },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      address: true,
      latitude: true,
      longitude: true,
      radiusMeters: true,
      isActive: true,
      isDefault: true,
      _count: {
        select: {
          attendances: true,
          defaultUsers: true,
        },
      },
    },
  })

  if (!location) return null

  return {
    id: location.id,
    code: location.code,
    name: location.name,
    type: location.type,
    address: location.address,
    latitude: location.latitude,
    longitude: location.longitude,
    radiusMeters: location.radiusMeters,
    isActive: location.isActive,
    isDefault: location.isDefault,
    userCount: location._count.defaultUsers,
    attendanceCount: location._count.attendances,
  }
}

/**
 * Ambil lokasi default (untuk absensi).
 */
export async function getDefaultLocation() {
  return prisma.location.findFirst({
    where: { isActive: true, isDefault: true },
    select: {
      id: true,
      code: true,
      name: true,
      latitude: true,
      longitude: true,
      radiusMeters: true,
    },
  })
}