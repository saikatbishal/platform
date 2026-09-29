import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { clipNote, MONTHS_SHORT, searchJourneys, type JourneyHit, type MarkRange } from './searchJourneys.ts'
import { useStationSearch } from './useStationSearch.ts'
import type { StationHit } from './searchStations.ts'
import { useJourneyRoutes } from '@/features/map/useJourneyRoutes.ts'
import { formatKm } from '@/lib/distance.ts'
import type { MapData } from '@/features/map/useMapData.ts'
import type { Journey } from '@/types/index.ts'

/**
 * Quick find — `docs/features/quick-find/prd.md`.
 *
 * The second way into a logged journey. The first is tapping its line on the
 * map, which needs you to remember where the line is and to hit a few pixels
 * of it with a thumb; this needs three characters. It ends in the same
 * `JourneysSheet` the map tap opens, deliberately, rather than growing a
 * second journey view.
 *
 * Its shell is `JourneysSheet`'s shell — full screen below `sm` with no scrim,
 * a centred 452px square above it — so the step from a result to the card it
 * opens does not change size on either device. Safe areas are already honoured
 * by the padding on `html`, which is what `inset-0` is inset from.
 *
 * Styling is written here at the call site, the way `AddJourneyForm` and
 * `Milestones` write theirs. No new dependency, no new token.
 */

interface Props {
  /** The whole log. Filtering is this sheet's entire job. */
  journeys: readonly Journey[]
  data: MapData | null
  /**
   * True while the journey card is open on top of this sheet. This sheet stays
   * mounted underneath — closing the card has to come back to the same results
   * at the same scroll position, which it cannot do if it was unmounted — so
   * while the card is up it stops answering Escape and lets the card have it.
   */
  cardOpen: boolean
  onClose: () => void
  onOpenJourney: (journeyId: string) => void
  /** Open the add form with this station prefilled as the origin. */
  onLogFrom: (station: StationHit) => void
}

/** Five, per `decision.md` answer 3: a search screen, not a browse-the-log screen. */
const RECENT_COUNT = 5

/** The `<mark>` the PRD asks for: `--accent` at 15%, ink on top, no padding. */
function Marked({ text, mark }: { text: string; mark: MarkRange | null }) {
  if (!mark) return <>{text}</>
  return (
    <>
      {text.slice(0, mark.start)}
      <mark className="rounded-[2px] bg-accent/15 text-ink">{text.slice(mark.start, mark.end)}</mark>
      {text.slice(mark.end)}
    </>
  )
}

/** The same mark around a whole token — a code, or the month in a date. */
function MarkedWhole({ on, children }: { on: boolean; children: ReactNode }) {
  if (!on) return <>{children}</>
  return <mark className="rounded-[2px] bg-accent/15 text-ink">{children}</mark>
}

const Dot = () => (
  <span aria-hidden="true" className="text-line-strong">
    ·
  </span>
)

/**
 * The date as the row prints it: "12 Sep", and the year too when it is not
 * this one — or when the query was a year, because marking a year the row has
 * decided not to show would mark nothing at all.
 */
function dateParts(travelledOn: string) {
  return {
    day: String(Number(travelledOn.slice(8, 10))),
    month: MONTHS_SHORT[Number(travelledOn.slice(5, 7)) - 1] ?? '',
    year: travelledOn.slice(0, 4),
  }
}

export function FindJourneySheet({ journeys, data, cardOpen, onClose, onOpenJourney, onLogFrom }: Props) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const { hits, terms, date, degraded } = useMemo(
    () => searchJourneys(journeys, query, data?.byCode ?? null),
    [journeys, query, data],
  )

  /*
   * Whether the map could draw a journey, from the same routing the card the
   * row opens will use — not from the stored `distanceKm`, which is 0 both for
   * a journey the graph has no path for and for one logged before the graph
   * had loaded. A row must not say NOT DRAWN about a journey whose own card
   * then draws it.
   *
   * This is a second `useJourneyRoutes` over the log (IndiaMap has the first),
   * and it recomputes only when the log or the map data changes. On a personal
   * log that is tens of shortest-path searches, once — the same call
   * JourneysSheet already makes for its own subset.
   */
  const { routes } = useJourneyRoutes(data, journeys)
  const kmById = useMemo(() => new Map(routes.map((r) => [r.id, r.km])), [routes])

  /* An empty query is the log in date order, so this is where "five recent"
     is decided rather than inside the matcher. Typing shows every match. */
  const blank = terms.length === 0 && date === null
  const rows = blank ? hits.slice(0, RECENT_COUNT) : hits
  const activeIndex = rows.length === 0 ? -1 : Math.min(active, rows.length - 1)

  const listId = useId()
  const optionId = (i: number) => `${listId}-opt-${i}`

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  /* Focused on open: the keyboard comes up with the sheet, and its arrival is
     the transition — there is no slide. */
  useEffect(() => { inputRef.current?.focus() }, [])

  // The arrow keys can move the active row past the bottom of the list.
  useEffect(() => {
    if (activeIndex < 0) return
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  /*
   * Escape's second half. The first half — clearing a non-empty query — is
   * handled on the input and swallowed there, so this only ever sees the
   * Escape that should close the sheet. Skipped entirely while the card is
   * open above, or both would close on one key press.
   */
  useEffect(() => {
    if (cardOpen) return
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey) }
  }, [cardOpen, onClose])

  const noResults = !blank && rows.length === 0
  const countLabel = rows.length === 1 ? '1 match' : `${rows.length} matches`
  const label = blank
    ? 'Recent'
    // Station names and states are missing until stations.json lands, so the
    // count is honestly incomplete. Said in the label rather than covered by a
    // spinner over a list that already holds answers.
    : countLabel + (degraded ? ' · stations still loading' : '')

  /* Announced, not shouted: a live region that fires on every keystroke reads
     the count of a query the user is still halfway through typing. */
  const [announced, setAnnounced] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => { setAnnounced(label) }, 300)
    return () => { clearTimeout(timer) }
  }, [label])

  /*
   * What to offer when nothing matched. Searching all 8,696 stations is the
   * add form's job, so this borrows its search and uses it for one thing only:
   * if the query names a real station the user has never boarded at or arrived
   * in, the empty state can offer the next useful action instead of stopping
   * at "nothing found".
   */
  const { search } = useStationSearch(data?.stations, journeys)
  const travelled = useMemo(() => {
    const codes = new Set<string>()
    for (const j of journeys) { codes.add(j.fromCode); codes.add(j.toCode) }
    return codes
  }, [journeys])
  const suggestion = useMemo(
    () => (noResults ? search(query, 6).find((h) => !travelled.has(h.code)) ?? null : null),
    [noResults, search, query, travelled],
  )

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      // Otherwise the caret jumps to either end of the query instead.
      e.preventDefault()
      if (rows.length === 0) return
      setActive(
        e.key === 'ArrowDown'
          ? Math.min(activeIndex + 1, rows.length - 1)
          : Math.max(activeIndex - 1, 0),
      )
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const row = rows[activeIndex]
      if (row) onOpenJourney(row.journey.id)
      return
    }
    if (e.key === 'Escape' && query.length > 0) {
      /* Clears first, closes second. Swallowed so the window listener above
         does not also see this one and take the sheet down with the query —
         React's root-level delegation means stopPropagation here really does
         stop the native event reaching window. */
      e.stopPropagation()
      setQuery('')
      setActive(0)
    }
  }

  const thisYear = String(new Date().getFullYear())

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-20 flex items-end justify-center sm:items-center sm:bg-ground/60 sm:p-4 sm:backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Find a journey"
        className="flex h-full w-full flex-col overflow-hidden bg-surface sm:aspect-square sm:h-auto sm:max-h-full sm:max-w-[452px] sm:rounded-lg sm:border sm:border-line sm:shadow-2xl"
      >
        {/* No title. The placeholder does that job, and a heading above an
            input adds a line and says nothing the input doesn't. */}
        <div className="flex shrink-0 items-center gap-1 border-b border-line py-3 pr-1 pl-4">
          <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-sm border border-line bg-surface pl-3 focus-within:border-accent">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0 text-ink-faint">
              <circle cx="6.75" cy="6.75" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M10.25 10.25 L14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0) }}
              onKeyDown={onKeyDown}
              /* The most useful thing a placeholder can do is list what the
                 box will look through. `inputmode` stays at text: codes and
                 dates are typed alongside words. */
              placeholder="Station, state, train, note or date"
              aria-label="Find a journey"
              aria-controls={rows.length > 0 ? listId : undefined}
              aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="h-full min-w-0 flex-1 border-0 bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {query.length > 0 ? (
              <button
                type="button"
                onClick={() => { setQuery(''); setActive(0); inputRef.current?.focus() }}
                aria-label="Clear the search"
                /* 44px inside a 44px field, so the target is full height
                   rather than a 10px glyph with air around it. */
                className="grid size-11 shrink-0 place-items-center text-ink-faint transition-colors duration-150 hover:text-ink"
              >
                <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M1 1 L11 11 M11 1 L1 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            ) : (
              /* Pointer-only: a phone has no key to press, and the hint would
                 be a claim the device cannot honour. */
              <kbd className="tabular mr-3 hidden shrink-0 rounded-[2px] border border-line px-1.5 text-label text-ink-faint sm:block">
                /
              </kbd>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search and go back to the map"
            className="grid size-11 shrink-0 place-items-center text-ink-faint transition-colors duration-150 hover:text-ink"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M1 1 L11 11 M11 1 L1 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <span aria-live="polite" className="sr-only">
          {announced}
        </span>

        {!noResults && (
          <div className="shrink-0 px-4 pt-3.5 pb-1.5 text-label font-semibold tracking-label text-ink-faint uppercase">
            {label}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {rows.length > 0 && (
            <div ref={listRef} id={listId} role="listbox" aria-label="Journeys">
              {rows.map((hit, i) => (
                <Row
                  key={hit.journey.id}
                  hit={hit}
                  id={optionId(i)}
                  activeRow={i === activeIndex}
                  km={kmById.get(hit.journey.id)}
                  thisYear={thisYear}
                  onPoint={() => { setActive(i) }}
                  onOpen={() => { onOpenJourney(hit.journey.id) }}
                />
              ))}
            </div>
          )}

          {noResults && (
            <div className="flex flex-col items-start gap-3 px-4 py-5">
              <p className="max-w-[34ch] text-base text-ink-soft">
                Nothing matches {'“'}{query.trim()}{'”'} in your stations, states, trains,
                notes or dates.
              </p>
              {suggestion && (
                <>
                  <p className="max-w-[34ch] text-base text-ink-soft">
                    You haven{'’'}t logged a journey through {suggestion.name} yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => { onLogFrom(suggestion) }}
                    className="min-h-11 rounded-sm border border-line bg-surface px-3.5 text-label font-semibold tracking-label text-ink-soft uppercase transition-colors duration-150 hover:bg-surface-2 hover:text-accent"
                  >
                    + Log one from here
                  </button>
                </>
              )}
            </div>
          )}

          {/* Only reachable if the log emptied while this was open — the
              magnifier itself is gated on having journeys. */}
          {rows.length === 0 && blank && (
            <p className="px-4 py-5 text-base text-ink-soft">Nothing logged yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({
  hit, id, activeRow, km, thisYear, onPoint, onOpen,
}: {
  hit: JourneyHit
  id: string
  activeRow: boolean
  /** Undefined when the rail graph has no route — the NOT DRAWN case. */
  km: number | undefined
  thisYear: string
  onPoint: () => void
  onOpen: () => void
}) {
  const j = hit.journey
  const { day, month, year } = dateParts(j.travelledOn)
  const mark = hit.dateMark
  const showYear = year !== thisYear || mark?.year === true
  const note = j.note !== null && hit.noteMark !== null ? clipNote(j.note, hit.noteMark) : null

  return (
    <button
      type="button"
      id={id}
      role="option"
      aria-selected={activeRow}
      data-active={activeRow}
      /* Out of the tab order, not out of the document: the arrow keys and
         `aria-activedescendant` drive this list from the input, and on a phone
         the row is still the thing being tapped. Same as the station picker. */
      tabIndex={-1}
      /* Movement, not `mouseenter` — a row scrolled under a resting cursor by
         the arrow keys would otherwise steal the highlight off the key. */
      onPointerMove={onPoint}
      onClick={onOpen}
      className={`flex min-h-14 w-full flex-col gap-1.5 border-b border-line px-4 py-2.5 text-left transition-colors duration-150 last:border-b-0 hover:bg-surface-2 ${
        activeRow ? 'bg-surface-2' : ''
      }`}
    >
      <span className="flex w-full items-baseline gap-3">
        <span className="min-w-0 flex-1 text-base leading-snug font-semibold text-ink">
          <Marked text={hit.fromName} mark={hit.fromNameMark} />{' '}
          <span className="text-accent">{'→'}</span>{' '}
          <Marked text={hit.toName} mark={hit.toNameMark} />
        </span>
        <span className="tabular shrink-0 text-xs whitespace-nowrap text-ink-faint">
          {/* A named day marks day and month as one run — two marks with a
              gap between them would read as two separate matches. */}
          {mark?.day === true
            ? <MarkedWhole on>{day} {month}</MarkedWhole>
            : <>{day} <MarkedWhole on={mark?.month === true}>{month}</MarkedWhole></>}
          {showYear && <> <MarkedWhole on={mark?.year === true}>{year}</MarkedWhole></>}
        </span>
      </span>

      {/* Codes, train, distance, and any state that explains the match. Km is
          NOT in --cream here: at 11px it would be muddy (palette trap 3). */}
      <span className="flex w-full flex-wrap items-center gap-x-1.5 gap-y-1 text-label text-ink-faint uppercase">
        <span className="tabular tracking-code">
          <MarkedWhole on={hit.fromCodeMarked}>{j.fromCode}</MarkedWhole>
          {' · '}
          <MarkedWhole on={hit.toCodeMarked}>{j.toCode}</MarkedWhole>
        </span>
        {j.trainNumber !== null && j.trainNumber.length > 0 && (
          <>
            <Dot />
            <span className="tabular tracking-code">
              <Marked text={j.trainNumber} mark={hit.trainMark} />
            </span>
          </>
        )}
        <Dot />
        {km === undefined ? (
          /* The journey is never hidden for being undrawable; the chip takes
             the distance's place and says why there isn't one. */
          <span className="rounded-sm border border-accent/40 bg-accent/10 px-1.5 py-0.5 tracking-label text-ink-soft">
            Not drawn
          </span>
        ) : (
          <span className="tabular tracking-code">{formatKm(km)}</span>
        )}
        {hit.matchedStates.map((state) => (
          <span key={state.name} className="flex items-center gap-1.5">
            <Dot />
            <span className="tracking-label">
              <Marked text={state.name} mark={state.mark} />
            </span>
          </span>
        ))}
      </span>

      {/* Only when the note is why this row is here — otherwise the row would
          have matched for no visible reason. */}
      {note && (
        <span className="block w-full truncate text-xs text-ink-soft">
          <Marked text={note.text} mark={note.mark} />
        </span>
      )}
    </button>
  )
}
