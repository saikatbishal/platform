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
 */
export function mergeJourneys(
  existing: readonly Journey[],
  incoming: readonly Journey[],
): { merged: Journey[]; added: Journey[] } {
  const added = incoming.filter((i) => !existing.some((e) => sameJourney(e, i)))
  return { merged: [...existing, ...added], added }
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
} {
  const onServer = new Set(server.map((j) => j.id))
  const pendingLanded = pending.filter((j) => onServer.has(j.id)).map((j) => j.id)
  const unsent = pending.filter((j) => !onServer.has(j.id))
  // An anon row whose id is already on the server was sent by an earlier
  // handover whose confirmation never got recorded — not a new trip.
  const anonFresh = anon.filter((j) => !onServer.has(j.id))
  const { added } = mergeJourneys([...server, ...unsent], anonFresh)
  const fromAnon = new Set(added.map((j) => j.id))
  const anonAlreadyThere = anon.filter((j) => !fromAnon.has(j.id)).map((j) => j.id)
  return { pendingLanded, toSend: [...unsent, ...added], fromAnon, anonAlreadyThere }
}
