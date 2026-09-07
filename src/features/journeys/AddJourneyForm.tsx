import { useEffect, useMemo, useState } from 'react'
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

/** Today in the user's own timezone. `toISOString()` would use UTC and can
    hand someone in India tomorrow's date after 05:30. */
function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

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

  return (
    <label className="relative block">
      <span className="mb-1.5 block text-label font-semibold tracking-label text-ink-faint uppercase">
        {label}
      </span>
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
          value={query}
          autoComplete="off"
          placeholder="Station name or code"
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setOpen(true) }}
          className="w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
      )}

      {hits.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-sm border border-line bg-surface">
          {hits.map((h) => (
            <li key={h.code}>
              <button
                type="button"
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
    </label>
  )
}

export function AddJourneyForm({ stations, onAdd, onClose }: Props) {
  const { search } = useStationSearch(stations)
  const { request, between, loading } = useTrainsBetween()

  const [from, setFrom] = useState<StationHit | null>(null)
  const [to, setTo] = useState<StationHit | null>(null)
  const [train, setTrain] = useState<string>('')
  const [travelledOn, setTravelledOn] = useState(today())
  const [note, setNote] = useState('')

  // Ask for a station's shard the moment it is picked, so the train list is
  // usually already there by the time both fields are filled.
  useEffect(() => { if (from) request(from.code) }, [from, request])
  useEffect(() => { if (to) request(to.code) }, [to, request])

  const trains = useMemo(
    () => (from && to ? between(from.code, to.code) : []),
    [from, to, between],
  )
  // A train picked for one pair is meaningless for another.
  useEffect(() => { setTrain('') }, [from, to])

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
          trainNumber: train || null,
          note: note.trim() || null,
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
          </select>
        )}
      </label>

      <label className="block">
        <span className="mb-1.5 block text-label font-semibold tracking-label text-ink-faint uppercase">
          Travelled on
        </span>
        <input
          type="date"
          value={travelledOn}
          /* The schema refuses a future date (not_in_the_future), so the
             input refuses it too rather than letting the insert fail later. */
          max={today()}
          onChange={(e) => { setTravelledOn(e.target.value) }}
          className="w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-ink focus:border-accent focus:outline-none"
        />
      </label>

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
