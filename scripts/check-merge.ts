/**
 * Checks the anonymous-to-account merge against the cases that actually happen.
 *
 * `mergeJourneys` is the one function in this app whose bug is unrecoverable:
 * it does not throw, it eats somebody's travel. There is no test framework here
 * (docs/00-decisions.md), so this runs the pure module directly — which is why
 * that module is pure: it imports no DOM and no `import.meta.env`, so it type
 * checks under tsconfig.node.json and runs under plain node.
 *
 *   node --experimental-strip-types scripts/check-merge.ts
 */

import { mergeJourneys, planSync, sameJourney } from '../src/features/journeys/mergeJourneys.ts'

type J = Parameters<typeof sameJourney>[0]

const j = (over: Partial<J>): J => ({
  id: Math.random().toString(36).slice(2),
  fromCode: 'NDLS',
  toCode: 'HWH',
  travelledOn: '2026-01-14',
  trainNumber: '12302',
  note: null,
  distanceKm: 1450,
  departureTime: null,
  arrivalTime: null,
  arrivalDayOffset: 0,
  ...over,
} as J)

let failed = 0
const check = (name: string, ok: boolean) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}`)
  if (!ok) failed++
}

// The case the feature exists for.
{
  const anon = [j({ toCode: 'HWH' }), j({ toCode: 'MAS', trainNumber: '12615' })]
  const { merged, added } = mergeJourneys([], anon)
  check('four-anonymous-journeys visitor signs in: all carried over', merged.length === 2 && added.length === 2)
}

// The case that loses data if you get it wrong.
{
  const server = [j({ travelledOn: '2026-01-14' })]
  const anon = [j({ travelledOn: '2026-01-14' })]   // same trip, different id
  const { merged, added } = mergeJourneys(server, anon)
  check('same trip on both sides is not duplicated', merged.length === 1 && added.length === 0)
  check('the server copy is the one kept', merged[0]?.id === server[0]?.id)
}

// Signing in on a friend's phone.
{
  const server = Array.from({ length: 30 }, (_, i) => j({ travelledOn: `2026-02-${String(i + 1).padStart(2, '0')}` }))
  const anon = [j({ travelledOn: '2026-02-01' }), j({ travelledOn: '2025-12-25' })]
  const { merged, added } = mergeJourneys(server, anon)
  check('30 server + 2 local, one overlapping: 31 out', merged.length === 31 && added.length === 1)
  check('the non-overlapping local one is what came in', added[0]?.travelledOn === '2025-12-25')
}

// Same route, different day, is two trips — the round-trip / commuter case.
{
  const { merged } = mergeJourneys([j({ travelledOn: '2026-01-14' })], [j({ travelledOn: '2026-01-19' })])
  check('same route on two dates stays two journeys', merged.length === 2)
}

// Same route, same day, different train: two legs, both real.
{
  const { merged } = mergeJourneys([j({ trainNumber: '12302' })], [j({ trainNumber: '12274' })])
  check('same route and date on two trains stays two journeys', merged.length === 2)
}

// A trip logged without a train, then again with one.
{
  const { merged } = mergeJourneys([j({ trainNumber: null })], [j({ trainNumber: null })])
  check('two untrained copies of one trip collapse', merged.length === 1)
}

// distanceKm must not participate: the rail graph changed under us.
{
  const { merged } = mergeJourneys([j({ distanceKm: 1450 })], [j({ distanceKm: 1451.3 })])
  check('a kilometre of drift does not make a second journey', merged.length === 1)
}

// Reversed direction is a different journey — you travelled both ways.
{
  const { merged } = mergeJourneys(
    [j({ fromCode: 'NDLS', toCode: 'HWH' })],
    [j({ fromCode: 'HWH', toCode: 'NDLS' })],
  )
  check('the return leg is its own journey', merged.length === 2)
}

// Degenerate inputs.
{
  check('empty on both sides', mergeJourneys([], []).merged.length === 0)
  const s = [j({})]
  check('nothing local leaves the account untouched', mergeJourneys(s, []).merged === s ? false : mergeJourneys(s, []).merged.length === 1)
}

// Duplicates *within* the anonymous bucket itself.
{
  const dupe = j({ travelledOn: '2026-03-03' })
  const { merged } = mergeJourneys([], [dupe, { ...dupe, id: 'other' }])
  check('two identical rows inside the local bucket both arrive (known)', merged.length === 2)
}

// ── planSync: what a sign-in or retry sends ─────────────────────────────────

// A pending add whose reply was lost, but which did land.
{
  const landed = j({ travelledOn: '2026-04-01' })
  const { pendingLanded, toSend } = planSync([landed], [landed], [])
  check('a pending journey the server already has is not re-sent', toSend.length === 0)
  check('…and is dropped from the pending log', pendingLanded[0] === landed.id)
}

// A pending add that never landed.
{
  const lost = j({ travelledOn: '2026-04-02' })
  const { toSend, fromAnon } = planSync([], [lost], [])
  check('an unconfirmed pending journey is sent', toSend.length === 1 && toSend[0]?.id === lost.id)
  check('…and is not mistaken for a signed-out one', !fromAnon.has(lost.id))
}

// A signed-out journey sent by a handover whose confirmation was never recorded.
{
  const a = j({ travelledOn: '2026-04-03' })
  const { toSend, anonAlreadyThere } = planSync([a], [], [a])
  check('a signed-out journey already on the server by id is not re-sent', toSend.length === 0)
  check('…and is cleared from the device as confirmed', anonAlreadyThere[0] === a.id)
}

// The same trip unsent in the pending log and sitting in the signed-out bucket.
{
  const p = j({ travelledOn: '2026-04-04' })
  const a = j({ travelledOn: '2026-04-04' })   // same trip, different id
  const { toSend } = planSync([], [p], [a])
  check('a trip in both local buckets is sent once', toSend.length === 1 && toSend[0]?.id === p.id)
}

// The first-sign-in case, through the planner.
{
  const server = [j({ travelledOn: '2026-01-01' })]
  const anon = [j({ travelledOn: '2026-01-01' }), j({ travelledOn: '2026-05-05' })]
  const { toSend, fromAnon, anonAlreadyThere } = planSync(server, [], anon)
  check('first sign-in: only the new signed-out trip is sent', toSend.length === 1 && fromAnon.has(anon[1]!.id))
  check('first sign-in: the duplicate is confirmed, not sent', anonAlreadyThere.length === 1 && anonAlreadyThere[0] === anon[0]!.id)
}

console.log(failed === 0 ? '\nall checks passed' : `\n${failed} FAILED`)
process.exit(failed === 0 ? 0 : 1)
