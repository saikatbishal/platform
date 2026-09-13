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
  /** Records that a press landed on this box — IndiaMap resolves whether it
      turns into "open the full detail" once the release comes in, since a
      captured pointer's `pointerup` never actually reaches this element
      (see the stage's own handler for why). On a mouse this box is
      redundant — clicking the route itself does the same thing without a
      tooltip in the way — but on a touchscreen it's the only thing left to
      tap: the route was the first tap, and this is what a second one means. */
  onPressStart: (x: number, y: number) => void
}

/**
 * What's under the cursor (or the finger) on a route line.
 *
 * Where two journeys' routes overlap, only the more recently travelled one
 * has a hit target on top — see the render order in IndiaMap.tsx — so this
 * never has to decide which of several journeys to describe.
 */
export function RouteTooltip({ journey, route, fromName, toName, x, y, onPressStart }: Props) {
  const dateStr = new Date(`${journey.travelledOn}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  const minutes = journeyDurationMinutes(journey)

  return (
    <div
      role="tooltip"
      style={{ left: x, top: y }}
      onPointerDown={(e) => { onPressStart(e.clientX, e.clientY) }}
      className="pointer-events-auto fixed z-30 h-60 w-56 -translate-x-1/2 -translate-y-[calc(100%+14px)] cursor-pointer overflow-hidden rounded-sm border border-line bg-surface p-3 shadow-lg transition-colors duration-150 hover:border-line-strong"
    >
      <p className="line-clamp-2 text-sm leading-snug font-semibold text-ink">
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
      {/* The full note lives in the Journeys overlay now — this is a quick
          glance, not the record, so anything past three lines is trimmed
          rather than pushed out of the fixed-height box. */}
      {journey.note && (
        <p className="line-clamp-3 mt-1.5 text-sm text-ink-soft italic">{journey.note}</p>
      )}
    </div>
  )
}
