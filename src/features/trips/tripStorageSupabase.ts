import { getSupabase } from '@/lib/supabase.ts'
import { fail, NOT_CONFIGURED, type SyncResult } from '@/features/journeys/journeyStorageSupabase.ts'
import type { Trip } from '@/types/index.ts'
import { isTrip } from './tripStorage.ts'

/**
 * Trips ↔ the `trips` table. Same contract as the journey calls beside it:
 * every call says whether it worked, and failure is a value the caller has to
 * look at, never a log line that reads like success.
 */

function fromPgRow(row: Record<string, unknown>): Trip | null {
  const t = {
    id: row.id as string,
    name: row.name as string,
    note: (row.note as string | null) || null,
    createdAt: row.created_at as string,
  }
  return isTrip(t) ? t : null
}

export interface TripsRead {
  trips: Trip[]
  /** Rows this build cannot read — kept on the server, counted, never dropped silently. */
  unreadable: number
}

export async function readTripsFromSupabase(userId: string): Promise<SyncResult<TripsRead>> {
  try {
    const supabase = await getSupabase()
    if (!supabase) return NOT_CONFIGURED
    const { data, error } = await supabase
      .from('trips')
      .select('id, name, note, created_at')
      .eq('user_id', userId)
    if (error) return fail(error)
    const rows = (data ?? []).map((row) => fromPgRow(row as Record<string, unknown>))
    const good = rows.filter((t): t is Trip => t !== null)
    return { ok: true, value: { trips: good, unreadable: rows.length - good.length } }
  } catch (e) {
    return fail(e)
  }
}

/**
 * Create or rename — one call, keyed on the trip's own id, so a retry is
 * harmless and the latest name always wins. Not `ignoreDuplicates`: a rename
 * is precisely a write to a row that already exists.
 */
export async function upsertTripToSupabase(userId: string, trip: Trip): Promise<SyncResult<Trip>> {
  try {
    const supabase = await getSupabase()
    if (!supabase) return NOT_CONFIGURED
    const { error } = await supabase
      .from('trips')
      .upsert(
        { id: trip.id, user_id: userId, name: trip.name, note: trip.note, created_at: trip.createdAt },
        { onConflict: 'id' },
      )
    if (error) return fail(error)
    return { ok: true, value: trip }
  } catch (e) {
    return fail(e)
  }
}

/**
 * Delete a trip. Its journeys are not touched here and must not be: the
 * schema's `on delete set null (trip_id)` takes them out of the trip on the
 * server, so they become unsorted and the map does not change. Deleting a
 * trip never deletes travel.
 */
export async function deleteTripFromSupabase(userId: string, tripId: string): Promise<SyncResult<null>> {
  try {
    const supabase = await getSupabase()
    if (!supabase) return NOT_CONFIGURED
    const { error } = await supabase.from('trips').delete().eq('id', tripId).eq('user_id', userId)
    if (error) return fail(error)
    return { ok: true, value: null }
  } catch (e) {
    return fail(e)
  }
}
