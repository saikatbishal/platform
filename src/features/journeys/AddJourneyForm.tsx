import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, RefObject } from 'react'
import { useStationSearch } from './useStationSearch.ts'
import { useTrainsBetween } from './useTrainsBetween.ts'
import type { TrainOption } from './useTrainsBetween.ts'
import { useTrainTimes } from './useTrainTimes.ts'
import type { StationHit } from './searchStations.ts'
import type { Journey, JourneyDraft, Station } from '@/types/index.ts'

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
  /** The user's journeys so far — station search ranks their states up. */
  journeys?: readonly Journey[]
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
  label, value, onPick, search, exclude, inputRef, onPicked,
}: {
  label: string
  value: StationHit | null
  onPick: (hit: StationHit | null) => void
  search: (q: string, limit?: number) => StationHit[]
  exclude?: string | undefined
  /** This field's own input, so the field before it can hand focus over. */
  inputRef?: RefObject<HTMLInputElement | null> | undefined
  /** Fired on a keyboard pick only — see the call site for why not on a tap. */
  onPicked?: (() => void) | undefined
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const hits = useMemo(
    () => (open && query ? search(query, 6).filter((h) => h.code !== exclude) : []),
    [open, query, search, exclude],
  )

  /*
   * One expression decides three things — whether the list is drawn, what
   * `aria-expanded` claims, and whether a key press belongs to the list or to
   * the form behind it. Keeping them derived from the same value is what stops
   * Escape closing the sheet while a list the user can see is still open.
   */
  const expanded = hits.length > 0
  // `exclude` changes when the other field is picked, which can shorten the
  // list under an index that was valid a render ago.
  const activeIndex = expanded ? Math.min(active, hits.length - 1) : -1

  const inputId = useId()
  const listId = useId()
  const optionId = (i: number) => `${listId}-opt-${i}`

  const ownRef = useRef<HTMLInputElement>(null)
  const ref = inputRef ?? ownRef
  const listRef = useRef<HTMLUListElement>(null)

  // Six results are taller than the list's 240px, so the sixth is reached by
  // keyboard before it is reachable by eye. No `behavior` — the instant scroll
  // is the one `prefers-reduced-motion` would have asked for anyway.
  useEffect(() => {
    if (activeIndex < 0) return
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  /*
   * Both halves of this field replace the other in the DOM, and whichever one
   * was being used is the one that disappears. Left alone, focus lands on
   * <body> and the next Tab restarts from the top of the document.
   *
   * Picking swaps the input for the row, so focus follows to "Change" — but
   * only if it was orphaned, which is exactly the pointer case; a keyboard
   * pick has already moved focus on to the next field and must keep it.
   * Pressing "Change" swaps back, so focus follows to the input.
   */
  const changeRef = useRef<HTMLButtonElement>(null)
  const hadValue = useRef(false)
  useEffect(() => {
    if (hadValue.current && !value) ref.current?.focus()
    else if (!hadValue.current && value && document.activeElement === document.body) {
      changeRef.current?.focus()
    }
    hadValue.current = value !== null
  }, [value, ref])

  const choose = (hit: StationHit, byKeyboard: boolean) => {
    onPick(hit)
    setOpen(false)
    setQuery('')
    setActive(0)
    if (byKeyboard) onPicked?.()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      // Only swallow the key if there is something on screen to close;
      // otherwise it belongs to the sheet.
      if (!expanded) return
      e.stopPropagation()
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      // Otherwise the caret jumps to the end of the query instead.
      e.preventDefault()
      if (!expanded) { setOpen(true); return }
      // Wraps both ways: the end of a six-row list is not a wall.
      setActive(
        e.key === 'ArrowDown'
          ? (activeIndex + 1) % hits.length
          : (activeIndex - 1 + hits.length) % hits.length,
      )
      return
    }
    if (e.key === 'Enter' && expanded) {
      /* The Enter that picks a station is not the Enter that logs the
         journey. Without this, implicit form submission fires on the same
         key press — the form is only saved from logging a half-filled
         journey by the `ready` guard, which is luck, not design. */
      e.preventDefault()
      const hit = hits[activeIndex]
      if (hit) choose(hit, true)
    }
  }

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
            <span className={`ml-2 text-sm ${value.twin ? 'font-semibold text-ink-soft' : 'text-ink-faint'}`}>
              {value.state}
            </span>
          </span>
          <button
            type="button"
            ref={changeRef}
            onClick={() => { onPick(null); setQuery(''); setOpen(true) }}
            className="shrink-0 text-label font-semibold tracking-label text-ink-faint uppercase hover:text-accent"
          >
            Change
          </button>
        </div>
      ) : (
        <input
          id={inputId}
          ref={ref}
          value={query}
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Station name or code"
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0) }}
          onFocus={() => { setOpen(true) }}
          /* Tabbing to the next field must not leave a list of six stations
             hanging over it. Safe because an option swallows its own
             pointer-down, so a tap never blurs the input to begin with. */
          onBlur={() => { setOpen(false) }}
          onKeyDown={onKeyDown}
          className="w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
      )}

      {expanded && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          /* Chrome makes any scrolling box a tab stop, and six results
             overflow 240px — without this, Tab out of the field stops on the
             list itself before reaching the next one. */
          tabIndex={-1}
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-sm border border-line bg-surface"
        >
          {hits.map((h, i) => (
            <li key={h.code} role="presentation">
              <button
                type="button"
                id={optionId(i)}
                role="option"
                aria-selected={i === activeIndex}
                data-active={i === activeIndex}
                /* Out of the tab order, not out of the document: Tab should
                   leave this field for the next one, but the row stays a real
                   button because on a phone it is the thing being tapped. */
                tabIndex={-1}
                /* Selection stays on click so the keyboard still works, but
                   the press is swallowed: without this the input blurs on
                   pointer-down and, on touch, the click that follows can land
                   on whatever the re-render moved under the finger. */
                onPointerDown={(e) => { e.preventDefault() }}
                /* Movement, not `mouseenter` — a row scrolled under a resting
                   cursor by the arrow keys would otherwise steal the highlight
                   back off the key that moved it. */
                onPointerMove={() => { setActive(i) }}
                onClick={() => { choose(h, false) }}
                className={`flex w-full items-baseline gap-2 border-b border-line px-3 py-2.5 text-left last:border-b-0 ${
                  i === activeIndex ? 'bg-surface-2' : ''
                }`}
              >
                <span className="tabular w-14 shrink-0 text-sm text-accent">{h.code}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{h.name}</span>
                {/* A twin's state is the only thing telling it from a
                    same-named station elsewhere — Bilaspur Jn and Bilaspur
                    Road are 600 km apart — so it steps up from label-faint
                    to readable, and to the weight of the name beside it.
                    Every other row keeps it quiet: 8,623 of 8,696 stations
                    don't need it read. */}
                <span className={`shrink-0 text-sm ${h.twin ? 'font-semibold text-ink-soft' : 'text-ink-faint'}`}>
                  {h.state}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * The train picker.
 *
 * Was a native `<select>`, which is exactly the right control for eight
 * options and the wrong one for this: Sealdah to Rampurhat offers 35 trains,
 * and a native select renders that as an OS menu the length of the viewport,
 * overlapping the whole form and the map behind it. There is no CSS that
 * fixes it — the popup is drawn by the operating system, not the page.
 *
 * So this is a listbox built the same way `StationField` above is built, and
 * deliberately so: the two fields sit next to each other in the same form and
 * should not behave like they were written by different people. Every
 * non-obvious line in here is a lesson that field already paid for — the
 * `tabIndex={-1}` on a scrolling box, the swallowed `pointerdown`,
 * `pointermove` instead of `mouseenter`. The comments on those live up there
 * rather than being copied down here.
 *
 * One capability had to be rebuilt rather than inherited. A native select
 * lets you type "13153" and jump; replacing it with a `<div>` would have
 * silently thrown that away, which for a list of 35 numbered trains is the
 * difference between finding yours and scrolling for it. Hence `typed` below.
 */
function TrainField({
  trains, value, onChange, custom, labelledBy,
}: {
  trains: readonly TrainOption[]
  value: string
  onChange: (next: string) => void
  /** The sentinel for "a train that isn't listed" — owned by the form. */
  custom: string
  /**
   * The id of the visible "Train" text above this field.
   *
   * Named rather than wrapped: this field cannot sit inside a `<label>`. A
   * button is a lable element, so a label around this would forward
   * clicks to the trigger — and that is the bug StationField's long comment
   * describes, where a tap on a result activated something else entirely.
   * `aria-labelledby` gives the control the same accessible name with none of
   * the activation behaviour.
   */
  labelledBy: string
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  /*
   * The two synthetic rows bracket the real ones, so the whole list is one
   * array and the arrow keys do not need to know which rows came from the
   * timetable. `value` doubles as each row's id, which is what makes the
   * selected lookup below a find rather than an index sum.
   */
  const rows = useMemo(
    () => [
      { value: '', number: null, name: 'Not recorded — draw the shortest path', stops: null },
      ...trains.map((t) => ({ value: t.number, number: t.number, name: t.name, stops: t.stops })),
      { value: custom, number: null, name: 'A train that isn’t listed…', stops: null },
    ],
    [trains, custom],
  )

  const selectedIndex = rows.findIndex((r) => r.value === value)
  const selected = rows[selectedIndex === -1 ? 0 : selectedIndex]
  const activeIndex = open ? Math.min(Math.max(active, 0), rows.length - 1) : -1

  const triggerId = useId()
  const listId = useId()
  const optionId = (i: number) => `${listId}-opt-${i}`

  const listRef = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (activeIndex < 0) return
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  /*
   * Type-to-jump, the one thing a native select did that a div does not.
   *
   * The buffer is what makes "131" a prefix rather than three separate jumps
   * to 1, 3 and 1 — and it clears after a second, so a pause resets instead
   * of leaving a stale prefix nothing can match.
   *
   * Two passes, in this order, and the order is the point. A number prefix
   * anywhere in the list beats any name match, because a train number is what
   * is printed on the ticket in your hand; only then does it look inside
   * names, where "gour" should find the Sealdah-Malda Town Gour Express.
   * Names are searched on real trains only: the two synthetic rows would
   * otherwise hijack single letters — "s" would land on "Not recorded — draw
   * the shorteSt path" — and they are one Home or End press away regardless.
   *
   * The first version of this was one pass reading
   * `r.number?.toLowerCase().startsWith(q) ?? r.name...includes(q)`, which is
   * wrong in a way that reads as right: `??` only falls through on null and
   * undefined, and a failed `startsWith` is `false`, so the name half never
   * ran for any row that had a number — every real train, i.e. all of them.
   * Caught by testing the matcher against the real Sealdah list rather than
   * by reading it.
   */
  const typed = useRef({ buffer: '', at: 0 })
  const jump = (char: string) => {
    const now = Date.now()
    typed.current.buffer = now - typed.current.at > 1000 ? char : typed.current.buffer + char
    typed.current.at = now
    const q = typed.current.buffer.toLowerCase()

    const byNumber = rows.findIndex((r) => r.number?.toLowerCase().startsWith(q))
    const hit = byNumber !== -1
      ? byNumber
      : rows.findIndex((r) => r.number !== null && r.name.toLowerCase().includes(q))
    if (hit === -1) return

    setActive(hit)
    // Closed, typing picks — the same thing a native select does, so the
    // field is still usable by keyboard without ever opening it.
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
      // Same rule as the station list: only swallow the key if there is
      // something on screen to close, or Escape stops closing the sheet.
      if (!open) return
      e.stopPropagation()
      setOpen(false)
      return
    }
    if (e.key === 'Tab') {
      // Leaving the field must not leave 35 trains hanging over the fields
      // below it. Not prevented — Tab still moves on, the form's own handler
      // still gets its turn.
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        // Opening lands on what is already chosen rather than on row zero, so
        // re-opening a field you have used does not look like it forgot.
        setActive(selectedIndex === -1 ? 0 : selectedIndex)
        setOpen(true)
        return
      }
      setActive(
        e.key === 'ArrowDown'
          ? (activeIndex + 1) % rows.length
          : (activeIndex - 1 + rows.length) % rows.length,
      )
      return
    }
    if (e.key === 'Home' || e.key === 'End') {
      if (!open) return
      e.preventDefault()
      setActive(e.key === 'Home' ? 0 : rows.length - 1)
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      /* The Enter that picks a train is not the Enter that logs the journey —
         the same trap the station list documents. Space would otherwise
         scroll the sheet. */
      e.preventDefault()
      if (!open) { setActive(selectedIndex === -1 ? 0 : selectedIndex); setOpen(true); return }
      choose(activeIndex)
      return
    }
    // Printable single characters only: this must not eat Shift, F5 or Meta+R.
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) jump(e.key)
  }

  return (
    <div className="relative">
      <button
        type="button"
        id={triggerId}
        role="combobox"
        aria-labelledby={labelledBy}
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
        onClick={() => {
          setActive(selectedIndex === -1 ? 0 : selectedIndex)
          setOpen((o) => !o)
        }}
        /* Closes on an outside click and on Tab, and never fires on an option
           press, because each option swallows its own pointerdown — the same
           mechanism that keeps the station input from blurring mid-tap. */
        onBlur={() => { setOpen(false) }}
        onKeyDown={onKeyDown}
        className="flex min-h-11 w-full items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2.5 text-left text-ink focus:border-accent focus:outline-none"
      >
        {selected?.number && (
          <span className="tabular shrink-0 text-sm text-accent">{selected.number}</span>
        )}
        <span className={`min-w-0 flex-1 truncate ${selected?.number ? 'text-ink' : 'text-ink-faint'}`}>
          {selected?.name}
        </span>
        <span aria-hidden="true" className="shrink-0 text-ink-faint">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Train"
          /* Chrome makes any scrolling box a tab stop; see the station list. */
          tabIndex={-1}
          /* 240px, the same ceiling the station list uses — about five rows
             of the 44px minimum, which is enough to read as a list without
             becoming the page. The whole bug this component exists for was a
             menu that ignored any ceiling at all. */
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-sm border border-line bg-surface"
        >
          {rows.map((r, i) => (
            <li key={r.value || `synthetic-${i}`} role="presentation">
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
                {r.number ? (
                  <span className="tabular w-16 shrink-0 text-sm text-accent">{r.number}</span>
                ) : null}
                <span className={`min-w-0 flex-1 truncate ${r.number ? 'text-ink' : 'text-ink-soft'}`}>
                  {r.name}
                </span>
                {r.stops !== null && (
                  <span className="tabular shrink-0 text-sm text-ink-faint">{r.stops} stops</span>
                )}
                {/* The selected row says so even when the highlight is
                    somewhere else, which it always is while arrowing. */}
                {r.value === value && (
                  <span aria-hidden="true" className="shrink-0 text-accent">✓</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
export function AddJourneyForm({ stations, journeys, onAdd, onClose }: Props) {
  const { search } = useStationSearch(stations, journeys)
  const { request, between, loading } = useTrainsBetween()
  const { request: requestTimes, legFor } = useTrainTimes()

  const [from, setFrom] = useState<StationHit | null>(null)
  const [to, setTo] = useState<StationHit | null>(null)
  /* Picking "From" with the keyboard carries on into "To" — the fifteen-second
     path shouldn't need a Tab in the middle of it. Deliberately not done for a
     tap: on a phone that would throw the on-screen keyboard back up over a
     list the thumb had just finished with. */
  const toInputRef = useRef<HTMLInputElement>(null)
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
  const trainLabelId = useId()
  const trainNumber = train === CUSTOM ? customTrain.trim() : train

  // Only a train the timetable knows has times to offer. A hand-entered one
  // never will, which is the point of being able to enter it.
  useEffect(() => {
    if (train && train !== CUSTOM) requestTimes(train)
  }, [train, requestTimes])

  const scheduled = useMemo(
    () => (train && train !== CUSTOM && from && to ? legFor(train, from.code, to.code) : null),
    [train, from, to, legFor],
  )
  /** True once the offered times are already in the fields — nothing left to do. */
  const scheduledApplied =
    scheduled !== null &&
    departureTime === (scheduled.departure ?? '') &&
    arrivalTime === (scheduled.arrival ?? '') &&
    arrivalDayOffset === scheduled.dayOffset

  const ready = from !== null && to !== null && from.code !== to.code && travelledOn !== ''

  const formRef = useRef<HTMLFormElement>(null)

  /* The sheet opens over a button that stays mounted behind it, so without
     this the first Tab walks off into the chrome the scrim is covering.
     Focus lands on the form itself rather than the From field: a container
     takes focus without a phone throwing its keyboard up, and Tab from there
     falls into the first control anyway. Handing focus back on the way out is
     the other half of the same job — Escape used to leave it on the trigger. */
  useEffect(() => {
    const opener = document.activeElement
    formRef.current?.focus()
    return () => { if (opener instanceof HTMLElement) opener.focus() }
  }, [])

  /**
   * Everything Tab can reach in the form as it stands — recomputed per press,
   * because the train picker, the two time fields and the submit button all
   * come and go. `tabIndex >= 0` is what keeps the station results out of it:
   * they are real buttons, deliberately not tab stops.
   */
  const tabbable = () => {
    const root = formRef.current
    if (!root) return []
    return [...root.querySelectorAll<HTMLElement>('input, select, button, textarea, [tabindex]')]
      .filter((el) => el.tabIndex >= 0 && !el.matches(':disabled'))
  }

  /* Tab cycles rather than escaping: past the last control it returns to the
     first, and Shift+Tab off the first goes to the last. A journey is logged
     without leaving the form, so the form is where the keyboard stays. */
  const onFormKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Tab') return
    const list = tabbable()
    const first = list[0]
    const last = list[list.length - 1]
    if (!first || !last) return
    const at = document.activeElement
    // `at === formRef.current` is the first press after opening, when focus is
    // still on the container and has nowhere behind it to go.
    if (e.shiftKey && (at === first || at === formRef.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && at === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <form
      ref={formRef}
      /* A landing spot for focus, not a control — the accent ring belongs on
         the thing the user is actually editing. */
      tabIndex={-1}
      onKeyDown={onFormKeyDown}
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
      className="flex flex-col gap-4 focus:outline-none"
    >
      <StationField
        label="From"
        value={from}
        onPick={setFrom}
        search={search}
        exclude={to?.code}
        onPicked={() => { toInputRef.current?.focus() }}
      />
      <StationField
        label="To"
        value={to}
        onPick={setTo}
        search={search}
        exclude={from?.code}
        inputRef={toInputRef}
      />

      {/* A <div>, not a <label>, for the reason TrainField's `labelledBy`
          prop documents: a button is labelable, so a label wrapped around
          this would forward clicks into the control. The same trap
          StationField hit. */}
      <div className="block">
        <span
          id={trainLabelId}
          className="mb-1.5 block text-label font-semibold tracking-label text-ink-faint uppercase"
        >
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
          <TrainField
            trains={trains}
            value={train}
            onChange={setTrain}
            custom={CUSTOM}
            labelledBy={trainLabelId}
          />
        )}
      </div>

      {/*
        An offer, not a default.
        `Journey.departureTime` is a record of the journey someone took, and
        the timetable cannot know the train left forty minutes late. Filling
        these silently would store a scheduled time as though it were
        observed — and the "over 24h" milestone reads these fields, so a
        quietly-wrong time becomes a quietly-wrong milestone. Pressing the
        button is the user accepting a stated approximation; the word
        "scheduled" is in front of them when they do.
      */}
      {scheduled && !scheduledApplied && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-line px-3 py-2.5">
          <p className="text-sm text-ink-soft">
            The {train} is scheduled{' '}
            <span className="tabular text-ink">
              {scheduled.departure ?? '--:--'} → {scheduled.arrival ?? '--:--'}
            </span>
            {scheduled.dayOffset > 0 && (
              <span className="tabular text-ink-faint"> (+{scheduled.dayOffset}d)</span>
            )}.
          </p>
          <button
            type="button"
            onClick={() => {
              setDepartureTime(scheduled.departure ?? '')
              setArrivalTime(scheduled.arrival ?? '')
              setArrivalDayOffset(scheduled.dayOffset)
              setShowTimes(true)
            }}
            className="rounded-sm border border-line px-3 py-2 text-label font-semibold tracking-label text-ink-soft uppercase hover:bg-surface-2 hover:text-accent"
          >
            Use these
          </button>
        </div>
      )}

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
