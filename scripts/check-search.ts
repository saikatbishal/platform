/**
 * Checks quick find's matcher against the PRD's ranking table
 * (docs/features/quick-find/prd.md §6).
 *
 * No test framework, as with check-merge.ts: the matcher is pure — no DOM, no
 * `import.meta.env` — so it runs under plain node.
 *
 *   node --experimental-strip-types scripts/check-search.ts
 */

import { clipNote, searchJourneys } from '../src/features/journeys/searchJourneys.ts'

type J = Parameters<typeof searchJourneys>[0][number]

let n = 0
const j = (over: Partial<J>): J => ({
  id: `j${++n}`,
  fromCode: 'NDLS',
  toCode: 'HWH',
  travelledOn: '2026-09-03',
  trainNumber: null,
  note: null,
  distanceKm: 1305,
  departureTime: null,
  arrivalTime: null,
  arrivalDayOffset: 0,
  ...over,
})

const byCode = new Map([
  ['NDLS', { name: 'New Delhi', state: 'Delhi' }],
  ['HWH', { name: 'Howrah Jn', state: 'West Bengal' }],
  ['YPR', { name: 'Yesvantpur Jn', state: 'Karnataka' }],
  ['MAS', { name: 'Chennai Central', state: 'Tamil Nadu' }],
  ['ERS', { name: 'Ernakulam Jn', state: 'Kerala' }],
  ['TVC', { name: 'Thiruvananthapuram Central', state: 'Kerala' }],
  ['GHY', { name: 'Guwahati', state: 'Assam' }],
])

const rajdhani = j({ trainNumber: '12302', note: 'Top bunk. Nobody slept past Dhanbad.' })
const bangalore = j({ fromCode: 'YPR', toCode: 'MAS', travelledOn: '2026-08-12' })
const kerala = j({ fromCode: 'ERS', toCode: 'TVC', travelledOn: '2025-12-21', trainNumber: '12626' })
const assam = j({ fromCode: 'HWH', toCode: 'GHY', travelledOn: '2025-03-09', note: 'With Ma. Tea at New Jalpaiguri.' })
const log = [bangalore, assam, rajdhani, kerala]

const ids = (query: string, lookup: typeof byCode | null = byCode) =>
  searchJourneys(log, query, lookup).hits.map((h) => h.journey.id)
const hit = (query: string, journey: J) =>
  searchJourneys(log, query, byCode).hits.find((h) => h.journey.id === journey.id)

let failed = 0
const check = (name: string, ok: boolean) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}`)
  if (!ok) failed++
}

// No query: the log, newest first, nothing marked.
{
  const s = searchJourneys(log, '   ', byCode)
  check('blank query returns everything, newest first',
    s.terms.length === 0 && s.hits.map((h) => h.journey.id).join() === [rajdhani, bangalore, kerala, assam].map((x) => x.id).join())
  check('blank query scores and marks nothing', s.hits.every((h) => h.score === 0 && h.fromNameMark === null))
}

// Each tier, top to bottom.
check('tier 6: exact code finds the journey and marks the code',
  ids('ypr').join() === bangalore.id && hit('ypr', bangalore)?.fromCodeMarked === true)
check('tier 5: a word of a name — "central" finds Chennai Central',
  ids('central').includes(bangalore.id) && hit('central', bangalore)?.score === 5)
check('tier 5 beats tier 0: "chen" scores 5, infix "hen" scores 0',
  hit('chen', bangalore)?.score === 5 && hit('hen', bangalore)?.score === 0)
check('tier 4: train prefix marks from the first digit',
  hit('1230', rajdhani)?.trainMark?.start === 0 && hit('1230', rajdhani)?.trainMark?.end === 4)
check('tier 3: a state finds a station whose name lacks it, and says so',
  ids('kerala').join() === kerala.id && hit('kerala', kerala)?.matchedStates[0]?.name === 'Kerala')
check('a state already visible in a name is not repeated', (hit('delhi', rajdhani)?.matchedStates.length ?? -1) === 0)
check('tier 2: a year', ids('2025').sort().join() === [assam.id, kerala.id].sort().join() && hit('2025', kerala)?.dateMark === 'year')
check('tier 2: sep, sept and september all find September',
  ['sep', 'sept', 'september'].every((q) => ids(q).join() === rajdhani.id && hit(q, rajdhani)?.dateMark === 'month'))
check('two letters is not a month — "ma" does not claim March', hit('ma', assam)?.dateMark !== 'month')
check('tier 1: a word of the note, with the mark on it', (() => {
  const h = hit('bunk', rajdhani)
  return h?.score === 1 && h.noteMark !== null && rajdhani.note?.slice(h.noteMark.start, h.noteMark.end) === 'bunk'
})())

// Queries of more than one word.
check('terms are AND-ed across fields: "kerala 2025"', ids('kerala 2025').join() === kerala.id)
check('one term with no match anywhere empties the result', ids('kerala 2024').length === 0)
check('a repeated term is not scored twice', hit('delhi delhi', rajdhani)?.score === hit('delhi', rajdhani)?.score)
check('punctuation and case are folded away', ids('  Top-BUNK ').join() === rajdhani.id)

// Ranking.
check('a station on two journeys finds both', ids('howrah').length === 2)
{
  const older = j({ fromCode: 'YPR', toCode: 'MAS', travelledOn: '2024-01-01' })
  const newer = j({ travelledOn: '2026-09-20', note: 'Chennai next time.' })
  const order = searchJourneys([newer, older], 'chennai', byCode).hits.map((h) => h.journey.id)
  check('tier beats date: an older name match ranks above a newer note match', order.join() === [older.id, newer.id].join())
}
check('ties break newest first', ids('howrah').join() === [rajdhani.id, assam.id].join())

// Station data not loaded yet.
{
  const s = searchJourneys(log, 'central', null)
  check('without byCode the search says it is degraded', s.degraded)
  check('without byCode names cannot match', s.hits.length === 0)
  check('without byCode codes still do', ids('ypr', null).join() === bangalore.id)
  check('without byCode the name falls back to the code', searchJourneys(log, '', null).hits[0]?.fromName === 'NDLS')
}

// A journey with nothing optional filled in is still searchable.
check('no train, no note: a note-shaped query just misses', ids('bunk').every((id) => id !== bangalore.id))

// Clipping a long note around its match.
{
  const note = 'Left late from the terminus, crawled through three states, and then at last the ghat section opened up and the valley dropped away on the left.'
  const at = note.indexOf('ghat')
  const out = clipNote(note, { start: at, end: at + 4 })
  check('a long note is clipped and ellipsed', out.text.startsWith('…') && out.text.length < note.length)
  check('the clipped mark still lands on the match', out.text.slice(out.mark.start, out.mark.end) === 'ghat')
  const short = clipNote('Tea at NJP.', { start: 0, end: 3 })
  check('a short note is left alone', short.text === 'Tea at NJP.' && short.mark.end === 3)
}

console.log(failed === 0 ? '\nall checks passed' : `\n${failed} FAILED`)
process.exit(failed === 0 ? 0 : 1)
