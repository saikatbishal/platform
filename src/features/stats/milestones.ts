import { journeyDurationMinutes } from '@/lib/duration.ts'
import { formatKm } from '@/lib/distance.ts'
import type { Journey } from '@/types/index.ts'

/**
 * Four honest thresholds, per the project spec — "no badge for opening the
 * app," every one of them a fact about having actually gone somewhere.
 *
 * Purely derived, like every other stat in this app: recomputed from the
 * journey list on every render, nothing unlocked-at persisted. A milestone
 * that could be wrong is worse than one that's occasionally slow to compute,
 * and at this data size (a few hundred journeys, ever) it's never slow.
 */
export interface MilestoneContext {
  km: number
  stations: number
  states: number
  journeys: readonly Journey[]
}

export interface MilestoneStatus {
  id: string
  label: string
  achieved: boolean
  /** What's true right now, said plainly whether locked or not. */
  detail: string
}

interface Milestone {
  id: string
  label: string
  achieved: (ctx: MilestoneContext) => boolean
  detail: (ctx: MilestoneContext) => string
}

const KM_THRESHOLD = 1000
const STATION_THRESHOLD = 10
const STATE_THRESHOLD = 5
const LONG_HAUL_MINUTES = 24 * 60

const MILESTONES: readonly Milestone[] = [
  {
    id: 'km-1000',
    label: `${KM_THRESHOLD.toLocaleString('en-IN')} km`,
    achieved: (ctx) => ctx.km >= KM_THRESHOLD,
    detail: (ctx) =>
      ctx.km >= KM_THRESHOLD
        ? `${formatKm(ctx.km)} — past ${KM_THRESHOLD.toLocaleString('en-IN')}`
        : `${formatKm(ctx.km)} of ${KM_THRESHOLD.toLocaleString('en-IN')}`,
  },
  {
    id: 'stations-10',
    label: `${STATION_THRESHOLD} stations`,
    achieved: (ctx) => ctx.stations >= STATION_THRESHOLD,
    detail: (ctx) =>
      ctx.stations >= STATION_THRESHOLD
        ? `${ctx.stations} stations — past ${STATION_THRESHOLD}`
        : `${ctx.stations} of ${STATION_THRESHOLD} stations`,
  },
  {
    id: 'states-5',
    label: `${STATE_THRESHOLD} states`,
    achieved: (ctx) => ctx.states >= STATE_THRESHOLD,
    detail: (ctx) =>
      ctx.states >= STATE_THRESHOLD
        ? `${ctx.states} states — past ${STATE_THRESHOLD}`
        : `${ctx.states} of ${STATE_THRESHOLD} states`,
  },
  {
    id: 'long-haul-24h',
    label: 'A journey over 24 hours',
    achieved: (ctx) => ctx.journeys.some((j) => (journeyDurationMinutes(j) ?? 0) >= LONG_HAUL_MINUTES),
    detail: (ctx) => {
      const longest = ctx.journeys.reduce<number | null>((max, j) => {
        const m = journeyDurationMinutes(j)
        return m !== null && (max === null || m > max) ? m : max
      }, null)
      if (longest === null) return 'Log departure and arrival times to check'
      if (longest >= LONG_HAUL_MINUTES) return `${Math.round(longest / 60)}h — past 24`
      return `Longest logged so far: ${Math.round(longest / 60)}h`
    },
  },
]

export function evaluateMilestones(ctx: MilestoneContext): MilestoneStatus[] {
  return MILESTONES.map((m) => ({ id: m.id, label: m.label, achieved: m.achieved(ctx), detail: m.detail(ctx) }))
}

if (import.meta.env.DEV) {
  const j = (over: Partial<Journey>): Journey => ({
    id: 'x', fromCode: 'A', toCode: 'B', travelledOn: '2026-01-01',
    trainNumber: null, note: null, distanceKm: 0,
    departureTime: null, arrivalTime: null, arrivalDayOffset: 0,
    ...over,
  })
  const empty = evaluateMilestones({ km: 0, stations: 0, states: 0, journeys: [] })
  console.assert(empty.every((m) => !m.achieved), '[milestones] nothing should unlock with no journeys')

  const past = evaluateMilestones({ km: 1200, stations: 12, states: 6, journeys: [] })
  console.assert(past.filter((m) => m.achieved).length === 3, '[milestones] km/stations/states should unlock, long-haul should not')

  const withLongHaul = evaluateMilestones({
    km: 0, stations: 0, states: 0,
    journeys: [j({ departureTime: '20:00', arrivalTime: '21:00', arrivalDayOffset: 1 })],
  })
  console.assert(
    withLongHaul.find((m) => m.id === 'long-haul-24h')?.achieved === true,
    '[milestones] a 25h journey should unlock the long-haul milestone',
  )
}
