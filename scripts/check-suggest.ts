/**
 * Checks the station suggestions an empty station field offers
 * (src/features/journeys/suggestStations.ts).
 *
 * No test framework, as with check-merge.ts and check-search.ts: the function
 * is pure, so it runs under plain node.
 *
 *   node scripts/check-suggest.ts
 */

import { HALF_LIFE_DAYS, suggestStations } from '../src/features/journeys/suggestStations.ts'

type J = Parameters<typeof suggestStations>[0][number]

let failed = 0
const check = (name: string, ok: boolean, got?: unknown) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `  — got ${JSON.stringify(got)}`}`)
  if (!ok) failed++
}

const NOW = Date.parse('2026-10-11T00:00:00Z')
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString().slice(0, 10)

let n = 0
const j = (fromCode: string, toCode: string, ago = 10): J => ({
  id: `j${++n}`,
  fromCode,
  toCode,
  travelledOn: daysAgo(ago),
  trainNumber: null,
  note: null,
  distanceKm: null,
  departureTime: null,
  arrivalTime: null,
  arrivalDayOffset: 0,
})

// ---- nothing to go on -------------------------------------------------------
check('no journeys, no suggestions — nothing is made up', suggestStations([], null, NOW).length === 0)

// ---- the general list --------------------------------------------------------
{
  const log = [
    j('HWH', 'KPD'), j('KPD', 'HWH'), j('HWH', 'KPD'), j('KPD', 'HWH'),
    j('HWH', 'PURI'), j('PURI', 'HWH'),
    j('SBC', 'MAS'),
    j('NDLS', 'HWH'),
  ]
  const got = suggestStations(log, null, NOW)
  check('every end counts: HWH (7 ends) leads, KPD (4) next', got[0] === 'HWH' && got[1] === 'KPD', got)
  check('four at most, the spec\'s "same four stations"', got.length === 4, got)
  check('no station twice', new Set(got).size === got.length, got)
  check('a tie is settled by code, so the order never shuffles', JSON.stringify(got) === JSON.stringify(suggestStations([...log].reverse(), null, NOW)), got)
}

// ---- recency ------------------------------------------------------------------
{
  // Three trips to Mumbai two years ago against one to Puri last week.
  const log = [j('HWH', 'CSMT', 730), j('CSMT', 'HWH', 728), j('HWH', 'CSMT', 700), j('HWH', 'PURI', 7)]
  const got = suggestStations(log, null, NOW)
  check('a station from last week beats three trips from two years ago', got.indexOf('PURI') < got.indexOf('CSMT'), got)
  // …but a habit is not erased by one trip somewhere else.
  const habit = [j('HWH', 'KPD', 40), j('KPD', 'HWH', 35), j('HWH', 'KPD', 30), j('SBC', 'MYS', 1)]
  const h = suggestStations(habit, null, NOW)
  check('one new trip does not displace a month-old habit', h.indexOf('KPD') < h.indexOf('MYS'), h)
  const half = suggestStations([j('AAA', 'BBB', HALF_LIFE_DAYS), j('CCC', 'DDD', 0)], null, NOW)
  check('a journey a half-life old weighs less than one from today', half.indexOf('CCC') < half.indexOf('AAA'), half)
}

// ---- To follows From ------------------------------------------------------------
{
  const log = [
    j('SBC', 'MAS'), j('MAS', 'SBC'), j('SBC', 'MAS'), j('MAS', 'SBC'), j('SBC', 'MYS'), // heavy, but not Howrah's
    j('HWH', 'PURI'),
    j('KPD', 'HWH'), // arriving at Howrah is a Howrah route too
  ]
  const got = suggestStations(log, 'HWH', NOW)
  check('with From = HWH, its own routes come first', got[0] === 'KPD' || got[0] === 'PURI', got)
  check('both directions count: KPD (KPD → HWH) is offered', got.slice(0, 2).includes('KPD'), got)
  check('the general list fills the rest', got.length === 4 && got.slice(2).every((c) => c === 'SBC' || c === 'MAS'), got)
  check('the anchor itself is never offered', !got.includes('HWH'), got)
}

// ---- the other field's station ---------------------------------------------------
{
  const log = [j('HWH', 'KPD'), j('HWH', 'KPD'), j('HWH', 'PURI')]
  const got = suggestStations(log, 'KPD', NOW)
  check('never offers the station already in the other field', !got.includes('KPD'), got)
  check('an anchor with no routes of its own still gets the general list', suggestStations(log, 'GHY', NOW).length === 3)
}

// ---- odd input -------------------------------------------------------------------
{
  const future = [{ ...j('HWH', 'PURI'), travelledOn: '2027-01-01' }, j('SBC', 'MAS', 1)]
  const got = suggestStations(future, null, NOW)
  check('a date after today counts as today, not as more than a journey', got.length === 4, got)
  const bad = [{ ...j('HWH', 'PURI'), travelledOn: 'not a date' }, j('SBC', 'MAS')]
  check('an unreadable date is skipped, not counted as NaN', JSON.stringify(suggestStations(bad, null, NOW)) === '["MAS","SBC"]', suggestStations(bad, null, NOW))
}

console.log(failed === 0 ? '\nall checks passed' : `\n${failed} FAILED`)
process.exit(failed === 0 ? 0 : 1)
