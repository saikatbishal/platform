import { supabase } from '@/lib/supabase.ts'
import type { Journey } from '@/types/index.ts'
import { isJourney } from './journeyStorage.ts'

/**
 * Map Journey (camelCase) ↔ Supabase row (snake_case).
 */
function toPgRow(journey: Journey) {
  return {
    id: journey.id,
    from_code: journey.fromCode,
    to_code: journey.toCode,
    travelled_on: journey.travelledOn,
    train_number: journey.trainNumber,
    note: journey.note,
    distance_km: journey.distanceKm,
    departure_time: journey.departureTime,
    arrival_time: journey.arrivalTime,
    arrival_day_offset: journey.arrivalDayOffset,
  }
}

function fromPgRow(row: Record<string, unknown>): Journey | null {
  const j: Journey = {
    id: row.id as string,
    fromCode: row.from_code as string,
    toCode: row.to_code as string,
    travelledOn: row.travelled_on as string,
    trainNumber: (row.train_number as string) || null,
    note: (row.note as string) || null,
    distanceKm: Number(row.distance_km),
    departureTime: (row.departure_time as string) || null,
    arrivalTime: (row.arrival_time as string) || null,
    arrivalDayOffset: (row.arrival_day_offset as number) ?? 0,
  }
  return isJourney(j) ? j : null
}

/**
 * Every call here says whether it worked, and callers must look.
 *
 * These used to log the error and return `[]` / `null` / `false`, which read
 * exactly like success to everything above them. The cost was not cosmetic:
 * the sign-in handover wrapped its uploads in a `try/catch` that could never
 * fire, so a failed upload still emptied the device's copy — the journeys were
 * then in neither place. A failed read looked like an empty account. Neither
 * of those is recoverable after the fact, so failure is now a value the type
 * system makes the caller handle, not a log line.
 */
export type SyncResult<T> = { ok: true; value: T } | { ok: false; error: string }

const fail = (error: unknown): { ok: false; error: string } => ({
  ok: false,
  error:
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error),
})

const NOT_CONFIGURED = { ok: false, error: 'Supabase is not configured' } as const

/**
 * Read journeys for a signed-in user from Supabase.
 * RLS policy handles user isolation — the query cannot see other users' data.
 *
 * A failure is NOT an empty list. The caller must not treat "could not ask" as
 * "has nothing" — that is how a network blip at sign-in used to hide an
 * account's whole history and upload the device's journeys into it blind.
 */
export async function readFromSupabase(userId: string): Promise<SyncResult<Journey[]>> {
  if (!supabase) return NOT_CONFIGURED
  try {
    const { data, error } = await supabase
      .from('journeys')
      .select('*')
      .eq('user_id', userId)
      .order('travelled_on', { ascending: false })
    if (error) return fail(error)
    const rows = (data ?? []).map((row) => fromPgRow(row as Record<string, unknown>))
    const good = rows.filter((j): j is Journey => j !== null)
    if (import.meta.env.DEV && good.length !== rows.length) {
      console.warn(`[journeys] ${rows.length - good.length} server rows failed validation`)
    }
    return { ok: true, value: good }
  } catch (e) {
    // supabase-js returns most failures as `error`, but a fetch that never
    // got a response (offline, DNS, CORS) can still throw.
    return fail(e)
  }
}

/**
 * Save a journey to Supabase — idempotently, keyed on the journey's own id.
 *
 * An upsert that ignores an existing row, not an insert, because every save
 * here can be retried: a request can time out after the row landed, a pending
 * journey is re-sent on the next load, and React's dev-mode double invoke used
 * to fire the same insert twice. A plain insert turns each of those into a
 * primary-key error on a row that is in fact safely stored — which, now that
 * errors are no longer swallowed, would strand the journey as "not saved"
 * forever. With `ignoreDuplicates` a second send is a no-op that succeeds.
 *
 * Success returns the journey as sent: the server either stored exactly this
 * row, or already had a row with this id — which can only be this journey.
 */
export async function addToSupabase(userId: string, journey: Journey): Promise<SyncResult<Journey>> {
  if (!supabase) return NOT_CONFIGURED
  try {
    const { error } = await supabase
      .from('journeys')
      .upsert({ ...toPgRow(journey), user_id: userId }, { onConflict: 'id', ignoreDuplicates: true })
    if (error) return fail(error)
    return { ok: true, value: journey }
  } catch (e) {
    return fail(e)
  }
}

/**
 * Remove a journey from Supabase. Deleting a row that is already gone
 * succeeds — the end state the caller asked for is true either way.
 */
export async function removeFromSupabase(userId: string, journeyId: string): Promise<SyncResult<null>> {
  if (!supabase) return NOT_CONFIGURED
  try {
    const { error } = await supabase
      .from('journeys')
      .delete()
      .eq('id', journeyId)
      .eq('user_id', userId)
    if (error) return fail(error)
    return { ok: true, value: null }
  } catch (e) {
    return fail(e)
  }
}
