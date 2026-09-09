import type { Journey } from '@/types/index.ts'

/**
 * Minutes between a journey's recorded departure and arrival, or `null` if
 * either is missing or the result isn't a real duration.
 *
 * A non-positive result means the day offset wasn't bumped for an overnight
 * arrival — that's a data-entry slip, not a journey that arrived before it
 * left, so it's treated the same as not having entered times at all rather
 * than shown as a negative number.
 */
export function journeyDurationMinutes(
  j: Pick<Journey, 'departureTime' | 'arrivalTime' | 'arrivalDayOffset'>,
): number | null {
  if (!j.departureTime || !j.arrivalTime) return null
  const [depH, depM] = j.departureTime.split(':').map(Number)
  const [arrH, arrM] = j.arrivalTime.split(':').map(Number)
  if (depH === undefined || depM === undefined || arrH === undefined || arrM === undefined) return null
  const minutes = (j.arrivalDayOffset * 24 + arrH) * 60 + arrM - (depH * 60 + depM)
  return minutes > 0 ? minutes : null
}

if (import.meta.env.DEV) {
  const base = { departureTime: null, arrivalTime: null, arrivalDayOffset: 0 }
  console.assert(
    journeyDurationMinutes({ ...base, departureTime: '18:30', arrivalTime: '21:00', arrivalDayOffset: 0 }) === 150,
    '[duration] same-day journey should be 2h30m',
  )
  console.assert(
    journeyDurationMinutes({ ...base, departureTime: '22:00', arrivalTime: '06:00', arrivalDayOffset: 1 }) === 480,
    '[duration] overnight journey should be 8h',
  )
  console.assert(
    journeyDurationMinutes({ ...base, departureTime: '10:00', arrivalTime: '10:00', arrivalDayOffset: 3 }) === 3 * 24 * 60,
    '[duration] multi-day journey should span full days',
  )
  console.assert(
    journeyDurationMinutes({ ...base, departureTime: '10:00', arrivalTime: '09:00', arrivalDayOffset: 0 }) === null,
    '[duration] forgetting to bump the day should read as unknown, not negative',
  )
  console.assert(
    journeyDurationMinutes({ ...base, departureTime: '10:00', arrivalTime: null, arrivalDayOffset: 0 }) === null,
    '[duration] missing arrival should read as unknown',
  )
}
