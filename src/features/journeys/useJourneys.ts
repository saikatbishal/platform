import { useCallback, useState } from 'react'
import { routeForJourney, type RailGraph } from '@/features/map/route.ts'
import { keyFor, read, write } from './journeyStorage.ts'
import type { Journey, JourneyDraft } from '@/types/index.ts'

/**
 * The journeys the map draws, kept in localStorage per user.
 *
 * Still not the backend: supabase/schema.sql has the table this will write to,
 * and the roadmap builds the flow before the backend so the whole thing is
 * reviewable without one. What changed is that journeys now survive a reload,
 * which the moment you test on a phone stops being a nicety.
 *
 * Everything that moves when Supabase arrives is in this file. The shape it
 * exposes — a list, an add, a remove — is what a TanStack query against the
 * `journeys` table will expose, so nothing above it changes.
 */

export interface JourneyStore {
  journeys: Journey[]
  /** True once this user's stored journeys have been read — even if empty. */
  loaded: boolean
  add: (draft: JourneyDraft, graph: RailGraph | null, trainStops?: readonly string[]) => Journey
  remove: (id: string) => void
}

export function useJourneys(userId: string | null): JourneyStore {
  const key = keyFor(userId)
  const [store, setStore] = useState<{ key: string; journeys: Journey[] }>(() => ({
    key,
    journeys: read(key),
  }))

  /*
   * Re-read during render rather than in an effect. An effect runs after paint,
   * which would show the previous user's journeys for one frame after a sign-in
   * or sign-out — brief, but it is someone else's travel history on screen.
   * Adjusting state during render is React's documented answer to "this state
   * is derived from a prop that changed".
   */
  if (store.key !== key) setStore({ key, journeys: read(key) })
  const journeys = store.key === key ? store.journeys : []

  const add = useCallback(
    (draft: JourneyDraft, graph: RailGraph | null, trainStops?: readonly string[]) => {
      /*
       * distance_km is "computed on write" per the schema, so it is computed
       * here rather than left at 0 for the map to imply. It routes the way the
       * map does — the train's own stop list when one was picked, shortest
       * path otherwise — so the number stored matches the line drawn. A
       * journey that cannot be routed stores 0 and says so on the map instead;
       * it does not get a straight-line guess, which would be a wrong number
       * rather than a missing one.
       */
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
      setStore((prev) => {
        const next = [...prev.journeys, journey]
        write(prev.key, next)
        return { key: prev.key, journeys: next }
      })
      return journey
    },
    [],
  )

  const remove = useCallback((id: string) => {
    setStore((prev) => {
      const next = prev.journeys.filter((j) => j.id !== id)
      write(prev.key, next)
      return { key: prev.key, journeys: next }
    })
  }, [])

  return { journeys, loaded: store.key === key, add, remove }
}
