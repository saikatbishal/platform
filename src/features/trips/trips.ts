import type { Journey, Trip } from '@/types/index.ts'
// Relative, not `@/`, on purpose: these two are runtime imports, and this
// module is run directly under node by scripts/check-trips.ts, which knows
// nothing of Vite's alias. Type-only imports are erased, so those can use it.
import { haversineKm } from '../../lib/distance.ts'
import { foldTerms } from '../journeys/searchJourneys.ts'

/**
 * Trips, as pure functions — docs/features/trips/prd.md.
 *
 * Nothing here touches the DOM, storage or React, for the same reason
 * `mergeJourneys.ts` doesn't: the parts of this feature that can be wrong
 * quietly — which trip the add form starts on, which journeys get offered as
 * one trip — are checked by `scripts/check-trips.ts` rather than trusted.
 */

/**
 * How far apart, in days, two things can be and still belong to one trip.
 * The author's number (29 Oct 2026): a week away at the far end of a trip has
 * to fit, with room to spare.
 */
export const TRIP_WINDOW_DAYS = 14

/**
 * Two stations closer than this are one place, for chaining legs.
 *
 * Exact codes would miss the commonest real trip: arrive at Howrah, leave
 * from Sealdah; arrive at New Delhi, leave from Nizamuddin. A big city's
 * terminals sit 3–15 km apart. 25 km keeps all of them and stays clear of the
 * next town down the line.
 */
export const SAME_PLACE_KM = 25

/** Whether two station codes are the same place to change trains at. */
export type SamePlace = (a: string, b: string) => boolean

/**
 * `SamePlace` from whatever station lookup is to hand. A code the lookup does
 * not know only matches itself — distance is unknown, not zero.
 */
export function samePlaceFrom(
  byCode: ReadonlyMap<string, { lat: number; lon: number }> | null,
): SamePlace {
  return (a, b) => {
    if (a === b) return true
    const sa = byCode?.get(a), sb = byCode?.get(b)
    return sa !== undefined && sb !== undefined && haversineKm(sa, sb) <= SAME_PLACE_KM
  }
}

/** Whole days since the epoch, for an ISO date or the date part of a timestamp. */
export function dayNumber(iso: string): number {
  const y = Number(iso.slice(0, 4)), m = Number(iso.slice(5, 7)), d = Number(iso.slice(8, 10))
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
}

/** Oldest first; a same-day pair by departure time, then in the order given. */
export function byTravelDate(a: Journey, b: Journey): number {
  return a.travelledOn.localeCompare(b.travelledOn) ||
    (a.departureTime ?? '').localeCompare(b.departureTime ?? '')
}

/**
 * Each trip's journeys, oldest first — including an empty list for a trip
 * with none, because empty is a real state here, not a missing key.
 */
export function journeysByTrip(
  journeys: readonly Journey[],
  trips: readonly Trip[],
): Map<string, Journey[]> {
  const out = new Map<string, Journey[]>(trips.map((t) => [t.id, []]))
  for (const j of journeys) if (j.tripId !== null) out.get(j.tripId)?.push(j)
  for (const list of out.values()) list.sort(byTravelDate)
  return out
}

/**
 * Journeys in no trip. A `tripId` that points at no trip counts as none —
 * the trip was deleted on another device, or the row was written by hand —
 * so nothing is ever unreachable from the Unsorted row.
 */
export function unsortedJourneys(journeys: readonly Journey[], trips: readonly Trip[]): Journey[] {
  const ids = new Set(trips.map((t) => t.id))
  return journeys.filter((j) => j.tripId === null || !ids.has(j.tripId)).sort(byTravelDate)
}

/** First and last travel dates, or null for a trip with no journeys yet. */
export function tripSpan(legs: readonly Journey[]): { first: string; last: string } | null {
  if (legs.length === 0) return null
  let first = legs[0]!.travelledOn, last = first
  for (const j of legs) {
    if (j.travelledOn < first) first = j.travelledOn
    if (j.travelledOn > last) last = j.travelledOn
  }
  return { first, last }
}

/**
 * The trips list's order: newest travel first. A trip with no journeys is
 * placed by the day it was made — which puts the one planned this week at
 * the top, where the person who just made it will look for it.
 */
export function sortTrips(trips: readonly Trip[], byTrip: ReadonlyMap<string, readonly Journey[]>): Trip[] {
  const key = (t: Trip) => tripSpan(byTrip.get(t.id) ?? [])?.last ?? t.createdAt.slice(0, 10)
  return [...trips].sort((a, b) => key(b).localeCompare(key(a)) || b.createdAt.localeCompare(a.createdAt))
}

/** Why the add form started on a trip — said under the field, never silent. */
export type TripDefault =
  | { tripId: string; reason: 'inside' }
  | { tripId: string; reason: 'after'; lastLeg: string }
  | { tripId: string; reason: 'before'; firstLeg: string }
  | { tripId: string; reason: 'empty'; madeOn: string }

/**
 * The trip a new journey most likely belongs to, or null.
 *
 * A trip gets logged leg by leg, in the order the legs happen or backfilled
 * afterwards in any order, so the second leg should cost zero taps — and so
 * should the first, when the trip was made before anyone set off. In order
 * of evidence:
 *
 * - **Inside** a trip's dates: it is that trip's.
 * - **After** its last leg, within the window, and leaving from where that
 *   leg arrived: the next leg.
 * - **Before** its first leg, within the window, and arriving where that leg
 *   left from: the leg before, being backfilled.
 * - **An empty trip** made within the window of this journey's date: the
 *   trip someone made for exactly this.
 *
 * "Within the window" alone is not enough after or before a trip — a commute
 * the week after Puri is not part of Puri — so those two also need the
 * stations to chain. Unknown stations (`from`/`to` not picked yet) do not
 * block it: the form recomputes as they are picked.
 *
 * Several candidates: the nearest in days wins, then the most recently made.
 */
export function defaultTripFor(args: {
  journeys: readonly Journey[]
  trips: readonly Trip[]
  travelledOn: string
  fromCode: string | null
  toCode: string | null
  samePlace: SamePlace
}): TripDefault | null {
  const { journeys, trips, travelledOn, fromCode, toCode, samePlace } = args
  if (travelledOn === '') return null
  const t = dayNumber(travelledOn)
  const byTrip = journeysByTrip(journeys, trips)

  let best: { d: TripDefault; days: number; made: string } | null = null
  const offer = (d: TripDefault, days: number, made: string) => {
    if (!best || days < best.days || (days === best.days && made > best.made)) best = { d, days, made }
  }

  for (const trip of trips) {
    const legs = byTrip.get(trip.id) ?? []
    const span = tripSpan(legs)
    if (!span) {
      const days = Math.abs(t - dayNumber(trip.createdAt))
      if (days <= TRIP_WINDOW_DAYS) offer({ tripId: trip.id, reason: 'empty', madeOn: trip.createdAt.slice(0, 10) }, days, trip.createdAt)
      continue
    }
    const first = dayNumber(span.first), last = dayNumber(span.last)
    if (t >= first && t <= last) {
      offer({ tripId: trip.id, reason: 'inside' }, 0, trip.createdAt)
    } else if (t > last && t - last <= TRIP_WINDOW_DAYS) {
      const lastLeg = legs[legs.length - 1]!
      if (fromCode === null || samePlace(lastLeg.toCode, fromCode)) {
        offer({ tripId: trip.id, reason: 'after', lastLeg: lastLeg.travelledOn }, t - last, trip.createdAt)
      }
    } else if (t < first && first - t <= TRIP_WINDOW_DAYS) {
      const firstLeg = legs[0]!
      if (toCode === null || samePlace(toCode, firstLeg.fromCode)) {
        offer({ tripId: trip.id, reason: 'before', firstLeg: firstLeg.travelledOn }, first - t, trip.createdAt)
      }
    }
  }
  return (best as { d: TripDefault } | null)?.d ?? null
}

/** Journeys that look like one trip, offered — never applied. */
export interface TripSuggestion {
  /** Sorted journey ids, joined. What "Not a trip" remembers, so a dismissed
      chain stays dismissed — and one that grows a leg is asked about again. */
  key: string
  /** Oldest first: the order the chain was travelled in. */
  journeys: Journey[]
}

export const suggestionKey = (ids: readonly string[]) => [...ids].sort().join(',')

/**
 * Chains of journeys in no trip: each leg leaves from where the last one
 * arrived, within the window of it. The chain is a far stronger signal than
 * dates alone, and it catches the return leg — the week in Himachal sits
 * between NDLS arriving and NDLS leaving, and the chain bridges it.
 *
 * A journey that does not continue the chain (a local train on day three) is
 * skipped over rather than breaking it, and is free to start a chain of its
 * own. Where two journeys could both continue it — the day trip to Bandel and
 * the Rajdhani to Delhi both leave Howrah — the one that leads on further is
 * taken, so a side trip cannot cut the real one short. Two legs make a trip:
 * a there-and-back is the commonest one there is.
 *
 * Newest chain first, because the trip just finished is the one being thought
 * about.
 */
export function suggestTrips(args: {
  journeys: readonly Journey[]
  trips: readonly Trip[]
  samePlace: SamePlace
  dismissed: ReadonlySet<string>
}): TripSuggestion[] {
  const { journeys, trips, samePlace, dismissed } = args
  const free = unsortedJourneys(journeys, trips)
  const day = free.map((j) => dayNumber(j.travelledOn))

  // Which later journeys could follow each one — sorted by date, so this is
  // a DAG — and how many legs the longest chain from each one runs to.
  const follows: number[][] = free.map((a, i) => {
    const out: number[] = []
    for (let k = i + 1; k < free.length; k++) {
      if (day[k]! - day[i]! > TRIP_WINDOW_DAYS) break
      if (samePlace(a.toCode, free[k]!.fromCode)) out.push(k)
    }
    return out
  })
  const reach = new Array<number>(free.length).fill(1)
  for (let i = free.length - 1; i >= 0; i--) {
    for (const k of follows[i]!) reach[i] = Math.max(reach[i]!, 1 + reach[k]!)
  }

  const used = new Set<number>()
  const chains: Journey[][] = []
  for (let i = 0; i < free.length; i++) {
    if (used.has(i)) continue
    const chain = [free[i]!]
    used.add(i)
    for (let at = i; ;) {
      let best = -1
      for (const k of follows[at]!) if (!used.has(k) && (best < 0 || reach[k]! > reach[best]!)) best = k
      if (best < 0) break
      chain.push(free[best]!)
      used.add(best)
      at = best
    }
    if (chain.length >= 2) chains.push(chain)
  }

  return chains
    .map((c) => ({ key: suggestionKey(c.map((j) => j.id)), journeys: c }))
    .filter((s) => !dismissed.has(s.key))
    .reverse()
}

/** Half-open range into a trip's name, for the `<mark>` quick find draws. */
export interface TripHit {
  trip: Trip
  mark: { start: number; end: number } | null
  score: number
}

/**
 * Trips whose name (or note) has every term in it — quick find's first group.
 * Folded the way journey search folds, so "himach" means the same thing in
 * both. A word that starts with the term ranks above one that merely contains
 * it; newest first after that.
 */
export function searchTrips(trips: readonly Trip[], query: string): TripHit[] {
  const terms = foldTerms(query)
  if (terms.length === 0) return []
  const hits: TripHit[] = []
  for (const trip of trips) {
    const name = trip.name.toLowerCase()
    const hay = `${name} ${trip.note?.toLowerCase() ?? ''}`
    let score = 0, ok = true
    for (const term of terms) {
      if (wordStart(name, term) >= 0) score += 2
      else if (hay.includes(term)) score += 1
      else { ok = false; break }
    }
    if (!ok) continue
    let mark: TripHit['mark'] = null
    for (const term of terms) {
      let at = wordStart(name, term)
      if (at < 0) at = name.indexOf(term)
      if (at >= 0 && (!mark || at < mark.start)) mark = { start: at, end: at + term.length }
    }
    hits.push({ trip, mark, score })
  }
  return hits.sort((a, b) => b.score - a.score || b.trip.createdAt.localeCompare(a.trip.createdAt))
}

/** Where `term` starts a word of the already-lowercased `text`, or -1. */
function wordStart(text: string, term: string): number {
  let i = text.indexOf(term)
  while (i >= 0) {
    if (!/[a-z0-9]/.test(text.charAt(i - 1))) return i
    i = text.indexOf(term, i + 1)
  }
  return -1
}

/** "3–15 Oct 2026", "28 Dec 2025 – 4 Jan 2026", "9 Mar 2026". */
export function formatSpan(span: { first: string; last: string }): string {
  const parts = (iso: string) => ({
    d: Number(iso.slice(8, 10)),
    m: MONTHS[Number(iso.slice(5, 7)) - 1] ?? '',
    y: iso.slice(0, 4),
  })
  const a = parts(span.first), b = parts(span.last)
  if (span.first === span.last) return `${a.d} ${a.m} ${a.y}`
  if (a.y !== b.y) return `${a.d} ${a.m} ${a.y} – ${b.d} ${b.m} ${b.y}`
  if (a.m !== b.m) return `${a.d} ${a.m} – ${b.d} ${b.m} ${b.y}`
  return `${a.d}–${b.d} ${b.m} ${b.y}`
}

/** "5 Oct" — this year's dates do not print the year. */
export function formatDay(iso: string, thisYear: string): string {
  const d = Number(iso.slice(8, 10)), m = MONTHS[Number(iso.slice(5, 7)) - 1] ?? ''
  return iso.slice(0, 4) === thisYear ? `${d} ${m}` : `${d} ${m} ${iso.slice(0, 4)}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
