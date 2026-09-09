import { useMemo } from 'react'
import { routeForJourney, type RouteFailure } from './route.ts'
import type { MapData } from './useMapData.ts'
import type { Journey } from '@/types/index.ts'

export interface JourneyRoute {
  id: string
  /** SVG path `d`, in the same projected map space as `MapData.states`. */
  d: string
  km: number
  stops: string[]
  exact: boolean
}

export interface JourneyRouteFailure {
  journey: Journey
  failure: RouteFailure
}

/**
 * Journeys expanded into drawable paths, shared by the main map and anything
 * else that needs the same lines (the passport card's mini-map).
 *
 * Extracted from IndiaMap.tsx rather than duplicated: the passport card wants
 * exactly the same routing a journey gets on the real map, and a second copy
 * of this is a second place for the two to quietly disagree.
 *
 * `trainStops` is optional — a caller with no shard fetches of its own (the
 * passport card doesn't run useTrainStops) just gets the shortest-path
 * fallback for every journey, which is the same distinction IndiaMap already
 * draws as a dashed line. Fine for a thumbnail; the primary map is the place
 * that has to get the exact/inferred distinction right.
 */
export function useJourneyRoutes(
  data: MapData | null,
  journeys: readonly Journey[],
  trainStops?: ReadonlyMap<string, readonly string[]>,
): { routes: JourneyRoute[]; failures: JourneyRouteFailure[] } {
  return useMemo(() => {
    const routes: JourneyRoute[] = []
    const failures: JourneyRouteFailure[] = []
    if (!data) return { routes, failures }

    for (const j of journeys) {
      const known = j.trainNumber ? trainStops?.get(j.trainNumber) : undefined
      const { result, failure, exact } = routeForJourney(data.graph, j.fromCode, j.toCode, known)
      if (!result) {
        failures.push({ journey: j, failure: failure ?? { kind: 'no-path' } })
        continue
      }
      const pts: string[] = []
      for (const code of result.codes) {
        const s = data.byCode.get(code)
        if (s) pts.push(`${s.x.toFixed(1)},${s.y.toFixed(1)}`)
      }
      if (pts.length < 2) {
        failures.push({
          journey: j,
          failure: { kind: 'undrawable', plotted: pts.length, of: result.codes.length },
        })
        continue
      }
      routes.push({ id: j.id, d: `M${pts.join('L')}`, km: result.km, stops: result.codes, exact })
    }
    return { routes, failures }
  }, [data, journeys, trainStops])
}
