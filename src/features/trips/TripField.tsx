import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { Journey, Trip } from '@/types/index.ts'
import { formatSpan, journeysByTrip, sortTrips, tripSpan } from './trips.ts'

/** The value that means "make a new trip" — owned here, read by callers. */
export const NEW_TRIP = '#new-trip'

export interface TripOption {
  trip: Trip
  /** "3–15 Oct 2026", or "No journeys yet" — what tells two "Himachal"s apart. */
  meta: string
}

/** Every trip as an option, in the trips list's order, each with its dates. */
export function tripOptions(trips: readonly Trip[], journeys: readonly Journey[]): TripOption[] {
  const byTrip = journeysByTrip(journeys, trips)
  return sortTrips(trips, byTrip).map((trip) => {
    const span = tripSpan(byTrip.get(trip.id) ?? [])
    return { trip, meta: span ? formatSpan(span) : 'No journeys yet' }
  })
}

/**
 * "Part of a trip" — the add form's field, and the journey card's.
 *
 * The same listbox as the add form's TrainField, written to the same rules
 * (its comments carry the reasoning): a combobox button rather than a native
 * select, because a select cannot show each trip's dates beside its name, and
 * two trips called "Himachal" a year apart are only told apart by those.
 * Arrow keys, Home and End, Enter or Space to pick, Escape to close only the
 * list, type-to-jump by name; Tab closes and moves on.
 *
 * `value` is '' for no trip, a trip id, or NEW_TRIP.
 */
export function TripField({
  options, value, onChange, labelledBy,
}: {
  options: readonly TripOption[]
  value: string
  onChange: (next: string) => void
  /** The id of the visible label — named rather than wrapped, see TrainField. */
  labelledBy: string
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const rows = useMemo(
    () => [
      { value: '', name: 'Not part of a trip', meta: null as string | null, quiet: true },
      ...options.map((o) => ({ value: o.trip.id, name: o.trip.name, meta: o.meta, quiet: false })),
      { value: NEW_TRIP, name: 'New trip…', meta: null, quiet: true },
    ],
    [options],
  )

  const selectedIndex = rows.findIndex((r) => r.value === value)
  const selected = rows[selectedIndex === -1 ? 0 : selectedIndex]
  const activeIndex = open ? Math.min(Math.max(active, 0), rows.length - 1) : -1

  const listId = useId()
  const optionId = (i: number) => `${listId}-opt-${i}`
  const listRef = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (activeIndex < 0) return
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const typed = useRef({ buffer: '', at: 0 })
  const jump = (char: string) => {
    const now = Date.now()
    typed.current.buffer = now - typed.current.at > 1000 ? char : typed.current.buffer + char
    typed.current.at = now
    const q = typed.current.buffer.toLowerCase()
    // Real trips only: the two synthetic rows would otherwise claim "n".
    const hit = rows.findIndex((r) => !r.quiet && r.name.toLowerCase().startsWith(q))
    if (hit === -1) return
    setActive(hit)
    if (!open) onChange(rows[hit]?.value ?? '')
  }

  const choose = (i: number) => {
    const row = rows[i]
    if (!row) return
    onChange(row.value)
    setOpen(false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape') {
      if (!open) return
      e.stopPropagation()
      setOpen(false)
      return
    }
    if (e.key === 'Tab') { setOpen(false); return }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) { setActive(selectedIndex === -1 ? 0 : selectedIndex); setOpen(true); return }
      setActive(e.key === 'ArrowDown' ? (activeIndex + 1) % rows.length : (activeIndex - 1 + rows.length) % rows.length)
      return
    }
    if (e.key === 'Home' || e.key === 'End') {
      if (!open) return
      e.preventDefault()
      setActive(e.key === 'Home' ? 0 : rows.length - 1)
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!open) { setActive(selectedIndex === -1 ? 0 : selectedIndex); setOpen(true); return }
      choose(activeIndex)
      return
    }
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) jump(e.key)
  }

  return (
    <div className="relative">
      <button
        type="button"
        role="combobox"
        aria-labelledby={labelledBy}
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
        onClick={() => { setActive(selectedIndex === -1 ? 0 : selectedIndex); setOpen((o) => !o) }}
        onBlur={() => { setOpen(false) }}
        onKeyDown={onKeyDown}
        className="flex min-h-11 w-full items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2.5 text-left text-ink focus:border-accent focus:outline-none"
      >
        <span className={`min-w-0 flex-1 truncate ${selected?.quiet ? 'text-ink-faint' : 'text-ink'}`}>
          {selected?.name}
        </span>
        {selected?.meta && <span className="tabular shrink-0 text-sm text-ink-faint">{selected.meta}</span>}
        <span aria-hidden="true" className="shrink-0 text-ink-faint">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Trip"
          tabIndex={-1}
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-sm border border-line bg-surface"
        >
          {rows.map((r, i) => (
            <li key={r.value || 'none'} role="presentation">
              <button
                type="button"
                id={optionId(i)}
                role="option"
                aria-selected={r.value === value}
                data-active={i === activeIndex}
                tabIndex={-1}
                onPointerDown={(e) => { e.preventDefault() }}
                onPointerMove={() => { setActive(i) }}
                onClick={() => { choose(i) }}
                className={`flex min-h-11 w-full items-baseline gap-2 border-b border-line px-3 py-2.5 text-left last:border-b-0 ${
                  i === activeIndex ? 'bg-surface-2' : ''
                }`}
              >
                <span className={`min-w-0 flex-1 truncate ${r.quiet ? 'text-ink-soft' : 'text-ink'}`}>{r.name}</span>
                {r.meta && <span className="tabular shrink-0 text-sm text-ink-faint">{r.meta}</span>}
                {r.value === value && <span aria-hidden="true" className="shrink-0 text-accent">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
