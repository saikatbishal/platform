import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react'
import { useJourneyRoutes } from '@/features/map/useJourneyRoutes.ts'
import { JourneyCard } from './JourneyCard.tsx'
import type { MapData } from '@/features/map/useMapData.ts'
import type { Journey } from '@/types/index.ts'

interface Props {
  /** Every journey that shares this route, either direction — not the whole
      log. There is no "browse everything" entry point; this only opens from
      a route's own tooltip, already scoped to it. */
  journeys: readonly Journey[]
  /** Which of `journeys` was actually clicked/tapped — the pager opens on
      that one rather than always defaulting to the most recent. */
  initialJourneyId: string
  data: MapData | null
  onClose: () => void
  onShowOnMap: (journeyId: string) => void
  onRemove: (journeyId: string) => void
  /** True while `journeys` is the sample set, not anyone's real data. */
  readOnly?: boolean
}

/**
 * One route's journeys — every trip logged between these two stations,
 * either direction, one card per journey, paged. Full screen on a phone
 * (nothing behind it is actionable while it's open, so there's no scrim to
 * shrink the card for); a centred square modal from `sm` up.
 *
 * Routing here skips the exact-train stop list `IndiaMap` uses (no
 * `useTrainStops` instance of its own) — the same simplification
 * `PassportCard` already makes. A shortest-path label instead of an exact
 * one costs nothing a reader of this list would notice.
 */
export function JourneysSheet({ journeys, initialJourneyId, data, onClose, onShowOnMap, onRemove, readOnly = false }: Props) {
  const sorted = useMemo(
    () => [...journeys].sort((a, b) => b.travelledOn.localeCompare(a.travelledOn)),
    [journeys],
  )
  const { routes } = useJourneyRoutes(data, sorted)
  const routeById = useMemo(() => new Map(routes.map((r) => [r.id, r])), [routes])

  const count = sorted.length
  const [page, setPage] = useState(() => Math.max(0, sorted.findIndex((j) => j.id === initialJourneyId)))
  const goTo = (i: number) => { setPage(Math.max(0, Math.min(count - 1, i))) }
  // Removing a journey can leave `page` pointing past the new end.
  useEffect(() => { setPage((p) => Math.max(0, Math.min(count - 1, p))) }, [count])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey) }
  }, [onClose])

  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = t ? { x: t.clientX, y: t.clientY } : null
  }
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    const t = e.changedTouches[0]
    if (!start || !t) return
    const dx = t.clientX - start.x, dy = t.clientY - start.y
    // Horizontal-dominant only, so scrolling a long note never pages by accident.
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(page + (dx < 0 ? 1 : -1))
  }

  const journey = sorted[page]

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-20 flex items-end justify-center sm:items-center sm:bg-ground/60 sm:p-4 sm:backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex h-full w-full flex-col overflow-hidden bg-surface sm:aspect-square sm:h-auto sm:max-h-full sm:max-w-[452px] sm:rounded-lg sm:border sm:border-line sm:shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-extrabold text-ink">Journeys</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-11 place-items-center text-ink-faint transition-colors duration-150 hover:text-ink"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {/* Only ever rendered with at least one journey — this opens from a
            route's own tooltip, which means the clicked journey already
            exists in `journeys`. No empty state to design for here. */}
        {count > 1 && (
          <div className="flex shrink-0 items-center gap-1 border-b border-line px-3 py-2">
            <button
              type="button"
              onClick={() => { goTo(page - 1) }}
              disabled={page === 0}
              aria-label="Previous journey"
              className="hidden size-11 shrink-0 items-center justify-center text-ink-faint transition-colors duration-150 hover:text-accent disabled:opacity-30 sm:grid"
            >
              ‹
            </button>
            <div
              role="tablist"
              aria-label="Journeys on this route"
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') goTo(page + 1)
                if (e.key === 'ArrowLeft') goTo(page - 1)
              }}
              className="flex flex-1 items-center gap-0.5 overflow-x-auto"
            >
              {sorted.map((j, i) => (
                <button
                  key={j.id}
                  type="button"
                  role="tab"
                  aria-selected={i === page}
                  aria-label={`Journey ${i + 1} of ${count}`}
                  onClick={() => { goTo(i) }}
                  className="grid size-11 shrink-0 place-items-center"
                >
                  <span
                    className={`block h-1.5 rounded-[2px] transition-[width] duration-150 motion-reduce:transition-none ${
                      i === page ? 'w-[22px] bg-accent' : 'w-1.5 bg-line-strong'
                    }`}
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => { goTo(page + 1) }}
              disabled={page === count - 1}
              aria-label="Next journey"
              className="hidden size-11 shrink-0 items-center justify-center text-ink-faint transition-colors duration-150 hover:text-accent disabled:opacity-30 sm:grid"
            >
              ›
            </button>
            <span className="tabular ml-1 shrink-0 text-label text-ink-faint">
              {String(page + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
            </span>
          </div>
        )}

        {journey && (
          <div
            className="min-h-0 flex-1"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <JourneyCard
              key={journey.id}
              journey={journey}
              route={routeById.get(journey.id)}
              fromName={data?.byCode.get(journey.fromCode)?.name ?? journey.fromCode}
              toName={data?.byCode.get(journey.toCode)?.name ?? journey.toCode}
              onShowOnMap={() => { onShowOnMap(journey.id) }}
              onRemove={() => { onRemove(journey.id) }}
              readOnly={readOnly}
            />
          </div>
        )}
      </div>
    </div>
  )
}
