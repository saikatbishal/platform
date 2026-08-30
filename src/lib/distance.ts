/**
 * Great-circle distance between two stations, in kilometres.
 *
 * This UNDERCOUNTS real journeys, because track curves and this is a straight
 * line over the surface of the earth. That is a deliberate v1 choice: label it
 * "as the crow flies" in the UI rather than presenting it as track distance.
 * A visible, explained approximation beats a silent wrong number.
 *
 * If you later want true track distance, trains.json in the DataMeet repo
 * carries route geometry you can measure along.
 */
const EARTH_RADIUS_KM = 6371.0088

export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** 1847.3 -> "1,847 km". Rounded, because false precision reads as a bug. */
export function formatKm(km: number): string {
  return `${Math.round(km).toLocaleString('en-IN')} km`
}
