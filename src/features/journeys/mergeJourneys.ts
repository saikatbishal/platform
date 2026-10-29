import type { Journey } from '@/types/index.ts'

/**
 * The anonymous-to-account merge, and nothing else.
 *
 * Its own module because it is the one piece of journey storage that must be
 * runnable outside a browser. `journeyStorage.ts` touches `window.localStorage`
 * and `import.meta.env`, neither of which exists under `tsc -p
 * tsconfig.node.json` or under plain `node` — so a check script that imported
 * it dragged the DOM and Vite's client types into the node project and broke
 * the typecheck. Pure functions, no globals, no side effects: that is what
 * makes `scripts/check-merge.ts` possible.
 */

/**
 * Whether two journeys are the same trip.
 *
 * Ids cannot be used: an anonymous journey and its copy on the server were
 * minted by different `crypto.randomUUID()` calls. What identifies a trip is
 * where it went, when, and on what — so that is the key. `distanceKm` is
 * deliberately not part of it: the same trip logged before and after a rail
 * graph change can differ by a kilometre and is still one trip.
 *
 * `trainNumber` is compared with `??` rather than `===` so a trip logged once
 * without a train and once with it does not read as two: the more specific row
 * wins in `mergeJourneys` below.
 */
export function sameJourney(a: Journey, b: Journey): boolean {
  return (
    a.fromCode === b.fromCode &&
    a.toCode === b.toCode &&
    a.travelledOn === b.travelledOn &&
    (a.trainNumber ?? '') === (b.trainNumber ?? '')
  )
}

/**
 * Fold anonymous journeys into the ones an account already has.
 *
 * The case this exists for is unglamorous and entirely real: someone logs four
 * journeys without an account, signs in, and must not lose them — and someone
 * with thirty journeys on the server signs in on a friend's phone that has two
 * anonymous ones sitting in it, and must not silently inherit them twice.
 *
 * `existing` wins every collision. It is the account's own record, it may
 * already have been edited there, and it is the copy the server will keep
 * returning; preferring the local one would let a stale device overwrite it.
 *
 * Pure, and separated from every caller, because this is the one function in
 * the app whose bug is unrecoverable: a wrong merge does not throw, it eats
 * someone's travel. See scripts/check-merge.ts.
 *
 * **Trips (docs/features/trips/prd.md).** One exception to "existing wins":
 * when a journey is on both sides and only the incoming copy is in a trip,
 * the existing copy adopts that trip. Otherwise grouping journeys on a phone
 * before signing in would be lost the moment the account's copy of the same
 * journeys won the collision — no journey lost, but the trip silently
 * emptied, which is the same bug in a smaller size. An existing copy that is
 * already in a trip keeps its own. `adopted` lists what changed, so a caller
 * that has to tell a server about it knows exactly which rows to update.
 */
export function mergeJourneys(
  existing: readonly Journey[],
  incoming: readonly Journey[],
): { merged: Journey[]; added: Journey[]; adopted: Array<{ id: string; tripId: string }> } {
  const added: Journey[] = []
  const adoptedBy = new Map<string, string>()
  for (const i of incoming) {
    const twin = existing.find((e) => sameJourney(e, i))
    if (!twin) { added.push(i); continue }
    if (twin.tripId === null && i.tripId !== null && !adoptedBy.has(twin.id)) adoptedBy.set(twin.id, i.tripId)
  }
  const kept = adoptedBy.size === 0
    ? [...existing]
    : existing.map((e) => {
        const tripId = adoptedBy.get(e.id)
        return tripId === undefined ? e : { ...e, tripId }
      })
  const adopted = [...adoptedBy].map(([id, tripId]) => ({ id, tripId }))
  return { merged: [...kept, ...added], added, adopted }
}

/**
 * What a sign-in (or a retry) must send, given what the server returned and
 * what this device holds. Pure, for the same reason as `mergeJourneys`: this
 * is the decision whose bug eats travel, so it is checked in
 * scripts/check-merge.ts rather than trusted.
 *
 * - `pending` is the write-ahead log of signed-in adds. One the server already
 *   has (by id) landed on an attempt whose reply was lost: stop tracking it.
 * - `anon` is the signed-out bucket. Merged against the server *and* the
 *   unsent log, so a trip that exists in either is not sent twice.
 * - `anonAlreadyThere` are signed-out rows the account already holds as the
 *   same trip — confirmed by definition, safe to clear from the device.
 * - `adopted` are rows the account (or the unsent log) already holds, in no
 *   trip, whose signed-out twin was in one — see `mergeJourneys`. The caller
 *   updates them: in the unsent log if they are there, on the server if not.
 */
export function planSync(
  server: readonly Journey[],
  pending: readonly Journey[],
  anon: readonly Journey[],
): {
  pendingLanded: string[]
  toSend: Journey[]
  fromAnon: ReadonlySet<string>
  anonAlreadyThere: string[]
  adopted: Array<{ id: string; tripId: string }>
} {
  const onServer = new Set(server.map((j) => j.id))
  const pendingLanded = pending.filter((j) => onServer.has(j.id)).map((j) => j.id)
  const unsent = pending.filter((j) => !onServer.has(j.id))
  // An anon row whose id is already on the server was sent by an earlier
  // handover whose confirmation never got recorded — not a new trip.
  const anonFresh = anon.filter((j) => !onServer.has(j.id))
  const { added, adopted } = mergeJourneys([...server, ...unsent], anonFresh)
  const fromAnon = new Set(added.map((j) => j.id))
  const anonAlreadyThere = anon.filter((j) => !fromAnon.has(j.id)).map((j) => j.id)
  // An unsent journey that adopts a trip is sent with it, rather than sent
  // bare and updated after.
  const adoptedUnsent = new Map(adopted.filter((a) => unsent.some((u) => u.id === a.id)).map((a) => [a.id, a.tripId]))
  const unsentOut = adoptedUnsent.size === 0
    ? unsent
    : unsent.map((u) => { const t = adoptedUnsent.get(u.id); return t === undefined ? u : { ...u, tripId: t } })
  return { pendingLanded, toSend: [...unsentOut, ...added], fromAnon, anonAlreadyThere, adopted }
}
