import { useCallback, useEffect, useState } from 'react'
import { routeForJourney, type RailGraph } from '@/features/map/route.ts'
import { isSupabaseConfigured } from '@/lib/supabase.ts'
import { keyFor, read, takeAnon, write } from './journeyStorage.ts'
import { mergeJourneys } from './mergeJourneys.ts'
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
    /*
     * Supabase path: empty, and the fetch below fills it. Local path: read the
     * new user's bucket right here, because nothing else will — this used to
     * set [] unconditionally, which meant that signing in while Supabase was
     * unconfigured (demo mode) blanked the map and left the journeys sitting
     * unread in storage under the user's key.
     */
    setStore({
      userId,
      journeys: useSupabase ? [] : read(keyFor(userId)),
      loaded: !useSupabase,
    })
  }

  // Fetch from Supabase on userId change (or on mount if userId was already set)
  useEffect(() => {
    if (!useSupabase) return
    if (!userId) return // Already cleared above

    let stale = false
    readFromSupabase(userId).then(async (server) => {
      if (stale) return

      /*
       * First sign-in after logging journeys anonymously. Those rows are the
       * whole point of letting someone use the app before they commit to an
       * account, so they are handed to the server here — the server's own copy
       * winning every collision, see mergeJourneys.
       */
      const { journeys: anon, commit } = takeAnon()
      const { merged, added } = mergeJourneys(server, anon)

      setStore((prev) => (prev.userId === userId ? { userId, journeys: merged, loaded: true } : prev))
      if (added.length === 0) {
        // Nothing new, but the bucket still holds duplicates of rows the
        // server already has. Clearing it stops them being re-offered on
        // every future sign-in on this browser.
        commit()
        return
      }

      try {
        // Sequential rather than Promise.all: a partial failure has to leave
        // the anonymous bucket untouched, and a half-settled batch of parallel
        // inserts makes "what actually landed" unanswerable.
        for (const j of added) await addToSupabase(userId, j)
        commit()
      } catch {
        if (stale) return
        // The bucket was never emptied, so nothing is lost — the journeys are
        // still on this device and the next sign-in will try again.
        setStore((prev) => (prev.userId === userId ? { userId, journeys: server, loaded: true } : prev))
        console.warn(
          `[journeys] could not move ${added.length} journeys from this device into your account. ` +
          'They are still saved here and will be retried next sign-in.',
        )
      }
    })

    return () => {
      stale = true
    }
  }, [userId, useSupabase])

  /*
   * The same handover for the local path — demo mode, or Supabase not
   * configured yet. Runs once per sign-in: takeAnon empties the bucket, so a
   * re-render cannot replay it.
   */
  useEffect(() => {
    if (useSupabase) return
    if (!userId) return

    const { journeys: anon, commit } = takeAnon()
    if (anon.length === 0) return

    const key = keyFor(userId)
    const { merged, added } = mergeJourneys(read(key), anon)
    if (added.length > 0) write(key, merged)
    commit()
    setStore((prev) => (prev.userId === userId ? { userId, journeys: merged, loaded: true } : prev))
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
