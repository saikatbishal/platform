import type { Journey, Station } from '@/types/index.ts'

/**
 * Quick find's matcher — see `docs/features/quick-find/prd.md` §6.
 *
 * A pure function over journeys already in memory: no index, no dependency,
 * no network. The log is a personal one, so a linear scan per keystroke costs
 * nothing a finger could notice, and the thing that actually decides whether
 * this feature works is the *order* matches come back in, not the speed of
 * finding them.
 *
 * It lives apart from the sheet so the ranking can be reasoned about — and
 * tested — without mounting React. Everything presentational is left to the
 * caller; what comes back is which journeys matched, how well, and the
 * character range to put a `<mark>` around in each field, because only the
 * matcher knows where the match was.
 *
 * `searchStations.ts` is this file's sibling, and the two fold a query the
 * same way on purpose: someone typing "kerala" into either box means the same
 * thing by it.
 */

/** Half-open character range into a field, for the `<mark>` around a match. */
export interface MarkRange {
  start: number
  end: number
}

/**
 * The station facts this needs, which is two of the six `Station` carries.
 * `MapData['byCode']` satisfies it as-is — declared this narrowly so the
 * matcher can also be called with a hand-written Map in a test.
 */
export type StationLookup = ReadonlyMap<string, Pick<Station, 'name' | 'state'>>

/** One journey that matched, and everywhere the query landed on it. */
export interface JourneyHit {
  journey: Journey
  /** Sum of each term's best tier. Ties break on `travelledOn`, newest first. */
  score: number
  /** Resolved through `byCode`; falls back to the code when it cannot be. */
  fromName: string
  toName: string
  fromNameMark: MarkRange | null
  toNameMark: MarkRange | null
  /** Codes are marked whole or not at all — tier 6 is an exact match. */
  fromCodeMarked: boolean
  toCodeMarked: boolean
  trainMark: MarkRange | null
  /**
   * Which parts of the date matched, rather than a range into it: the row
   * formats the date itself ("12 Sep", "9 Mar 2025"), and a query of `sept`
   * has to mark a printed `Sep` that is shorter than the term that found it.
   * Naming the parts sidesteps that arithmetic entirely.
   */
  dateMark: DateMark | null
  /** Into `journey.note` in full — clip it for display with `clipNote`. */
  noteMark: MarkRange | null
  /**
   * The states worth printing on this row: one matched a term that appears
   * nowhere in either station name, so without it the row has matched for no
   * visible reason. "Why did `kerala` bring up Ernakulam" is the case.
   */
  matchedStates: Array<{ name: string; mark: MarkRange | null }>
}

/** A row's date, by part. `day` is only ever set alongside `month`. */
export interface DateMark {
  day: boolean
  month: boolean
  year: boolean
}

/**
 * A calendar day the query named: `19 sept`, `19th september`, `19/09`,
 * `19.09`, `sept 19th`, with or without a year after it.
 */
export interface DayQuery {
  /** 1–31. */
  day: number
  /** 0–11, as `MONTH_NAMES` indexes it. */
  month: number
  /** Only when one was typed. Without it, 19 September of every year matches. */
  year: number | null
}

export interface JourneySearch {
  hits: JourneyHit[]
  /**
   * The folded query, deduped, less any day it named — that is in `date`.
   * The query is blank only when both are empty; a query of just `19/09`
   * has no terms and is not "no query".
   */
  terms: string[]
  date: DayQuery | null
  /**
   * True when `byCode` was not available, so station names and states could
   * not be consulted — tiers 5, 3 and the name half of tier 0 are missing.
   * The caller says so in the count label rather than showing a spinner: a
   * search over codes, trains, notes and dates is most of one, and a spinner
   * over a list that already has answers in it is a lie.
   */
  degraded: boolean
}

/**
 * The tiers, exactly as the PRD's table numbers them.
 *
 * Tier 0 is a real match that adds nothing to the score, so "did it match"
 * can never be a truthiness test anywhere in this file — `null` is the only
 * no-match. That is the one trap in here.
 */
const Tier = {
  /** Station code, exact — `ypr`. */
  CodeExact: 6,
  /** A word of a station name starts with the term — `chen` finds Chennai Central. */
  NameWord: 5,
  /** Train number, prefix — `126`. */
  TrainPrefix: 4,
  /** A word of either end's state starts with the term — `kera` finds Kerala. */
  StateWord: 3,
  /** A four-digit year, a month name by its first three letters or more, or a day — `19 sept`. */
  Date: 2,
  /** A word of the note starts with the term — `bunk`. */
  NoteWord: 1,
  /** Anywhere inside a name or a note — `gar` finds Raigarh. */
  Anywhere: 0,
} as const
type Tier = (typeof Tier)[keyof typeof Tier]

/**
 * Month names in full, lowercase, index 0 = January. Tier 2 matches a prefix
 * of these, which is what makes `sep`, `sept` and `september` all find the
 * same journeys without a table of abbreviations to keep in step.
 */
export const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const

/**
 * What a row prints. `en-IN` with `month: 'short'` produces exactly these, and
 * `JourneyCard` gets its date that way — but a row has to mark the month on
 * its own, so it needs the token rather than a finished string.
 */
export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const

/** The month a word names, by three letters or more — `sep`, `sept`, `september` — or -1. */
function monthOf(word: string): number {
  if (word.length < 3) return -1
  return MONTH_NAMES.findIndex((m) => m.startsWith(word))
}

/*
 * The three ways a day gets typed. Run against the raw lowercased query, not
 * the folded one: folding turns `19/09` into the two terms `19` and `09`,
 * which on their own mean a train number and nothing.
 *
 * Numbers are read day first, as they are written in India — `09/10` is the
 * 9th of October, never September the 10th. A number glued to a digit on
 * either side is not a day, which is what keeps `12626` a train, and `sep
 * 2025` a month and a year rather than the 20th of September.
 */
const ORDINAL = '(?:st|nd|rd|th)?'
const YEAR_AFTER = '(?:[\\s,]+(\\d{4}))?'
const DAY_PATTERNS: ReadonlyArray<{ re: RegExp; read: (m: RegExpExecArray) => ReadonlyArray<string | undefined> }> = [
  // 19/09, 19.09, 19-09, 19/09/2025, 19.09.25
  { re: /(?<!\d)(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{4}|\d{2}))?(?![\d/.-])/g, read: (m) => [m[1], m[2], m[3]] },
  // 19 sept, 19th september, 19sep, 19th of sept 2025
  {
    re: new RegExp(`(?<![a-z\\d])(\\d{1,2})${ORDINAL}\\s*(?:of\\s+)?([a-z]+)\\.?${YEAR_AFTER}(?![a-z\\d])`, 'g'),
    read: (m) => [m[1], m[2], m[3]],
  },
  // sept 19, sept 19th, september 19th, 2025
  {
    re: new RegExp(`(?<![a-z\\d])([a-z]+)\\.?\\s*(\\d{1,2})${ORDINAL}(?![a-z\\d])${YEAR_AFTER}(?![a-z\\d])`, 'g'),
    read: (m) => [m[2], m[1], m[3]],
  },
]

/**
 * The first real day named in `query`, and the query with that phrase taken
 * out so the rest can be searched as terms — `kerala 19 sept` is a Kerala end
 * AND the 19th of September.
 *
 * "Real" is checked, not assumed: `31/02` and `2 bunk` both have the shape of
 * a day and neither is one, so they fall through and are searched as the
 * words they are.
 */
export function parseDay(query: string): { date: DayQuery; rest: string } | null {
  const lower = query.toLowerCase()
  for (const { re, read } of DAY_PATTERNS) {
    re.lastIndex = 0
    for (let m = re.exec(lower); m !== null; m = re.exec(lower)) {
      const [dayText, monthText, yearText] = read(m)
      if (dayText === undefined || monthText === undefined) continue

      const day = Number(dayText)
      const month = /^\d+$/.test(monthText) ? Number(monthText) - 1 : monthOf(monthText)
      const year = yearText === undefined ? null
        : yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText)
      if (month < 0 || month > 11 || day < 1) continue
      // Without a year, 29 February is allowed — a leap year stands in.
      if (day > new Date(Date.UTC(year ?? 2024, month + 1, 0)).getUTCDate()) continue

      return {
        date: { day, month, year },
        rest: `${lower.slice(0, m.index)} ${lower.slice(m.index + m[0].length)}`,
      }
    }
  }
  return null
}

/** The fold `searchStations.ts` uses: case, punctuation and spacing all vary. */
const fold = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/**
 * A query as terms. Multi-word queries are AND-ed, so each term is matched
 * against the whole journey independently — `top bunk` needs both, `kerala
 * 2025` needs a Kerala end and a 2025 date, and neither needs the two terms
 * to land in the same field.
 *
 * Deduped because a repeated term would otherwise be scored twice, quietly
 * ranking `delhi delhi` above `delhi`.
 */
export function foldTerms(query: string): string[] {
  const folded = fold(query)
  return folded.length === 0 ? [] : [...new Set(folded.split(' '))]
}

/**
 * Where `term` starts a word in the already-lowercased `lower`, or -1.
 *
 * A word, not a plain prefix: "chen" should find "Chennai Central" and
 * "central" should find it too, while "hen" should not — an infix match is
 * tier 0's job, and tier 0 ranks below everything.
 */
function wordIndex(lower: string, term: string): number {
  let i = lower.indexOf(term)
  while (i >= 0) {
    // At i === 0 charAt(-1) is '', which fails the class test — which is
    // exactly the answer wanted there.
    if (!/[a-z0-9]/.test(lower.charAt(i - 1))) return i
    i = lower.indexOf(term, i + 1)
  }
  return -1
}

const hasWord = (text: string, term: string) => wordIndex(text.toLowerCase(), term) >= 0

/**
 * The earliest place any term lands in `text` — one `<mark>` per field, which
 * is what the PRD asks for, and the earliest is the one a reader's eye reaches
 * first. `loose` also allows an infix, for the fields tier 0 can match on.
 */
function markIn(text: string, terms: readonly string[], loose = false): MarkRange | null {
  const lower = text.toLowerCase()
  let best: MarkRange | null = null
  for (const term of terms) {
    let at = wordIndex(lower, term)
    if (at < 0 && loose) at = lower.indexOf(term)
    if (at < 0) continue
    if (!best || at < best.start) best = { start: at, end: at + term.length }
  }
  return best
}

/** Everything about one journey that a term gets tested against. */
interface Ctx {
  journey: Journey
  fromName: string
  toName: string
  fromState: string
  toState: string
  /** False while `byCode` is missing: names and states are unknown, not empty. */
  namesKnown: boolean
  year: string
  monthIndex: number
  day: number
}

const onDay = (ctx: Ctx, date: DayQuery) =>
  ctx.day === date.day && ctx.monthIndex === date.month &&
  (date.year === null || ctx.year === String(date.year))

/** Every part of the row's date the query touched — the named day, then any year or month term. */
function dateMarkFor(ctx: Ctx, terms: readonly string[], date: DayQuery | null): DateMark | null {
  const mark: DateMark = { day: date !== null, month: date !== null, year: date !== null && date.year !== null }
  for (const term of terms) {
    const part = datePart(ctx, term)
    if (part !== null) mark[part] = true
  }
  return mark.day || mark.month || mark.year ? mark : null
}

function datePart(ctx: Ctx, term: string): 'year' | 'month' | null {
  if (/^\d{4}$/.test(term)) return term === ctx.year ? 'year' : null
  // Two letters is not a month, it is half of every word: `ma` would claim
  // March and May and mean neither.
  if (term.length < 3) return null
  const full = MONTH_NAMES[ctx.monthIndex]
  return full !== undefined && full.startsWith(term) ? 'month' : null
}

/** The best tier this term reaches on this journey, or null for no match. */
function tierFor(ctx: Ctx, term: string): Tier | null {
  const j = ctx.journey

  if (j.fromCode.toLowerCase() === term || j.toCode.toLowerCase() === term) return Tier.CodeExact
  if (ctx.namesKnown && (hasWord(ctx.fromName, term) || hasWord(ctx.toName, term))) return Tier.NameWord
  if (j.trainNumber !== null && j.trainNumber.toLowerCase().startsWith(term)) return Tier.TrainPrefix
  if (ctx.namesKnown && (hasWord(ctx.fromState, term) || hasWord(ctx.toState, term))) return Tier.StateWord
  if (datePart(ctx, term) !== null) return Tier.Date
  if (j.note !== null && hasWord(j.note, term)) return Tier.NoteWord

  const haystack = (ctx.namesKnown ? `${ctx.fromName} ${ctx.toName} ` : '') + (j.note ?? '')
  return haystack.toLowerCase().includes(term) ? Tier.Anywhere : null
}

function contextFor(journey: Journey, byCode: StationLookup | null): Ctx {
  const from = byCode?.get(journey.fromCode)
  const to = byCode?.get(journey.toCode)
  return {
    journey,
    // The code stands in for a name the station list does not carry, the way
    // JourneysSheet already does it — an unnamed row beats a blank one.
    fromName: from?.name ?? journey.fromCode,
    toName: to?.name ?? journey.toCode,
    fromState: from?.state ?? '',
    toState: to?.state ?? '',
    namesKnown: byCode !== null,
    year: journey.travelledOn.slice(0, 4),
    monthIndex: Number(journey.travelledOn.slice(5, 7)) - 1,
    day: Number(journey.travelledOn.slice(8, 10)),
  }
}

/**
 * States to print on a row: a state some term matched, where that same term
 * appears nowhere in either station name.
 *
 * The test is `includes`, not a word match, on purpose. If the term is visible
 * in the name at all then the reader can already see why the row is there, and
 * repeating the state would be noise on a line that carries four other things.
 */
function statesToShow(ctx: Ctx, terms: readonly string[]): JourneyHit['matchedStates'] {
  if (!ctx.namesKnown) return []
  const names = `${ctx.fromName} ${ctx.toName}`.toLowerCase()
  const ends = ctx.fromState === ctx.toState ? [ctx.fromState] : [ctx.fromState, ctx.toState]
  const out: JourneyHit['matchedStates'] = []
  for (const state of ends) {
    if (state.length === 0) continue
    const unexplained = terms.filter((t) => hasWord(state, t) && !names.includes(t))
    if (unexplained.length > 0) out.push({ name: state, mark: markIn(state, unexplained) })
  }
  return out
}

/** Where a term prefixes the train number, as a range — always from 0. */
function trainMarkFor(trainNumber: string | null, terms: readonly string[]): MarkRange | null {
  if (trainNumber === null) return null
  const lower = trainNumber.toLowerCase()
  const hit = terms.find((term) => lower.startsWith(term))
  return hit === undefined ? null : { start: 0, end: hit.length }
}

/**
 * Every journey that matches `query`, best first.
 *
 * An empty query is not "everything matched" — it is the log in date order,
 * scored 0 and unmarked, and the caller decides how much of it to show. The
 * sheet shows five of it under RECENT (`decision.md`, answer 3).
 */
export function searchJourneys(
  journeys: readonly Journey[],
  query: string,
  byCode: StationLookup | null,
): JourneySearch {
  const day = parseDay(query)
  const date = day?.date ?? null
  const terms = foldTerms(day?.rest ?? query)
  const degraded = byCode === null

  // Sorted before scoring rather than after, so the date tie-break falls out
  // of a stable sort instead of being spelled out in the comparator twice.
  const byDate = [...journeys].sort((a, b) => b.travelledOn.localeCompare(a.travelledOn))

  const hits: JourneyHit[] = []
  for (const journey of byDate) {
    const ctx = contextFor(journey, byCode)

    // A named day is one more AND-ed condition, worth what any date term is.
    if (date !== null && !onDay(ctx, date)) continue
    let score = date === null ? 0 : Tier.Date
    let matched = true
    for (const term of terms) {
      const tier = tierFor(ctx, term)
      // Null, not falsy — tier 0 is a match worth zero.
      if (tier === null) { matched = false; break }
      score += tier
    }
    if (!matched) continue

    hits.push({
      journey,
      score,
      fromName: ctx.fromName,
      toName: ctx.toName,
      fromNameMark: ctx.namesKnown ? markIn(ctx.fromName, terms, true) : null,
      toNameMark: ctx.namesKnown ? markIn(ctx.toName, terms, true) : null,
      fromCodeMarked: terms.includes(journey.fromCode.toLowerCase()),
      toCodeMarked: terms.includes(journey.toCode.toLowerCase()),
      trainMark: trainMarkFor(journey.trainNumber, terms),
      dateMark: dateMarkFor(ctx, terms, date),
      noteMark: journey.note === null ? null : markIn(journey.note, terms, true),
      matchedStates: statesToShow(ctx, terms),
    })
  }

  hits.sort((a, b) => b.score - a.score || b.journey.travelledOn.localeCompare(a.journey.travelledOn))
  return { hits, terms, date, degraded }
}

/** Roughly one line of note at `--text-xs` on a 360px row. */
const NOTE_BUDGET = 64
/** Enough of the words before the match to leave the excerpt a sentence. */
const NOTE_LEAD = 18

/**
 * One line of a long note, cut around the match.
 *
 * A note can be a paragraph and the row can spare a line of it, so the line
 * has to be the part that matched — clipping from the start would show the
 * reader the one piece of the note that is not why the row is there. Cuts land
 * on spaces so no word is sliced in half, and the returned range is rebased
 * onto the returned text.
 */
export function clipNote(
  note: string,
  mark: MarkRange,
  budget = NOTE_BUDGET,
): { text: string; mark: MarkRange } {
  if (note.length <= budget) return { text: note, mark }

  let start = Math.max(0, mark.start - NOTE_LEAD)
  // A match further than the budget from `start` would be cut off entirely;
  // pull the window forward until the end of it is inside.
  if (mark.end > start + budget) start = Math.max(0, mark.end - budget)
  let end = Math.min(note.length, start + budget)

  // Snap both cuts to spaces, never across the match itself.
  if (start > 0) {
    const space = note.indexOf(' ', start)
    if (space >= 0 && space < mark.start) start = space + 1
  }
  if (end < note.length) {
    const space = note.lastIndexOf(' ', end)
    if (space > mark.end) end = space
  }

  const prefix = start > 0 ? '…' : ''
  const suffix = end < note.length ? '…' : ''
  const shift = prefix.length - start
  return {
    text: prefix + note.slice(start, end) + suffix,
    mark: { start: mark.start + shift, end: mark.end + shift },
  }
}
