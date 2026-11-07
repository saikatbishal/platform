import type { JourneyRoute } from '@/features/map/useJourneyRoutes.ts'
import type { Journey } from '@/types/index.ts'
import { tripSpan } from './trips.ts'

/**
 * A trip's numbers, derived from its journeys every time and never stored
 * (docs/features/trips/prd.md).
 *
 * States are the ones the routes run through — the same thing the map fills
 * in — not just the two ends: a Chennai–Howrah leg crosses Andhra Pradesh and
 * Odisha, and those count. A journey the map cannot route is counted as a
 * journey and as `notDrawn`, and adds nothing to the kilometres, because
 * 0 km is a distance and this is not one.
 */
export interface TripStats {
  journeys: number
  km: number
  states: number
  notDrawn: number
  span: { first: string; last: string } | null
}

export function tripStats(legs: readonly Journey[], routeById: ReadonlyMap<string, JourneyRoute>): TripStats {
  let km = 0
  let notDrawn = 0
  const states = new Set<string>()
  for (const j of legs) {
    const r = routeById.get(j.id)
    if (!r) { notDrawn++; continue }
    km += r.km
    for (const s of r.pointStates) states.add(s)
  }
  return { journeys: legs.length, km, states: states.size, notDrawn, span: tripSpan(legs) }
}

/** "4 journeys · 6,032 km · 8 states", in the words the list and the panel share. */
export function statsLine(s: TripStats): string {
  if (s.journeys === 0) return 'No journeys yet'
  const parts = [
    s.journeys === 1 ? '1 journey' : `${s.journeys} journeys`,
    `${Math.round(s.km).toLocaleString('en-IN')} km`,
    s.states === 1 ? '1 state' : `${s.states} states`,
  ]
  if (s.notDrawn > 0) parts.push(`${s.notDrawn} not drawn`)
  return parts.join(' · ')
}
