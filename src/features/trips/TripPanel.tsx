import { useEffect, useMemo, useState } from 'react'
import { useJourneyRoutes } from '@/features/map/useJourneyRoutes.ts'
import type { MapData } from '@/features/map/useMapData.ts'
import { formatKm } from '@/lib/distance.ts'
import type { Journey, Trip } from '@/types/index.ts'
import { byTravelDate, formatDay, formatSpan } from './trips.ts'
import { tripStats } from './tripStats.ts'

interface Props {
  /** Null for the journeys in no trip — the same panel, read-only. */
  trip: Trip | null
  /** Oldest first. */
  legs: readonly Journey[]
  /** The whole log, for "Add journeys". */
  allJourneys: readonly Journey[]
  trips: readonly Trip[]
  data: MapData | null
  /** True while a sheet is open over this panel — the journey card a leg
      opens, the add form — so Escape goes to that and not to both. */
  covered: boolean
  onClose: () => void
  onOpenJourney: (journeyId: string) => void
  onLogInto: () => void
  onAdd: (journeyIds: readonly string[]) => void
  onTakeOut: (journeyId: string) => void
  onSave: (patch: { name: string; note: string | null }) => void
  onDelete: () => void
}

const label = 'text-label font-semibold tracking-label text-ink-faint uppercase'
const field = 'w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-base text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none'
const primary = 'min-h-11 rounded-sm bg-accent px-4 text-label font-semibold tracking-label text-ground uppercase disabled:opacity-40'
const outline = 'min-h-11 rounded-sm border border-line px-3 text-label font-semibold tracking-label text-ink-soft uppercase transition-colors duration-150 hover:bg-surface-2 hover:text-accent'
const quiet = 'min-h-11 rounded-sm px-3 text-label font-semibold tracking-label text-ink-faint uppercase transition-colors duration-150 hover:text-accent'

/**
 * One trip, over the map — the panel half of the trip lens
 * (docs/features/trips/prd.md). The map half is IndiaMap's `lens`: the trip's
 * routes stay as they are, everything else drops to idle.
 *
 * No scrim, on purpose: the map is the point of opening a trip, so the panel
 * sits at the bottom of a phone and in the bottom-right corner from `sm` up,
 * and the map above it stays live — pan it, tap a line.
 *
 * Three states. Viewing: the numbers, the legs, and the ways to add to it —
 * log the next leg into it, or add journeys already logged. Editing: name,
 * note, take a leg out, delete. Picking: every journey not in this trip, to
 * tick. An empty trip is a real state with its own words, not a blank list.
 */
export function TripPanel({
  trip, legs, allJourneys, trips, data, covered, onClose, onOpenJourney, onLogInto, onAdd, onTakeOut, onSave, onDelete,
}: Props) {
  const [mode, setMode] = useState<'view' | 'edit' | 'pick'>('view')

  // Escape steps back one state at a time, then leaves the trip.
  useEffect(() => {
    if (covered) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (mode !== 'view') setMode('view')
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey) }
  }, [covered, mode, onClose])

  const { routes } = useJourneyRoutes(data, legs)
  const routeById = useMemo(() => new Map(routes.map((r) => [r.id, r])), [routes])
  const stats = tripStats(legs, routeById)
  const thisYear = String(new Date().getFullYear())
  const name = trip?.name ?? 'Not in a trip'

  return (
    <section
      aria-label={trip ? `Trip: ${trip.name}` : 'Journeys in no trip'}
      className={`pointer-events-auto absolute inset-x-0 bottom-0 z-10 flex flex-col overflow-hidden rounded-t-lg border border-b-0 border-line bg-surface
                  sm:inset-x-auto sm:right-3 sm:bottom-3 sm:w-[380px] sm:max-h-[calc(100dvh-5.5rem)] sm:rounded-lg sm:border-b sm:shadow-2xl
                  ${mode === 'view' ? 'max-h-[62dvh]' : 'max-h-[88dvh]'}`}
    >
      {mode === 'view' && (
        <>
          <div className="flex shrink-0 items-start gap-2 pt-4 pr-2 pl-5">
            <div className="min-w-0 flex-1">
              <p className={`${label} mb-2`}>{trip ? 'Trip' : 'Journeys'}</p>
              <h2 className="text-xl leading-snug font-extrabold break-words text-ink">{name}</h2>
              <p className="tabular mt-1.5 text-xs text-ink-faint">
                {stats.span
                  ? formatSpan(stats.span)
                  : trip ? `Made ${formatDay(trip.createdAt, thisYear)} · no journeys yet` : 'Every journey is in a trip'}
              </p>
              {trip?.note && <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-ink-soft">{trip.note}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={trip ? `Leave ${trip.name} and see every journey` : 'See every journey'}
              className="grid size-11 shrink-0 place-items-center text-ink-faint transition-colors duration-150 hover:text-ink"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {legs.length > 0 ? (
            <>
              {/* The totals strip's arrangement, at the trip's scale. Km in
                  --cream because it is set at --text-xl; the others in ink. */}
              <dl className="mx-5 mt-3 flex shrink-0 overflow-hidden rounded-sm border border-line">
                <Figure term="Kilometres" value={Math.round(stats.km).toLocaleString('en-IN')} cream />
                <Figure term={stats.journeys === 1 ? 'Journey' : 'Journeys'} value={String(stats.journeys)} />
                <Figure term={stats.states === 1 ? 'State' : 'States'} value={String(stats.states)} />
                {stats.notDrawn > 0 && (
                  <div
                    className="flex flex-col-reverse items-center justify-end border-l border-line bg-surface-2 px-3 py-2.5"
                    title="Not in these totals: the rail graph has no route for them, so their distance is unknown rather than zero."
                  >
                    <dt className={`${label} mt-1.5`}>Not drawn</dt>
                    <dd className="tabular text-xl leading-none text-oxide">{stats.notDrawn}</dd>
                  </div>
                )}
              </dl>
              <ol className="mt-3 min-h-0 flex-1 overflow-y-auto border-t border-line">
                {legs.map((j) => {
                  const r = routeById.get(j.id)
                  return (
                    <li key={j.id}>
                      <button
                        type="button"
                        onClick={() => { onOpenJourney(j.id) }}
                        className="flex min-h-11 w-full items-baseline gap-3 border-b border-line px-5 py-2.5 text-left transition-colors duration-150 last:border-b-0 hover:bg-surface-2"
                      >
                        <span className="tabular w-16 shrink-0 text-xs text-ink-faint">{formatDay(j.travelledOn, thisYear)}</span>
                        <span className="tabular min-w-0 flex-1 truncate text-sm tracking-code text-ink">
                          {j.fromCode} <span className="text-accent">→</span> {j.toCode}
                        </span>
                        {r ? (
                          <span className="tabular shrink-0 text-xs text-ink-faint">{formatKm(r.km)}</span>
                        ) : (
                          <span className="shrink-0 rounded-sm border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-label tracking-label text-ink-soft uppercase">
                            Not drawn
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ol>
            </>
          ) : trip ? (
            <p className="mx-5 mt-4 max-w-[36ch] border-t border-line pt-4 text-base leading-relaxed text-ink-soft">
              Nothing on the map for this one yet. Log each leg into it as you travel, or add
              journeys you{'’'}ve already logged.
            </p>
          ) : null}

          {trip && (
            <div className={`flex shrink-0 flex-col gap-2 border-t border-line px-5 py-4 ${legs.length === 0 ? 'mt-4' : ''}`}>
              <button type="button" onClick={onLogInto} className={primary}>
                + Log a journey into it
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setMode('pick') }} className={`${outline} flex-1`}>
                  {legs.length === 0 ? 'Add journeys already logged' : 'Add journeys'}
                </button>
                <button type="button" onClick={() => { setMode('edit') }} className={outline}>
                  Edit
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {mode === 'edit' && trip && (
        <EditTrip
          trip={trip}
          legs={legs}
          thisYear={thisYear}
          onTakeOut={onTakeOut}
          onCancel={() => { setMode('view') }}
          onSave={(patch) => { onSave(patch); setMode('view') }}
          onDelete={onDelete}
        />
      )}

      {mode === 'pick' && trip && (
        <PickJourneys
          trip={trip}
          allJourneys={allJourneys}
          trips={trips}
          thisYear={thisYear}
          onCancel={() => { setMode('view') }}
          onAdd={(ids) => { onAdd(ids); setMode('view') }}
        />
      )}
    </section>
  )
}

function Figure({ term, value, cream = false }: { term: string; value: string; cream?: boolean }) {
  return (
    <div className="flex flex-1 flex-col-reverse border-r border-line px-3 py-2.5 last:border-r-0">
      <dt className={`${label} mt-1.5`}>{term}</dt>
      <dd className={`tabular text-xl leading-none ${cream ? 'text-cream' : 'text-ink'}`}>{value}</dd>
    </div>
  )
}

function EditTrip({
  trip, legs, thisYear, onTakeOut, onCancel, onSave, onDelete,
}: {
  trip: Trip
  legs: readonly Journey[]
  thisYear: string
  onTakeOut: (journeyId: string) => void
  onCancel: () => void
  onSave: (patch: { name: string; note: string | null }) => void
  onDelete: () => void
}) {
  const [name, setName] = useState(trip.name)
  const [note, setNote] = useState(trip.note ?? '')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim() !== '') onSave({ name, note: note.trim() || null })
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pt-5 pb-4">
        <p className={label}>Edit trip</p>
        <label className="block">
          <span className={`${label} mb-1.5 block`}>Name</span>
          <input value={name} onChange={(e) => { setName(e.target.value) }} autoComplete="off" className={field} />
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

        {legs.length > 0 && (
          <div>
            <p className={`${label} mb-1.5`}>Journeys in it</p>
            <ul className="rounded-sm border border-line">
              {legs.map((j) => (
                <li key={j.id} className="flex min-h-11 items-center gap-3 border-b border-line pl-3 last:border-b-0">
                  <span className="tabular w-16 shrink-0 text-xs text-ink-faint">{formatDay(j.travelledOn, thisYear)}</span>
                  <span className="tabular min-w-0 flex-1 truncate text-sm tracking-code text-ink">
                    {j.fromCode} <span className="text-accent">→</span> {j.toCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => { onTakeOut(j.id) }}
                    aria-label={`Take ${j.fromCode} to ${j.toCode} out of ${trip.name}. It stays on the map.`}
                    className={quiet}
                  >
                    Take out
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-line px-5 py-4">
        {confirmingDelete ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-ink-soft">
              Delete {trip.name}?{' '}
              {legs.length === 0
                ? 'It has no journeys in it.'
                : `${legs.length === 1 ? 'Its journey stays' : `All ${legs.length} of its journeys stay`} on the map, in no trip.`}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setConfirmingDelete(false) }} className={`${outline} flex-1`}>
                Keep it
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="min-h-11 flex-1 rounded-sm border border-line px-3 text-label font-semibold tracking-label text-vermillion uppercase hover:bg-surface-2"
              >
                Delete trip
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button type="submit" disabled={name.trim() === ''} className={`${primary} flex-1`}>Save</button>
            <button type="button" onClick={onCancel} className={outline}>Cancel</button>
            <button
              type="button"
              onClick={() => { setConfirmingDelete(true) }}
              className="min-h-11 rounded-sm px-3 text-label font-semibold tracking-label text-ink-faint uppercase transition-colors duration-150 hover:text-vermillion"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </form>
  )
}

/**
 * Every journey not in this trip, to tick. Journeys in no trip first — the
 * common case is a trip made after the travel, from legs logged as they
 * happened — then ones in another trip, which say which trip they would
 * leave, because one journey is in at most one trip.
 */
function PickJourneys({
  trip, allJourneys, trips, thisYear, onCancel, onAdd,
}: {
  trip: Trip
  allJourneys: readonly Journey[]
  trips: readonly Trip[]
  thisYear: string
  onCancel: () => void
  onAdd: (ids: readonly string[]) => void
}) {
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  const tripName = useMemo(() => new Map(trips.map((t) => [t.id, t.name])), [trips])
  const newestFirst = (a: Journey, b: Journey) => byTravelDate(b, a)
  const loose = allJourneys.filter((j) => j.tripId === null).sort(newestFirst)
  const elsewhere = allJourneys.filter((j) => j.tripId !== null && j.tripId !== trip.id).sort(newestFirst)
  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const row = (j: Journey) => {
    const from = j.tripId === null ? null : tripName.get(j.tripId) ?? null
    return (
      <li key={j.id}>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-line px-5 py-2 transition-colors duration-150 hover:bg-surface-2">
          <input
            type="checkbox"
            checked={picked.has(j.id)}
            onChange={() => { toggle(j.id) }}
            className="size-4 shrink-0 accent-accent"
          />
          <span className="tabular w-16 shrink-0 text-xs text-ink-faint">{formatDay(j.travelledOn, thisYear)}</span>
          <span className="min-w-0 flex-1">
            <span className="tabular block truncate text-sm tracking-code text-ink">
              {j.fromCode} <span className="text-accent">→</span> {j.toCode}
            </span>
            {from && <span className="block truncate text-xs text-ink-faint">Moves it out of {from}</span>}
          </span>
        </label>
      </li>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-5 pt-5 pb-2">
        <p className={label}>Add to {trip.name}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto border-t border-line">
        {loose.length + elsewhere.length === 0 && (
          <p className="px-5 py-5 text-base text-ink-soft">Every journey you{'’'}ve logged is already in this trip.</p>
        )}
        {loose.length > 0 && (
          <>
            <p className={`${label} px-5 pt-3.5 pb-1.5`}>Not in a trip</p>
            <ul className="border-t border-line">{loose.map(row)}</ul>
          </>
        )}
        {elsewhere.length > 0 && (
          <>
            <p className={`${label} px-5 pt-3.5 pb-1.5`}>In another trip</p>
            <ul className="border-t border-line">{elsewhere.map(row)}</ul>
          </>
        )}
      </div>
      <div className="flex shrink-0 gap-2 border-t border-line px-5 py-4">
        <button
          type="button"
          disabled={picked.size === 0}
          onClick={() => { onAdd([...picked]) }}
          className={`${primary} flex-1`}
        >
          {picked.size === 0 ? 'Pick journeys to add' : picked.size === 1 ? 'Add 1 journey' : `Add ${picked.size} journeys`}
        </button>
        <button type="button" onClick={onCancel} className={outline}>Back</button>
      </div>
    </div>
  )
}
