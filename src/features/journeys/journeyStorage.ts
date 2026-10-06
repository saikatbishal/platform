import type { Journey } from '@/types/index.ts'

/**
 * Where journeys live until Supabase does.
 *
 * Split from the hook so it is plain functions over a string key — no React,
 * no component to mount — which is what makes the parts that actually break
 * testable: a corrupt entry, a shape written by an older build, storage
 * switched off, two users on one browser.
 */

/**
 * Keyed by user id, because a browser is not a person.
 *
 * Two people sharing a laptop, or one person with a work and a personal
 * account, must not see each other's travel. The id is `auth.user.id` — a
 * Supabase `auth.users.id` in live mode and a fixed uuid of the same shape in
 * demo mode (see demoSession.ts, which was written expecting exactly this).
 * Signed out, entries go to their own bucket rather than into whoever signed
 * in last.
 *
 * `v1` is in the key so a future change to the Journey shape can be told apart
 * from this one instead of crashing on it.
 */
export const keyFor = (userId: string | null) => `platform.journeys.v1.${userId ?? 'anon'}`

/**
 * Stored JSON is not trusted input.
 *
 * It survives across deploys, so it can have been written by an older build
 * with a different shape, and a person can edit it by hand. A bad row must not
 * reach the map — `routes` would read undefined codes and the whole render
 * throws — so rows are checked one at a time and the bad ones dropped, rather
 * than the file being taken or rejected whole.
 */
export function isJourney(x: unknown): x is Journey {
  if (typeof x !== 'object' || x === null) return false
  const j = x as Record<string, unknown>
  return (
    typeof j['id'] === 'string' &&
    typeof j['fromCode'] === 'string' && j['fromCode'] !== '' &&
    typeof j['toCode'] === 'string' && j['toCode'] !== '' &&
    typeof j['travelledOn'] === 'string' &&
    (typeof j['trainNumber'] === 'string' || j['trainNumber'] === null) &&
    (typeof j['note'] === 'string' || j['note'] === null) &&
    typeof j['distanceKm'] === 'number' && Number.isFinite(j['distanceKm']) &&
    // Journeys stored before departure/arrival times existed have none of
    // these three keys at all — `undefined` is accepted here as "old row",
    // and read() below fills in the honest default before it goes anywhere.
    (j['departureTime'] === undefined || j['departureTime'] === null || typeof j['departureTime'] === 'string') &&
    (j['arrivalTime'] === undefined || j['arrivalTime'] === null || typeof j['arrivalTime'] === 'string') &&
    (j['arrivalDayOffset'] === undefined || typeof j['arrivalDayOffset'] === 'number')
  )
}

export function read(key: string): Journey[] {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const good = parsed.filter(isJourney)
    if (import.meta.env.DEV && good.length !== parsed.length) {
      console.warn(`[journeys] dropped ${parsed.length - good.length} unreadable stored journeys`)
    }
    return good.map((j) => ({
      ...j,
      departureTime: j.departureTime ?? null,
      arrivalTime: j.arrivalTime ?? null,
      arrivalDayOffset: j.arrivalDayOffset ?? 0,
    }))
  } catch {
    // Private browsing, storage switched off, or corrupt JSON. Starting empty
    // beats throwing during first paint — the same call the demo session makes.
    return []
  }
}

/** True if the rows are now in storage. Callers that clear another copy on
    the strength of this write must check it. */
export function write(key: string, journeys: readonly Journey[]): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(journeys))
    return true
  } catch (e) {
    // Full, or storage denied. The journey stays in memory for this session;
    // losing it silently on reload is bad, pretending the write failed the
    // whole action is worse.
    if (import.meta.env.DEV) console.warn('[journeys] could not persist', e)
    return false
  }
}

/**
 * The bucket an unsigned visitor writes to.
 *
 * Named rather than spelled out at each call site, because two places have to
 * agree on it exactly: the store an anonymous visitor writes to, and the
 * migration that empties it on first sign-in. A typo in either one silently
 * loses somebody's travel.
 */
export const ANON_KEY = keyFor(null)

/**
 * Read the anonymous bucket; empty it only of what the caller confirms.
 *
 * Read-then-clear-later on purpose. Clearing first loses everything if the
 * upload that follows fails, and that is the bug this used to have in a
 * subtler form: `commit()` took no argument and emptied the whole bucket, and
 * its caller could not tell a failed upload from a good one, so a failed
 * sign-in handover wiped the device copy of journeys that never reached the
 * server.
 *
 * `commit(ids)` now removes exactly the journeys the server confirmed and
 * keeps the rest, so a partial failure strands nothing: what landed is not
 * offered again, what didn't is still here for the next sign-in. A refresh
 * mid-handover replays at most the unconfirmed ones, and the server's upsert
 * by id makes replaying one harmless.
 */
export function takeAnon(): { journeys: Journey[]; commit: (confirmedIds: Iterable<string>) => void } {
  const journeys = read(ANON_KEY)
  return {
    journeys,
    commit: (confirmedIds) => {
      if (journeys.length === 0) return
      const done = new Set(confirmedIds)
      if (done.size === 0) return
      // Re-read rather than filtering the snapshot above: nothing should write
      // this bucket while someone is signed in, but if anything ever does, the
      // newer rows must survive this commit.
      write(ANON_KEY, read(ANON_KEY).filter((j) => !done.has(j.id)))
    },
  }
}

/**
 * Take specific journeys out of the signed-out bucket — for a delete made
 * while signed in, when the account could not be read and the map is showing
 * the device's signed-out journeys. Without this, deleting one there would
 * leave it in the bucket and the next sync would send it up again.
 */
export function dropAnon(ids: Iterable<string>): void {
  const done = new Set(ids)
  if (done.size === 0) return
  const rows = read(ANON_KEY)
  const kept = rows.filter((j) => !done.has(j.id))
  if (kept.length !== rows.length) write(ANON_KEY, kept)
}

/**
 * Journeys a signed-in user logged that the server has not confirmed yet.
 *
 * A write-ahead log, not an error list. Every signed-in add lands here
 * *before* the request goes out and leaves only when the server says it has
 * the row. So closing the tab mid-save, losing signal on a train, or a server
 * error all end the same way: the journey is still on this device, still on
 * the map, and re-sent on the next load. Before this, a failed save stayed on
 * the map until reload and then vanished — the rollback that was meant to
 * catch it was attached to a promise that never rejected.
 *
 * Per user, like everything else here: one person's unsent journeys are never
 * sent into another's account.
 */
export const pendingKeyFor = (userId: string) => `platform.journeys.v1.pending.${userId}`

export function addPending(userId: string, journey: Journey): void {
  const key = pendingKeyFor(userId)
  const rows = read(key)
  if (!rows.some((j) => j.id === journey.id)) write(key, [...rows, journey])
}

export function dropPending(userId: string, ids: Iterable<string>): void {
  const done = new Set(ids)
  if (done.size === 0) return
  const key = pendingKeyFor(userId)
  write(key, read(key).filter((j) => !done.has(j.id)))
}

/**
 * A v4 uuid wherever the app runs.
 *
 * `crypto.randomUUID` exists only in a secure context, so opening the dev
 * server on a phone over the LAN (plain http) used to fall through to an id
 * like `jm0x3k…` — which Postgres rejects for a `uuid` column, so every save
 * from that phone failed. `getRandomValues` is available in insecure contexts
 * too, and a v4 uuid is nothing more than 122 random bits with the version and
 * variant set.
 */
export function newJourneyId(): string {
  // A property test, not `'randomUUID' in crypto`: the DOM types say the
  // method always exists, so an `in` check narrows `crypto` to `never` on the
  // fallback path — which is exactly the path this function is for.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = new Uint8Array(16)
  crypto.getRandomValues(b)
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x40
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
