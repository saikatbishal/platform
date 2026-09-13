import { useCallback, useEffect, useState } from 'react'
import { routeForJourney, type RailGraph } from '@/features/map/route.ts'
import { isSupabaseConfigured } from '@/lib/supabase.ts'
import { keyFor, read, write } from './journeyStorage.ts'
import { addToSupabase, readFromSupabase, removeFromSupabase } from './journeyStorageSupabase.ts'
import type { Journey, JourneyDraft } from '@/types/index.ts'

/**
 * The journeys the map draws. Storage depends on auth state:
 * - Signed in + Supabase configured: Supabase
 * - Otherwise (demo mode, offline, unsigned): localStorage
 *
 * Everything that moves is in this file. The shape exposed — a list, add, remove —
 * is what a TanStack query against `journeys` table will expose, so nothing
 * above this changes.
 */

export interface JourneyStore {
  journeys: Journey[]
  /** True once this user's stored journeys have been read — even if empty. */
  loaded: boolean
  add: (draft: JourneyDraft, graph: RailGraph | null, trainStops?: readonly string[]) => Journey
  remove: (id: string) => void
}

export function useJourneys(userId: string | null): JourneyStore {
  const useSupabase = isSupabaseConfigured && userId !== null
  const lsKey = keyFor(userId)

  const [store, setStore] = useState<{ userId: string | null; journeys: Journey[]; loaded: boolean }>(() => ({
    userId,
    journeys: useSupabase ? [] : read(lsKey),
    loaded: !useSupabase,
  }))

  /*
   * userId changed — immediately clear to [] to stop the previous user's
   * journeys showing for one frame after sign-in/out. The fetch below will fill
   * it back in once it completes. Render-time adjustment matches React's
   * documented pattern for "this state is derived from a prop that changed".
   */
  if (store.userId !== userId) {
    setStore({ userId, journeys: [], loaded: false })
  }

  // Fetch from Supabase on userId change (or on mount if userId was already set)
  useEffect(() => {
    if (!useSupabase) return
    if (!userId) return // Already cleared above

    let stale = false
    readFromSupabase(userId).then((journeys) => {
      if (stale) return
      setStore((prev) => (prev.userId === userId ? { userId, journeys, loaded: true } : prev))
    })

    return () => {
      stale = true
    }
  }, [userId, useSupabase])

  const add = useCallback(
    (draft: JourneyDraft, graph: RailGraph | null, trainStops?: readonly string[]) => {
      let distanceKm = 0
      if (graph) {
        const { result } = routeForJourney(graph, draft.fromCode, draft.toCode, trainStops)
        if (result) distanceKm = Math.round(result.km * 10) / 10
      }
      const journey: Journey = {
        ...draft,
        id:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `j${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
        distanceKm,
      }

      // Optimistic insert: add to state immediately, persist async
      setStore((prev) => {
        const next = [...prev.journeys, journey]
        if (useSupabase && userId) {
          // Fire and forget, but on failure roll back and warn
          addToSupabase(userId, journey).catch(() => {
            setStore((p) => ({
              ...p,
              journeys: p.journeys.filter((j) => j.id !== journey.id),
            }))
            console.warn(
              `[journeys] failed to save "${journey.fromCode}–${journey.toCode}", removed from the map. Try adding again.`,
            )
          })
        } else {
          write(prev.userId ? keyFor(prev.userId) : lsKey, next)
        }
        return { ...prev, journeys: next }
      })

      return journey
    },
    [userId, useSupabase, lsKey],
  )

  const remove = useCallback(
    (id: string) => {
      setStore((prev) => {
        const next = prev.journeys.filter((j) => j.id !== id)
        if (useSupabase && userId) {
          removeFromSupabase(userId, id).catch(() => {
            // Restore on failure
            const removed = prev.journeys.find((j) => j.id === id)
            if (removed) {
              setStore((p) => ({ ...p, journeys: [...p.journeys, removed] }))
            }
            console.warn(`[journeys] failed to remove journey, restored to the map. Try again.`)
          })
        } else {
          write(prev.userId ? keyFor(prev.userId) : lsKey, next)
        }
        return { ...prev, journeys: next }
      })
    },
    [userId, useSupabase, lsKey],
  )

  return { journeys: store.journeys, loaded: store.loaded, add, remove }
}
