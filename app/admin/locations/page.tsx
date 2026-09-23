import { requirePermission } from '@/lib/auth/context'
import { listLocations } from '@/lib/locations/queries'
import { listLocationsQuerySchema } from '@/lib/validation/location'
import { LocationsClient } from './locations-client'

export const metadata = {
  title: 'Lokasi',
}

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function LocationsPage({ searchParams }: PageProps) {
  await requirePermission('location.read')

  const raw = await searchParams
  const parsed = listLocationsQuerySchema.safeParse(raw)
  const query = parsed.success
    ? parsed.data
    : {
        q: '',
        type: '',
        status: 'all' as const,
        page: 1,
        perPage: 20,
      }

  const result = await listLocations(query)

  return <LocationsClient initialData={result} initialQuery={query} />
}