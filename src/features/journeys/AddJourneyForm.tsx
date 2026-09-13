import { useEffect, useId, useMemo, useState } from 'react'
import { useStationSearch } from './useStationSearch.ts'
import { useTrainsBetween } from './useTrainsBetween.ts'
import type { StationHit } from './searchStations.ts'
import type { JourneyDraft, Station } from '@/types/index.ts'

/**
 * Log a journey. Structure and behaviour only — the visual pass comes later,
 * so this borrows the app's tokens and nothing else.
 *
 * The order of the fields is the order of the PRD's fifteen seconds: from,
 * to, then the train, because the train list cannot exist until the first two
 * are known. That is the whole reason the reverse index was built — offering
 * every train in India and asking the user to find theirs is the version of
 * this form that nobody finishes.
 */
interface Props {
  stations: readonly Station[] | undefined
  onAdd: (draft: JourneyDraft) => void
  onClose: () => void
}

/**
 * `back` days before today, in the user's own timezone.
 *
 * Not `toISOString()`: that is UTC, and after 05:30 it hands someone in India
 * tomorrow's date — which the schema then rejects as being in the future.
 */
function daysAgo(back: number): string {
  const d = new Date()
  d.setDate(d.getDate() - back)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const today = () => daysAgo(0)

function StationField({
  label, value, onPick, search, exclude,
}: {
  label: string
  value: StationHit | null
  onPick: (hit: StationHit | null) => void
  search: (q: string, limit?: number) => StationHit[]
  exclude?: string | undefined
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const hits = useMemo(
    () => (open && query ? search(query, 6).filter((h) => h.code !== exclude) : []),
    [open, query, search, exclude],
  )

  const inputId = useId()
  const listId = useId()

  /*
   * A <div>, not a <label> — and that is a fix, not a preference.
   *
   * This whole field used to be wrapped in one <label>, which is invalid (a
   * label labels exactly one control, this holds eight) and actively broke
   * selection: a click inside a label is forwarded to its labelable
   * descendant. Tapping a result ran onPick(hit), React swapped the input out
   * for the picked row, and the label then activated the only labelable child
   * left inside it — the "Change" button — which calls onPick(null) and wiped
   * the selection in the same tick. The field cleared itself every time.
   * Reproduced in a headless browser before fixing; it was never touch
   * specific, phones just made it obvious.
   */
  return (
    <div className="relative">
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-label font-semibold tracking-label text-ink-faint uppercase"
      >
        {label}
      </label>
      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-sm border border-line bg-surface-2 px-3 py-2.5">
          <span className="min-w-0">
            <span className="tabular mr-2 text-sm text-accent">{value.code}</span>
            <span className="text-ink">{value.name}</span>
            <span className="ml-2 text-sm text-ink-faint">{value.state}</span>
          </span>
          <button
            type="button"
            onClick={() => { onPick(null); setQuery(''); setOpen(true) }}
            className="shrink-0 text-label font-semibold tracking-label text-ink-faint uppercase hover:text-accent"
          >
            Change
          </button>
        </div>
      ) : (
        <input
          id={inputId}
          value={query}
          role="combobox"
          aria-expanded={hits.length > 0}
          aria-controls={listId}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Station name or code"
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setOpen(true) }}
          className="w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
      )}

      {hits.length > 0 && (
        <ul id={listId} className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-sm border border-line bg-surface">
          {hits.map((h) => (
            <li key={h.code}>
              <button
                type="button"
                /* Selection stays on click so the keyboard still works, but
                   the press is swallowed: without this the input blurs on
                   pointer-down and, on touch, the click that follows can land
                   on whatever the re-render moved under the finger. */
                onPointerDown={(e) => { e.preventDefault() }}
                onClick={() => { onPick(h); setOpen(false); setQuery('') }}
                className="flex w-full items-baseline gap-2 border-b border-line px-3 py-2.5 text-left last:border-b-0 hover:bg-surface-2"
              >
                <span className="tabular w-14 shrink-0 text-sm text-accent">{h.code}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{h.name}</span>
                <span className="shrink-0 text-sm text-ink-faint">{h.state}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function AddJourneyForm({ stations, onAdd, onClose }: Props) {
  const { search } = useStationSearch(stations)
  const { request, between, loading } = useTrainsBetween()

  const [from, setFrom] = useState<StationHit | null>(null)
  const [to, setTo] = useState<StationHit | null>(null)
  const [train, setTrain] = useState<string>('')
  /* A train the timetable has never heard of.
     The dataset is several years old — `schema.sql` keeps `train_number` free
     text for exactly this reason — so a picker limited to what it knows will
     refuse real journeys on newer trains. Entered by hand, stored like any
     other number, and deliberately given no stop list: routeForJourney falls
     back to the shortest path, which is what it already does for the 450
     stations with no timetable at all. */
  const [customTrain, setCustomTrain] = useState('')
  const [travelledOn, setTravelledOn] = useState(today())
  const [note, setNote] = useState('')
  const [showTimes, setShowTimes] = useState(false)
  const [departureTime, setDepartureTime] = useState('')
  const [arrivalTime, setArrivalTime] = useState('')
  const [arrivalDayOffset, setArrivalDayOffset] = useState(0)

  // Ask for a station's shard the moment it is picked, so the train list is
  // usually already there by the time both fields are filled.
  useEffect(() => { if (from) request(from.code) }, [from, request])
  useEffect(() => { if (to) request(to.code) }, [to, request])

  const trains = useMemo(
    () => (from && to ? between(from.code, to.code) : []),
    [from, to, between],
  )
  // A train picked for one pair is meaningless for another.
  useEffect(() => { setTrain(''); setCustomTrain('') }, [from, to])

  const CUSTOM = '#custom'
  const trainNumber = train === CUSTOM ? customTrain.trim() : train

  const ready = from !== null && to !== null && from.code !== to.code && travelledOn !== ''

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!ready || !from || !to) return
        onAdd({
          fromCode: from.code,
          toCode: to.code,
          travelledOn,
          trainNumber: trainNumber || null,
          note: note.trim() || null,
          departureTime: departureTime || null,
          arrivalTime: arrivalTime || null,
          arrivalDayOffset,
        })
      }}
      className="flex flex-col gap-4"
    >
      <StationField label="From" value={from} onPick={setFrom} search={search} exclude={to?.code} />
      <StationField label="To" value={to} onPick={setTo} search={search} exclude={from?.code} />

      <label className="block">
        <span className="mb-1.5 block text-label font-semibold tracking-label text-ink-faint uppercase">
          Train {from && to && <span className="text-ink-faint">— optional</span>}
        </span>
        {!from || !to ? (
          <p className="rounded-sm border border-dashed border-line px-3 py-2.5 text-sm text-ink-faint">
            Pick both stations and the trains that run between them appear here.
          </p>
        ) : loading && trains.length === 0 ? (
          <p className="rounded-sm border border-line px-3 py-2.5 text-sm text-ink-faint">Looking…</p>
        ) : trains.length === 0 ? (
          /* Not an error: 450 stations have no timetable at all, and two real
             stations can sit on different parts of the network. The journey
             still logs — it just routes by inference. */
          <p className="rounded-sm border border-line px-3 py-2.5 text-sm text-ink-faint">
            No through train in the timetable. The route will be drawn as the
            shortest path instead.
          </p>
        ) : (
          <select
            value={train}
            onChange={(e) => { setTrain(e.target.value) }}
            className="w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-ink focus:border-accent focus:outline-none"
          >
            <option value="">Not recorded — draw the shortest path</option>
            {trains.map((t) => (
              <option key={t.number} value={t.number}>
                {t.number} · {t.name} — {t.stops} stops
              </option>
            ))}
            <option value={CUSTOM}>A train that isn&rsquo;t listed…</option>
          </select>
        )}
      </label>

      {train === CUSTOM && (
        <label className="block">
          <span className="mb-1.5 block text-label font-semibold tracking-label text-ink-faint uppercase">
            Train number
          </span>
          <input
            value={customTrain}
            inputMode="numeric"
            autoComplete="off"
            placeholder="12113"
            onChange={(e) => { setCustomTrain(e.target.value) }}
            className="w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
          {/* A FieldNote, not an error: it says what the data can and cannot
              do. The number is kept on the journey; the route is still drawn
              by inference, because we have no stop list for a train the
              timetable predates. */}
          <p className="mt-1.5 text-sm text-ink-faint">
            The timetable is a few years old, so newer trains are missing from it.
            The number is kept with the journey; the route is drawn as the
            shortest path.
          </p>
        </label>
      )}

      <label className="block">
        <span className="mb-1.5 block text-label font-semibold tracking-label text-ink-faint uppercase">
          Travelled on
        </span>
        <input
          type="date"
          value={travelledOn}
          /* The schema refuses a future date (not_in_the_future), so the
             input refuses it too rather than letting the insert fail later.
             There is deliberately no `min`: this is a record of a rail life,
             and the first thing anyone does with one is backfill. A floor of
             a few months would reject the app's own sample journeys, the
             oldest of which is from November 2025. */
          max={today()}
          onChange={(e) => { setTravelledOn(e.target.value) }}
          className="w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-ink focus:border-accent focus:outline-none"
        />
        {/* Today is the default; yesterday is one tap, because an overnight
            train arrives the morning after the day you think of it as. */}
        <div className="mt-2 flex gap-2">
          {([['Today', 0], ['Yesterday', 1]] as const).map(([label, back]) => {
            const value = daysAgo(back)
            const active = travelledOn === value
            return (
              <button
                key={label}
                type="button"
                onClick={() => { setTravelledOn(value) }}
                aria-pressed={active}
                className={`rounded-sm border px-3 py-2 text-label font-semibold tracking-label uppercase ${
                  active
                    ? 'border-accent text-accent'
                    : 'border-line text-ink-faint hover:bg-surface-2 hover:text-accent'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </label>

      {showTimes ? (
        <div className="flex flex-col gap-3 rounded-sm border border-line p-3">
          <div className="flex items-center justify-between">
            <span className="text-label font-semibold tracking-label text-ink-faint uppercase">
              Departure &amp; arrival — optional
            </span>
            <button
              type="button"
              onClick={() => {
                setShowTimes(false)
                setDepartureTime('')
                setArrivalTime('')
                setArrivalDayOffset(0)
              }}
              className="text-label font-semibold tracking-label text-ink-faint uppercase hover:text-accent"
            >
              Remove
            </button>
          </div>
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-sm text-ink-faint">Departed</span>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => { setDepartureTime(e.target.value) }}
                className="w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-ink focus:border-accent focus:outline-none"
              />
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-sm text-ink-faint">Arrived</span>
              <input
                type="time"
                value={arrivalTime}
                onChange={(e) => { setArrivalTime(e.target.value) }}
                className="w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-ink focus:border-accent focus:outline-none"
              />
            </label>
          </div>
          {/* A journey of more than a few days is real on Indian rail — Dibrugarh
              to Kanyakumari runs over three nights — so this cycles rather than
              being a single overnight toggle. */}
          <button
            type="button"
            onClick={() => { setArrivalDayOffset((d) => (d + 1) % 4) }}
            className="self-start text-label font-semibold tracking-label text-ink-faint uppercase hover:text-accent"
          >
            Arrived: {arrivalDayOffset === 0 ? 'same day' : `+${arrivalDayOffset} day${arrivalDayOffset > 1 ? 's' : ''}`}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setShowTimes(true) }}
          className="self-start text-label font-semibold tracking-label text-ink-faint uppercase hover:text-accent"
        >
          + Add departure &amp; arrival times
        </button>
      )}

      <label className="block">
        <span className="mb-1.5 block text-label font-semibold tracking-label text-ink-faint uppercase">
          Note — optional
        </span>
        <input
          value={note}
          placeholder="Overnight, top bunk."
          onChange={(e) => { setNote(e.target.value) }}
          className="w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
      </label>

      <div className="mt-1 flex gap-2">
        <button
          type="submit"
          disabled={!ready}
          className="flex-1 rounded-sm bg-accent px-4 py-3 text-label font-semibold tracking-label text-ground uppercase disabled:opacity-40"
        >
          Log journey
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm border border-line px-4 py-3 text-label font-semibold tracking-label text-ink-soft uppercase hover:bg-surface-2"
        >
          Close
        </button>
      </div>
    </form>
  )
}
