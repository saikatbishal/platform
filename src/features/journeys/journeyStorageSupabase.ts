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
 * Read journeys for a signed-in user from Supabase.
 * RLS policy handles user isolation — the query cannot see other users' data.
 */
export async function readFromSupabase(userId: string): Promise<Journey[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('journeys')
    .select('*')
    .eq('user_id', userId)
    .order('travelled_on', { ascending: false })
  if (error) {
    console.error('[journeys] Supabase read failed:', error)
    return []
  }
  if (!data) return []
  return data
    .map((row) => fromPgRow(row))
    .filter((j) => j !== null) as Journey[]
}

/**
 * Add a journey to Supabase.
 * Returns the inserted journey on success, null on failure.
 */
export async function addToSupabase(userId: string, journey: Journey): Promise<Journey | null> {
  if (!supabase) return null
  const row = toPgRow(journey)
  const { data, error } = await supabase
    .from('journeys')
    .insert({ ...row, user_id: userId })
    .select()
    .single()
  if (error) {
    console.error('[journeys] Supabase insert failed:', error)
    return null
  }
  return fromPgRow(data)
}

/**
 * Remove a journey from Supabase.
 * Returns true on success, false on failure.
 */
export async function removeFromSupabase(userId: string, journeyId: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('journeys')
    .delete()
    .eq('id', journeyId)
    .eq('user_id', userId)
  if (error) {
    console.error('[journeys] Supabase delete failed:', error)
    return false
  }
  return true
}
