/**
 * Hitung jarak antara 2 titik koordinat (dalam meter).
 * Pakai formula Haversine.
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000 // radius bumi dalam meter

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2

  return 2 * R * Math.asin(Math.sqrt(a))
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Cek apakah posisi berada dalam radius lokasi.
 */
export function isWithinRadius(
  userLat: number,
  userLng: number,
  locationLat: number,
  locationLng: number,
  radiusMeters: number,
): { within: boolean; distance: number } {
  const distance = calculateDistance(
    userLat,
    userLng,
    locationLat,
    locationLng,
  )
  return {
    within: distance <= radiusMeters,
    distance,
  }
}