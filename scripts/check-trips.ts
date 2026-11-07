/**
 * Checks the trips logic that can be wrong quietly — which trip the add form
 * starts on, which journeys are offered as one trip, how the list is ordered.
 * No test framework here (docs/00-decisions.md), so this runs the pure module
 * directly, like check-merge.ts:
 *
 *   node scripts/check-trips.ts
 *
 * The example is the author's own: Chennai to Delhi by Howrah, a week in
 * Himachal by road, back by Sealdah and Howrah.
 */

import {
  defaultTripFor, formatSpan, journeysByTrip, samePlaceFrom, searchTrips, sortTrips, suggestTrips,
  suggestionKey, unsortedJourneys,
} from '../src/features/trips/trips.ts'
import type { Journey, Trip } from '../src/types/index.ts'

const STATIONS = new Map([
  ['MAS', { lat: 13.0827, lon: 80.275 }],
  ['HWH', { lat: 22.5835, lon: 88.3426 }],
  ['SDAH', { lat: 22.5679, lon: 88.3712 }],
  ['NDLS', { lat: 28.6421, lon: 77.2196 }],
  ['NZM', { lat: 28.5885, lon: 77.2537 }],
  ['PURI', { lat: 19.8135, lon: 85.8312 }],
  ['KPD', { lat: 12.9716, lon: 79.1325 }],
  ['BDC', { lat: 22.9005, lon: 88.3957 }],
])
const samePlace = samePlaceFrom(STATIONS)

let n = 0
const j = (over: Partial<Journey>): Journey => ({
  id: `j${++n}`,
  fromCode: 'MAS', toCode: 'HWH', travelledOn: '2026-10-03',
  trainNumber: null, note: null, distanceKm: null,
  departureTime: null, arrivalTime: null, arrivalDayOffset: 0, tripId: null,
  ...over,
})
const trip = (over: Partial<Trip>): Trip => ({
  id: `t${++n}`, name: 'Himachal trip', note: null, createdAt: '2026-10-01T09:00:00.000Z', ...over,
})

let failed = 0
const check = (name: string, ok: boolean) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}`)
  if (!ok) failed++
}

const himachal = [
  j({ fromCode: 'MAS', toCode: 'HWH', travelledOn: '2026-10-03' }),
  j({ fromCode: 'HWH', toCode: 'NDLS', travelledOn: '2026-10-05' }),
  j({ fromCode: 'NDLS', toCode: 'SDAH', travelledOn: '2026-10-13' }),
  j({ fromCode: 'HWH', toCode: 'MAS', travelledOn: '2026-10-15' }),
]

// ── samePlace ───────────────────────────────────────────────────────────────
check('Howrah and Sealdah are one place', samePlace('HWH', 'SDAH'))
check('New Delhi and Nizamuddin are one place', samePlace('NDLS', 'NZM'))
check('Howrah and Bandel are not', !samePlace('HWH', 'BDC'))
check('an unknown code only matches itself', samePlace('XXX', 'XXX') && !samePlace('XXX', 'HWH'))

// ── suggestions ─────────────────────────────────────────────────────────────
{
  const s = suggestTrips({ journeys: himachal, trips: [], samePlace, dismissed: new Set() })
  check('the four Himachal legs are offered as one trip', s.length === 1 && s[0]?.journeys.length === 4)
  check('…in the order they were travelled', s[0]?.journeys.map((x) => x.travelledOn).join() === '2026-10-03,2026-10-05,2026-10-13,2026-10-15')
}
{
  // A local train in the middle does not break the chain, and is left alone.
  const local = j({ fromCode: 'HWH', toCode: 'BDC', travelledOn: '2026-10-04' })
  const s = suggestTrips({ journeys: [...himachal, local], trips: [], samePlace, dismissed: new Set() })
  check('a leg that does not continue the chain is skipped, not fatal', s.some((x) => x.journeys.length === 4 && !x.journeys.includes(local)))
}
{
  const late = [himachal[0]!, j({ fromCode: 'HWH', toCode: 'NDLS', travelledOn: '2026-10-25' })]
  const s = suggestTrips({ journeys: late, trips: [], samePlace, dismissed: new Set() })
  check('legs more than 14 days apart are not one trip', s.length === 0)
}
{
  const t = trip({})
  const grouped = himachal.map((x) => ({ ...x, tripId: t.id }))
  check('journeys already in a trip are not offered', suggestTrips({ journeys: grouped, trips: [t], samePlace, dismissed: new Set() }).length === 0)
  const stray = himachal.map((x) => ({ ...x, tripId: 'deleted-elsewhere' }))
  check('…but ones pointing at a trip that is gone are', suggestTrips({ journeys: stray, trips: [t], samePlace, dismissed: new Set() }).length === 1)
}
{
  const key = suggestionKey(himachal.map((x) => x.id))
  check('"Not a trip" is remembered', suggestTrips({ journeys: himachal, trips: [], samePlace, dismissed: new Set([key]) }).length === 0)
  const more = [...himachal, j({ fromCode: 'MAS', toCode: 'KPD', travelledOn: '2026-10-16' })]
  check('…until the chain grows a leg', suggestTrips({ journeys: more, trips: [], samePlace, dismissed: new Set([key]) }).length === 1)
}
{
  const single = suggestTrips({ journeys: [himachal[0]!], trips: [], samePlace, dismissed: new Set() })
  check('one journey alone is not a trip', single.length === 0)
}

// ── the add form's starting trip ────────────────────────────────────────────
const at = (journeys: Journey[], trips: Trip[], travelledOn: string, fromCode: string | null = null, toCode: string | null = null) =>
  defaultTripFor({ journeys, trips, travelledOn, fromCode, toCode, samePlace })
{
  const t = trip({ createdAt: '2026-10-01T09:00:00.000Z' })
  const d = at([], [t], '2026-10-03', 'MAS', 'HWH')
  check('an empty trip made two days ago is where leg one starts', d?.tripId === t.id && d.reason === 'empty')
  check('…but not a month later', at([], [t], '2026-11-02') === null)
  check('…nor for a backfill from long before it', at([], [t], '2026-08-01') === null)
}
{
  const t = trip({})
  const legs = himachal.slice(0, 2).map((x) => ({ ...x, tripId: t.id }))
  const d = at(legs, [t], '2026-10-13', 'NDLS', 'SDAH')
  check('the return leg, eight days on from the same city, joins the trip', d?.tripId === t.id && d.reason === 'after')
  check('a journey leaving from somewhere else does not', at(legs, [t], '2026-10-13', 'PURI', 'HWH') === null)
  check('inside the trip’s dates it always does', at(legs, [t], '2026-10-04', 'PURI', 'HWH')?.reason === 'inside')
  const before = at(legs, [t], '2026-10-01', 'KPD', 'MAS')
  check('a backfilled leg that arrives where the trip began joins it', before?.tripId === t.id && before.reason === 'before')
}
{
  const older = trip({ name: 'Puri with Ma', createdAt: '2026-08-01T00:00:00.000Z' })
  const newer = trip({ name: 'Himachal trip', createdAt: '2026-10-01T00:00:00.000Z' })
  const puri = [j({ fromCode: 'HWH', toCode: 'PURI', travelledOn: '2026-10-02', tripId: older.id })]
  const d = at(puri, [older, newer], '2026-10-02', 'HWH', 'PURI')
  check('the trip whose dates it falls inside beats a nearby empty one', d?.tripId === older.id)
}
check('no date, no default', at([], [trip({})], '') === null)

// ── ordering and display ────────────────────────────────────────────────────
{
  const puri = trip({ name: 'Puri with Ma', createdAt: '2026-08-10T00:00:00.000Z' })
  const him = trip({ name: 'Himachal trip', createdAt: '2026-10-01T00:00:00.000Z' })
  const planned = trip({ name: 'Varanasi in December', createdAt: '2026-10-20T00:00:00.000Z' })
  const journeys = [
    j({ fromCode: 'HWH', toCode: 'PURI', travelledOn: '2026-08-14', tripId: puri.id }),
    ...himachal.map((x) => ({ ...x, tripId: him.id })),
  ]
  const byTrip = journeysByTrip(journeys, [puri, him, planned])
  check('an empty trip has an empty list, not a missing one', byTrip.get(planned.id)?.length === 0)
  const order = sortTrips([puri, him, planned], byTrip).map((t) => t.name).join(' / ')
  check('trips list: newest first, an empty one by when it was made', order === 'Varanasi in December / Himachal trip / Puri with Ma')
  check('unsorted is everything in no trip', unsortedJourneys(journeys, [puri, him]).length === 0 && unsortedJourneys(journeys, [puri]).length === 4)
}
check('span within a month', formatSpan({ first: '2026-10-03', last: '2026-10-15' }) === '3–15 Oct 2026')
check('span across months', formatSpan({ first: '2026-09-28', last: '2026-10-04' }) === '28 Sep – 4 Oct 2026')
check('span across years', formatSpan({ first: '2025-12-28', last: '2026-01-04' }) === '28 Dec 2025 – 4 Jan 2026')
check('a one-day trip', formatSpan({ first: '2026-03-09', last: '2026-03-09' }) === '9 Mar 2026')

// ── quick find ──────────────────────────────────────────────────────────────
{
  const trips = [trip({ name: 'Himachal trip' }), trip({ name: 'Puri with Ma', note: 'Rath Yatra, finally' })]
  const h = searchTrips(trips, 'him')
  check('"him" finds Himachal, marked from the start', h.length === 1 && h[0]?.mark?.start === 0 && h[0]?.mark?.end === 3)
  check('a note can find a trip', searchTrips(trips, 'rath')[0]?.trip.name === 'Puri with Ma')
  check('every term must match', searchTrips(trips, 'him puri').length === 0)
  check('an empty query finds no trips', searchTrips(trips, '  ').length === 0)
}

console.log(failed === 0 ? '\nall checks passed' : `\n${failed} FAILED`)
process.exit(failed === 0 ? 0 : 1)
