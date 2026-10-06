import { useMemo } from 'react'
import { routeForJourney, type RouteFailure } from './route.ts'
import type { MapData } from './useMapData.ts'
import type { Journey } from '@/types/index.ts'

export interface JourneyRoute {
  id: string
  /** SVG path `d`, in the same projected map space as `MapData.states`. */
  d: string
  /** The vertices of `d`, at the same one-decimal precision, for anything
      that needs to measure along the line — the draw-in cuts it by length. */
  points: ReadonlyArray<readonly [number, number]>
  /** The state each of `points` is in, index for index — so the draw-in can
      tell which state a growing line has just entered. */
  pointStates: readonly string[]
  /** The station at each of `points`, likewise — the subset of `stops` that
      could be placed, in order. */
  pointCodes: readonly string[]
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
 * else that needs the same lines (the rail pass's mini-map).
 *
 * Extracted from IndiaMap.tsx rather than duplicated: the rail pass wants
 * exactly the same routing a journey gets on the real map, and a second copy
 * of this is a second place for the two to quietly disagree.
 *
 * `trainStops` is optional — a caller with no shard fetches of its own (the
 * rail pass doesn't run useTrainStops) just gets the shortest-path
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
      const points: Array<readonly [number, number]> = []
      const pointStates: string[] = []
      const pointCodes: string[] = []
      for (const code of result.codes) {
        const s = data.byCode.get(code)
        if (!s) continue
        const x = s.x.toFixed(1), y = s.y.toFixed(1)
        pts.push(`${x},${y}`)
        points.push([Number(x), Number(y)])
        pointStates.push(s.state)
        pointCodes.push(code)
      }
      if (pts.length < 2) {
        failures.push({
          journey: j,
          failure: { kind: 'undrawable', plotted: pts.length, of: result.codes.length },
        })
        continue
      }
      routes.push({ id: j.id, d: `M${pts.join('L')}`, points, pointStates, pointCodes, km: result.km, stops: result.codes, exact })
    }
    return { routes, failures }
  }, [data, journeys, trainStops])
}
