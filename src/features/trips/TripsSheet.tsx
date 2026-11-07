import { useEffect, useMemo, useRef, useState } from 'react'
import { useJourneyRoutes } from '@/features/map/useJourneyRoutes.ts'
import type { MapData } from '@/features/map/useMapData.ts'
import type { Journey, Trip } from '@/types/index.ts'
import { formatDay, formatSpan, journeysByTrip, sortTrips, unsortedJourneys, type TripSuggestion } from './trips.ts'
import { statsLine, tripStats } from './tripStats.ts'

/** What the panel opens on: one trip, or the journeys in none. */
export type TripTarget = { kind: 'trip'; id: string } | { kind: 'unsorted' }

interface Props {
  trips: readonly Trip[]
  journeys: readonly Journey[]
  data: MapData | null
  /** The newest chain of journeys in no trip, if any — offered, never applied. */
  suggestion: TripSuggestion | null
  onClose: () => void
  onOpen: (target: TripTarget) => void
  onCreate: (name: string, note: string | null) => Trip
  /** Make a trip and put these journeys in it, in one go — the suggestion's button. */
  onGroup: (name: string, journeyIds: readonly string[]) => Trip
  onDismissSuggestion: (key: string) => void
}

const label = 'text-label font-semibold tracking-label text-ink-faint uppercase'
const field = 'w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-base text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none'

/**
 * Trips — docs/features/trips/prd.md.
 *
 * Every trip, newest travel first, with what each one adds up to; a row for
 * the journeys in no trip, so nothing is ever unreachable from here; and at
 * the top, when there is one, a chain of journeys that looks like a trip,
 * offered with a name field and a button rather than applied.
 *
 * "New trip" asks for a name and nothing else. A trip can be made before the
 * travel — the legs log into it as they happen — or after, from journeys
 * already on the map; either way it starts empty, and empty is a real state.
 *
 * The shell is JourneysSheet's: full screen on a phone, a centred modal from
 * `sm` up, Escape and the scrim close it.
 */
export function TripsSheet({ trips, journeys, data, suggestion, onClose, onOpen, onCreate, onGroup, onDismissSuggestion }: Props) {
  const [mode, setMode] = useState<'list' | 'new'>('list')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (mode === 'new') setMode('list')
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey) }
  }, [mode, onClose])

  const { routes } = useJourneyRoutes(data, journeys)
  const routeById = useMemo(() => new Map(routes.map((r) => [r.id, r])), [routes])
  const byTrip = useMemo(() => journeysByTrip(journeys, trips), [journeys, trips])
  const ordered = useMemo(() => sortTrips(trips, byTrip), [trips, byTrip])
  const unsorted = useMemo(() => unsortedJourneys(journeys, trips), [journeys, trips])
  const thisYear = String(new Date().getFullYear())

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-20 flex items-end justify-center sm:items-center sm:bg-ground/60 sm:p-4 sm:backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'new' ? 'New trip' : 'Trips'}
        className="flex h-full w-full flex-col overflow-hidden bg-surface sm:h-[min(640px,100%)] sm:max-w-[452px] sm:rounded-lg sm:border sm:border-line sm:shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-line py-3 pr-2 pl-5">
          <h2 className="text-lg font-extrabold text-ink">{mode === 'new' ? 'New trip' : 'Trips'}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Take the board down and look at the map"
            className="grid size-11 place-items-center text-ink-faint transition-colors duration-150 hover:text-ink"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {mode === 'new' ? (
          <NewTripForm
            onCancel={() => { setMode('list') }}
            onCreate={(name, note) => { onOpen({ kind: 'trip', id: onCreate(name, note).id }) }}
          />
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {suggestion && (
                <Suggestion
                  key={suggestion.key}
                  suggestion={suggestion}
                  thisYear={thisYear}
                  onGroup={(name) => { onOpen({ kind: 'trip', id: onGroup(name, suggestion.journeys.map((j) => j.id)).id }) }}
                  onDismiss={() => { onDismissSuggestion(suggestion.key) }}
                />
              )}

              {ordered.length === 0 ? (
                <p className="max-w-[40ch] px-5 py-5 text-base leading-relaxed text-ink-soft">
                  No trips yet. A trip is a name for a set of journeys — make one before you go
                  and log each leg into it, or after, from journeys already on the map.
                </p>
              ) : (
                <>
                  <p className={`${label} px-5 pt-4 pb-1.5`}>Your trips</p>
                  <ul>
                    {ordered.map((trip) => {
                      const legs = byTrip.get(trip.id) ?? []
                      const stats = tripStats(legs, routeById)
                      return (
                        <li key={trip.id}>
                          <button
                            type="button"
                            onClick={() => { onOpen({ kind: 'trip', id: trip.id }) }}
                            className="flex min-h-14 w-full flex-col gap-1.5 border-b border-line px-5 py-2.5 text-left transition-colors duration-150 hover:bg-surface-2"
                          >
                            <span className="flex w-full items-baseline gap-3">
                              <span className="min-w-0 flex-1 text-base leading-snug font-semibold break-words text-ink">{trip.name}</span>
                              <span className="tabular shrink-0 text-xs whitespace-nowrap text-ink-faint">
                                {stats.span ? formatSpan(stats.span) : 'Not begun'}
                              </span>
                            </span>
                            <span className="tabular text-label tracking-code text-ink-faint uppercase">
                              {stats.journeys === 0
                                ? `No journeys yet · made ${formatDay(trip.createdAt, thisYear)}`
                                : statsLine(stats)}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}

              {unsorted.length > 0 && (
                <button
                  type="button"
                  onClick={() => { onOpen({ kind: 'unsorted' }) }}
                  className="mt-3 flex min-h-14 w-full flex-col gap-1.5 border-y border-line bg-ground px-5 py-2.5 text-left transition-colors duration-150 hover:bg-surface-2"
                >
                  <span className="text-base leading-snug font-semibold text-ink-soft">Not in a trip</span>
                  <span className="tabular text-label tracking-code text-ink-faint uppercase">
                    {unsorted.length === 1 ? '1 journey' : `${unsorted.length} journeys`}
                  </span>
                </button>
              )}
            </div>

            <footer className="shrink-0 border-t border-line px-5 py-4">
              <button
                type="button"
                onClick={() => { setMode('new') }}
                className="min-h-11 w-full rounded-sm border border-line px-4 text-label font-semibold tracking-label text-ink-soft uppercase transition-colors duration-150 hover:bg-surface-2 hover:text-accent"
              >
                + New trip
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * The chain, the legs it is made of, and a name to give it. The name is
 * never guessed from the stations: the trip is named for where the person
 * went, and a Himachal trip by rail stops in Delhi.
 */
function Suggestion({
  suggestion, thisYear, onGroup, onDismiss,
}: {
  suggestion: TripSuggestion
  thisYear: string
  onGroup: (name: string) => void
  onDismiss: () => void
}) {
  const [name, setName] = useState('')
  const legs = suggestion.journeys
  const first = legs[0]!, last = legs[legs.length - 1]!
  const count = legs.length === 2 ? 'Two journeys' : `${legs.length} journeys`
  const span = formatSpan({ first: first.travelledOn, last: last.travelledOn })

  return (
    <section aria-label="Looks like one trip" className="mx-5 mt-4 mb-2 rounded-sm border border-accent/40 bg-accent-wash px-4 pt-3.5 pb-3">
      <p className="mb-2 text-label font-semibold tracking-label text-accent uppercase">Looks like one trip</p>
      <p className="mb-2.5 text-base leading-relaxed text-ink">
        {count}, {span}, each leaving from where the one before arrived.
      </p>
      <ul className="tabular mb-3 flex flex-col gap-1 text-xs">
        {legs.map((j) => (
          <li key={j.id} className="flex gap-3">
            <span className="w-14 shrink-0 text-ink-faint">{formatDay(j.travelledOn, thisYear)}</span>
            <span className="tracking-code text-ink-soft">{j.fromCode} → {j.toCode}</span>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim() !== '') onGroup(name)
        }}
      >
        <label className="mb-2.5 block">
          <span className={`${label} mb-1.5 block`}>Call it</span>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value) }}
            placeholder="Where you went — Himachal trip"
            autoComplete="off"
            className={field}
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={name.trim() === ''}
            className="min-h-11 flex-1 rounded-sm bg-accent px-4 text-label font-semibold tracking-label text-ground uppercase disabled:opacity-40"
          >
            Group these {legs.length}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-11 rounded-sm px-3 text-label font-semibold tracking-label text-ink-soft uppercase transition-colors duration-150 hover:text-accent"
          >
            Not a trip
          </button>
        </div>
      </form>
    </section>
  )
}

function NewTripForm({ onCancel, onCreate }: { onCancel: () => void; onCreate: (name: string, note: string | null) => void }) {
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)
  useEffect(() => { nameRef.current?.focus() }, [])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim() !== '') onCreate(name, note.trim() || null)
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
        <label className="block">
          <span className={`${label} mb-1.5 block`}>Name</span>
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => { setName(e.target.value) }}
            placeholder="Himachal trip"
            autoComplete="off"
            className={field}
          />
          <span className="mt-1.5 block text-sm text-ink-faint">
            Name it for where you{'’'}re going. The trains only have to get you close.
          </span>
        </label>
        <label className="block">
          <span className={`${label} mb-1.5 block`}>Note — optional</span>
          <input
            value={note}
            onChange={(e) => { setNote(e.target.value) }}
            placeholder="Shimla and Manali, by road from Delhi."
            autoComplete="off"
            className={field}
          />
        </label>
        <p className="rounded-sm border border-dashed border-line px-3 py-2.5 text-sm leading-relaxed text-ink-soft">
          Before you leave or after you{'’'}re back — journeys join it either way. Log each leg
          into it as you go, or add ones already on the map.
        </p>
      </div>
      <div className="flex shrink-0 gap-2 border-t border-line px-5 py-4">
        <button
          type="submit"
          disabled={name.trim() === ''}
          className="min-h-11 flex-1 rounded-sm bg-accent px-4 text-label font-semibold tracking-label text-ground uppercase disabled:opacity-40"
        >
          Make the trip
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-sm border border-line px-4 text-label font-semibold tracking-label text-ink-soft uppercase hover:bg-surface-2"
        >
          Back
        </button>
      </div>
    </form>
  )
}
