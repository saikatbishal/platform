import { formatKm } from '@/lib/distance.ts'
import { journeyDurationMinutes } from '@/lib/duration.ts'
import type { JourneyRoute } from './useJourneyRoutes.ts'
import type { Journey } from '@/types/index.ts'

interface Props {
  journey: Journey
  route: JourneyRoute
  fromName: string
  toName: string
  /** Viewport coordinates — `position: fixed`, so these are used as-is. */
  x: number
  y: number
}

/**
 * What's under the cursor (or the finger) on a route line.
 *
 * Where two journeys' routes overlap, only the more recently travelled one
 * has a hit target on top — see the render order in IndiaMap.tsx — so this
 * never has to decide which of several journeys to describe.
 */
export function RouteTooltip({ journey, route, fromName, toName, x, y }: Props) {
  const dateStr = new Date(`${journey.travelledOn}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  const minutes = journeyDurationMinutes(journey)

  return (
    <div
      role="tooltip"
      style={{ left: x, top: y }}
      className="pointer-events-none fixed z-30 w-56 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-sm border border-line bg-surface p-3 shadow-lg"
    >
      <p className="text-sm leading-snug font-semibold text-ink">
        {fromName} <span className="text-ink-faint">→</span> {toName}
      </p>
      <p className="tabular mt-1 text-sm text-ink-soft">
        {dateStr} · {formatKm(route.km)}
      </p>
      <p className="mt-1 text-sm text-ink-faint">
        {journey.trainNumber
          ? `${route.exact ? 'Train' : 'Recorded as train'} ${journey.trainNumber}`
          : 'Shortest path — no train recorded'}
        {minutes !== null && ` · ${Math.floor(minutes / 60)}h ${minutes % 60}m`}
      </p>
      {journey.note && (
        <p className="mt-1.5 text-sm text-ink-soft italic">{journey.note}</p>
      )}
    </div>
  )
}
