import { useState } from 'react'
import { formatKm } from '@/lib/distance.ts'
import type { JourneyRoute } from '@/features/map/useJourneyRoutes.ts'
import type { Journey } from '@/types/index.ts'

interface Props {
  journey: Journey
  /** Undefined when the rail graph has no route for this journey — it still
      gets a card, per the "never silently drop a journey" rule, just without
      a distance or a place to fly to. */
  route: JourneyRoute | undefined
  fromName: string
  toName: string
  onShowOnMap: () => void
  onRemove: () => void
  /** True while these are the sample journeys, not anyone's real data —
      removing one would call `store.remove()` on an id that isn't in the
      store, a click that silently does nothing. Disabling it says so instead
      of leaving a button that quietly fails. */
  readOnly?: boolean
}

/** One journey, full detail — the record `RouteTooltip`'s quick glance
    points at. */
export function JourneyCard({ journey, route, fromName, toName, onShowOnMap, onRemove, readOnly }: Props) {
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const dateStr = new Date(`${journey.travelledOn}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <h3 className="text-xl leading-snug font-extrabold text-ink">
          {fromName} <span className="text-accent">→</span> {toName}
        </h3>
        <p className="tabular mt-1.5 text-label tracking-code text-ink-faint uppercase">
          {journey.fromCode} · {journey.toCode}
        </p>

        <p className="tabular mt-3 text-sm text-ink-soft">
          {dateStr}
          {route && (
            <>
              {' · '}
              <span className="text-cream">{formatKm(route.km)}</span>
            </>
          )}
        </p>

        {route ? (
          <p className="mt-1 text-xs text-ink-faint">
            {journey.trainNumber
              ? `${route.exact ? 'Train' : 'Recorded as train'} ${journey.trainNumber}`
              : 'Shortest path — no train recorded'}
          </p>
        ) : (
          <span className="mt-2 inline-block rounded-sm border border-accent/40 bg-accent/10 px-2 py-1 text-label text-ink-soft uppercase">
            Not drawn
          </span>
        )}

        <div className="mt-4 border-t border-line pt-4">
          {journey.note ? (
            <p className="max-w-[52ch] text-base leading-relaxed text-ink">{journey.note}</p>
          ) : (
            <p className="text-sm text-ink-faint">No note for this one.</p>
          )}
        </div>
      </div>

      <div className="border-t border-line px-5 py-4">
        {confirmingRemove ? (
          <div className="flex min-h-11 items-center justify-between gap-3">
            <p className="text-sm text-ink-soft">Remove this journey?</p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => { setConfirmingRemove(false) }}
                className="min-h-11 rounded-sm border border-line px-3 text-label font-semibold tracking-label text-ink-soft uppercase hover:bg-surface-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="min-h-11 rounded-sm border border-line px-3 text-label font-semibold tracking-label text-vermillion uppercase hover:bg-surface-2"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onShowOnMap}
              disabled={!route}
              className="min-h-11 flex-1 rounded-sm bg-accent px-4 text-label font-semibold tracking-label text-board-ink uppercase disabled:opacity-40"
            >
              Show on map
            </button>
            <button
              type="button"
              onClick={() => { setConfirmingRemove(true) }}
              disabled={readOnly}
              title={readOnly ? "Sample journeys aren't yours to remove — sign in to keep your own." : undefined}
              className="min-h-11 rounded-sm px-3 text-label font-semibold tracking-label text-ink-faint uppercase transition-colors duration-150 hover:text-vermillion disabled:opacity-40 disabled:hover:text-ink-faint"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
