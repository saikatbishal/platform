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

export function write(key: string, journeys: readonly Journey[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(journeys))
  } catch (e) {
    // Full, or storage denied. The journey stays in memory for this session;
    // losing it silently on reload is bad, pretending the write failed the
    // whole action is worse.
    if (import.meta.env.DEV) console.warn('[journeys] could not persist', e)
  }
}
