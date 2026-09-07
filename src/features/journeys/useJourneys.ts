import { useCallback, useState } from 'react'
import { routeForJourney, type RailGraph } from '@/features/map/route.ts'
import type { Journey, JourneyDraft } from '@/types/index.ts'

/**
 * The journeys the map draws.
 *
 * In memory only, on purpose and temporarily. The roadmap builds the flow
 * before the backend so the whole thing is reviewable without one, and
 * supabase/schema.sql already has the table this will write to. Everything
 * that will change lives in this file: swap the `useState` for a TanStack
 * query against Supabase and nothing above it moves. Journeys do not survive
 * a reload yet — that is the next step, not an oversight.
 */
export interface JourneyStore {
  journeys: Journey[]
  add: (draft: JourneyDraft, graph: RailGraph | null, trainStops?: readonly string[]) => Journey
  remove: (id: string) => void
}

export function useJourneys(seed: readonly Journey[] = []): JourneyStore {
  const [journeys, setJourneys] = useState<Journey[]>([...seed])

  const add = useCallback(
    (draft: JourneyDraft, graph: RailGraph | null, trainStops?: readonly string[]) => {
      /*
       * distance_km is "computed on write" per the schema, so it is computed
       * here rather than left at 0 for the map to imply. It routes the same
       * way the map does — through the train's own stop list when one was
       * picked, shortest path otherwise — so the number stored matches the
       * line drawn. A journey that cannot be routed stores 0 and says so on
       * the map instead (see IndiaMap's failure handling); it does not get a
       * straight-line guess, which would be a wrong number rather than a
       * missing one.
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
            : `j${Date.now().toString(36)}`,
        distanceKm,
      }
      setJourneys((prev) => [...prev, journey])
      return journey
    },
    [],
  )

  const remove = useCallback((id: string) => {
    setJourneys((prev) => prev.filter((j) => j.id !== id))
  }, [])

  return { journeys, add, remove }
}
