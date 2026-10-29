import type { Trip } from '@/types/index.ts'

/**
 * Where trips live on the device — the twin of `journeyStorage.ts`, and
 * written to the same rules: plain functions over a string key, stored JSON
 * treated as untrusted, a failed write reported rather than thrown.
 *
 * Trips get their own keys rather than riding inside the journeys array, so
 * every journey stored before trips existed keeps reading exactly as it did.
 */

/** Per user, like journeys: a browser is not a person. */
export const tripsKeyFor = (userId: string | null) => `platform.trips.v1.${userId ?? 'anon'}`
export const ANON_TRIPS_KEY = tripsKeyFor(null)

export function isTrip(x: unknown): x is Trip {
  if (typeof x !== 'object' || x === null) return false
  const t = x as Record<string, unknown>
  const name = t['name']
  return (
    typeof t['id'] === 'string' && t['id'] !== '' &&
    typeof name === 'string' && name.trim() !== '' &&
    (t['note'] === null || typeof t['note'] === 'string') &&
    typeof t['createdAt'] === 'string'
  )
}

export function readTrips(key: string): Trip[] {
  const parsed = readJson(key)
  if (!Array.isArray(parsed)) return []
  const good = parsed.filter(isTrip)
  if (import.meta.env.DEV && good.length !== parsed.length) {
    console.warn(`[trips] dropped ${parsed.length - good.length} unreadable stored trips`)
  }
  return good
}

export function writeTrips(key: string, trips: readonly Trip[]): boolean {
  return writeJson(key, trips)
}

/**
 * The signed-out bucket, read now and emptied later of only what the caller
 * confirms — `takeAnon`'s arrangement, for the same reason: clearing before
 * the upload lands is how a failed sign-in used to lose travel.
 */
export function takeAnonTrips(): { trips: Trip[]; commit: (confirmedIds: Iterable<string>) => void } {
  const trips = readTrips(ANON_TRIPS_KEY)
  return {
    trips,
    commit: (confirmedIds) => {
      const done = new Set(confirmedIds)
      if (done.size === 0) return
      writeTrips(ANON_TRIPS_KEY, readTrips(ANON_TRIPS_KEY).filter((t) => !done.has(t.id)))
    },
  }
}

/* ------------------------------------------------------------------------
 * The signed-in write-ahead logs.
 *
 * Journeys have one (`pendingKeyFor`): every add lands there before the
 * request and leaves on confirmation. Trips need three more, because they
 * bring two kinds of write journeys never had — an edit and a delete — and a
 * journey can now change after it was saved, by joining or leaving a trip.
 * Each log holds the latest intent per id, so ten renames offline send one.
 * ---------------------------------------------------------------------- */

/** Trips to upsert: created or edited, not yet confirmed. Latest version per id. */
export const pendingTripsKeyFor = (userId: string) => `platform.trips.v1.pending.${userId}`
/** Trip ids to delete, not yet confirmed. */
export const pendingTripDeletesKeyFor = (userId: string) => `platform.trips.v1.pending-delete.${userId}`
/** Saved journeys whose trip changed, not yet confirmed: journey id → trip id or null. */
export const pendingAssignmentsKeyFor = (userId: string) => `platform.journeys.v1.pending-trip.${userId}`

export function putPendingTrip(userId: string, trip: Trip): void {
  const key = pendingTripsKeyFor(userId)
  writeTrips(key, [...readTrips(key).filter((t) => t.id !== trip.id), trip])
}

/**
 * Stop tracking a confirmed trip — but only the version that was confirmed.
 * A rename made while the create was in flight is a newer version still
 * waiting to go, and it must not be dropped on the strength of the older one
 * landing.
 */
export function dropPendingTrip(userId: string, confirmed: Trip): void {
  const key = pendingTripsKeyFor(userId)
  const rows = readTrips(key)
  const kept = rows.filter((t) => !(t.id === confirmed.id && sameTripVersion(t, confirmed)))
  if (kept.length !== rows.length) writeTrips(key, kept)
}

export function forgetPendingTrip(userId: string, id: string): void {
  const key = pendingTripsKeyFor(userId)
  const rows = readTrips(key)
  if (rows.some((t) => t.id === id)) writeTrips(key, rows.filter((t) => t.id !== id))
}

export const sameTripVersion = (a: Trip, b: Trip) =>
  a.name === b.name && a.note === b.note && a.createdAt === b.createdAt

export function readIds(key: string): string[] {
  const parsed = readJson(key)
  return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
}

export function addIds(key: string, ids: Iterable<string>): void {
  const rows = readIds(key)
  const next = [...new Set([...rows, ...ids])]
  if (next.length !== rows.length) writeJson(key, next)
}

export function dropIds(key: string, ids: Iterable<string>): void {
  const done = new Set(ids)
  const rows = readIds(key)
  const kept = rows.filter((id) => !done.has(id))
  if (kept.length !== rows.length) writeJson(key, kept)
}

export type Assignments = Record<string, string | null>

export function readAssignments(key: string): Assignments {
  const parsed = readJson(key)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
  const out: Assignments = {}
  for (const [id, trip] of Object.entries(parsed as Record<string, unknown>)) {
    if (trip === null || typeof trip === 'string') out[id] = trip
  }
  return out
}

export function putAssignments(key: string, ids: Iterable<string>, tripId: string | null): void {
  const rows = readAssignments(key)
  for (const id of ids) rows[id] = tripId
  writeJson(key, rows)
}

/** Drop confirmed assignments — only those still asking for what was confirmed. */
export function dropAssignments(key: string, ids: Iterable<string>, tripId: string | null): void {
  const rows = readAssignments(key)
  let changed = false
  for (const id of ids) {
    if (id in rows && rows[id] === tripId) { delete rows[id]; changed = true }
  }
  if (changed) writeJson(key, rows)
}

/* ------------------------------------------------------------------------
 * "Not a trip" — dismissed suggestions, by `suggestionKey`. Device only: a
 * suggestion is a nudge, not data, and losing the list costs one more nudge.
 * ---------------------------------------------------------------------- */

const dismissedKeyFor = (userId: string | null) => `platform.trips.v1.dismissed.${userId ?? 'anon'}`

export function readDismissed(userId: string | null): Set<string> {
  return new Set(readIds(dismissedKeyFor(userId)))
}

export function addDismissed(userId: string | null, key: string): void {
  addIds(dismissedKeyFor(userId), [key])
}

function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as unknown) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[trips] could not persist', e)
    return false
  }
}
