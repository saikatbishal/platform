import type { Station } from '@/types/index.ts'

/**
 * Station search for the entry form.
 *
 * Runs entirely in the browser: all 8,696 stations already ship with the app
 * (public/data/stations.json) and are in memory by the time anyone opens the
 * form, so a keystroke costs a scan of an array, not a network round trip.
 * The PRD budgets four seconds for picking a station — a request cannot beat
 * a filter.
 *
 * The hard part is not matching, it is ordering. Typing "del" matches Delhi,
 * New Delhi, Delhi Cantt, Deulti and about forty halts nobody has heard of.
 * Nothing in stations.json says which of those a person probably meant, so
 * ranking uses the one importance signal the timetable gives us: how many
 * trains call there (public/maps/stationrank.json, built alongside the
 * reverse index). Kanpur Central scores 298, a suburban halt scores 2.
 */
export interface StationHit {
  code: string
  name: string
  state: string
  /** Trains calling here — shown as a subtitle cue, and the tie-breaker. */
  trains: number
  /**
   * Another station in a *different* state goes by the same name once the
   * suffixes are stripped — Bilaspur Jn (Chhattisgarh) and Bilaspur Road
   * (Uttar Pradesh). The state is then the only thing telling them apart, so
   * the picker stops printing it as a faint afterthought.
   *
   * Measured on the generated stations.json: 39 such groups. A wrong pick
   * among them fails silently — the journey routes, draws and counts, just
   * hundreds of kilometres from where it happened.
   */
  twin: boolean
}

/**
 * How well the query matched, before importance is considered.
 *
 * A plain object rather than an `enum`: this project sets
 * `isolatedModules`, under which TypeScript rejects `const enum` outright,
 * and a regular `enum` emits a runtime object for what is only ever four
 * numbers compared against each other.
 */
const Tier = {
  None: 0,
  /** The name contains it anywhere — "gar" in "Raigarh". */
  NameAnywhere: 1,
  /**
   * The code starts with it — "HW" for HWH.
   *
   * Below WordStart on purpose, which is not the obvious order. Rank it above
   * and "del" answers with Deorakot (DELO, 56 trains) before New Delhi (233),
   * because a partial code match on an obscure station beats the name of the
   * capital. Nobody types three letters hoping for a code they don't know;
   * they type the start of a name they do.
   */
  CodePrefix: 2,
  /** A word of the name starts with it — "del" in "New Delhi". */
  WordStart: 3,
  /**
   * The code is exactly it. This one does stay on top: someone typing "HWH"
   * or "BZA" knows exactly what they mean, and Indian station codes are
   * arbitrary enough that nobody arrives at one by accident.
   */
  CodeExact: 4,
} as const
type Tier = (typeof Tier)[keyof typeof Tier]

/** Fold to comparable letters: case, punctuation and spacing all vary. */
const fold = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/**
 * A name with the words that only say what *kind* of stop it is taken off, so
 * "Bilaspur Jn" and "Bilaspur Road" compare equal. "New" and "Central" stay:
 * New Delhi and Delhi are different places to the person typing.
 */
const SUFFIX = /\b(?:jn|junction|road|rd|halt|h|cantt|cantonment|city|town)\b/g
const core = (folded: string) => folded.replace(SUFFIX, ' ').replace(/\s+/g, ' ').trim()

/**
 * Prepared once per station list, not per keystroke — `fold` over 8,696 names
 * on every character typed is the difference between instant and laggy.
 */
export interface SearchIndex {
  readonly rows: ReadonlyArray<{
    station: Station
    code: string
    name: string
    /** Start offset of each word in `name`, for the word-prefix test. */
    starts: readonly number[]
    /** See `StationHit.twin`. */
    twin: boolean
  }>
  /** Every station's state, by code — how a journey's endpoints become the
      user's states without another pass over the list. */
  readonly stateOf: ReadonlyMap<string, string>
}

export function buildSearchIndex(stations: readonly Station[]): SearchIndex {
  // Which states each core name occurs in. A name shared only within one
  // state (Ahmedabad Jn / Ahmedabad Cantt, both Gujarat) is not a twin: the
  // state cannot tell those apart, the code can, and the code is already
  // printed first on every row.
  const statesByCore = new Map<string, Set<string>>()
  const folded = stations.map((station) => {
    const name = fold(station.name)
    const c = core(name)
    let set = statesByCore.get(c)
    if (!set) statesByCore.set(c, (set = new Set()))
    set.add(station.state)
    return { station, name, c }
  })

  return {
    rows: folded.map(({ station, name, c }) => {
      const starts: number[] = name.length > 0 ? [0] : []
      for (let i = 1; i < name.length; i++) if (name[i - 1] === ' ') starts.push(i)
      const twin = c.length > 0 && (statesByCore.get(c)?.size ?? 0) > 1
      return { station, code: station.code.toLowerCase(), name, starts, twin }
    }),
    stateOf: new Map(stations.map((s) => [s.code, s.state])),
  }
}

/**
 * How much a station in one of your own states outweighs one elsewhere, when
 * both matched the query equally well.
 *
 * Multiplied into the train count rather than stacked above it as its own
 * tier, and that is the whole design. As a tier, a two-train halt in West
 * Bengal would beat New Delhi for anyone who has ever boarded at Howrah —
 * "del" would stop meaning Delhi. As a factor it only decides between
 * stations of comparable weight, which is exactly the "Rampur" case: several
 * similar stations, and the one in the state you travel from is the one you
 * meant.
 *
 * Why 3 and not more, measured (research.md §2): at 4, a West Bengal traveller
 * typing "kan" pushes Kanpur Central (298 trains) below a 74-train halt, and a
 * UP traveller typing "pat" loses Patna to fourth place. At 3 both stay in the
 * top three, while "rampur" still answers Rampurhat for Bengal and Rampur for
 * UP, and "bilaspur" still puts Chhattisgarh's halts above Bilaspur Road for
 * someone who travels there.
 */
export const HOME_STATE_BOOST = 3

function tierFor(row: SearchIndex['rows'][number], q: string): Tier {
  if (row.code === q) return Tier.CodeExact
  for (const at of row.starts) if (row.name.startsWith(q, at)) return Tier.WordStart
  if (row.code.startsWith(q)) return Tier.CodePrefix
  return row.name.includes(q) ? Tier.NameAnywhere : Tier.None
}

export function searchStations(
  query: string,
  index: SearchIndex,
  rank: Readonly<Record<string, number>> | null,
  limit = 8,
  /** States the user has started or ended a journey in. Empty for someone
      with no journeys yet, which leaves the ranking exactly as it was. */
  homeStates: ReadonlySet<string> = new Set(),
): StationHit[] {
  const q = fold(query)
  if (q.length === 0) return []

  const scored: Array<{ row: SearchIndex['rows'][number]; tier: Tier; trains: number; weight: number }> = []
  for (const row of index.rows) {
    const tier = tierFor(row, q)
    if (tier === Tier.None) continue
    const trains = rank?.[row.station.code] ?? 0
    // +1 so the boost still separates stations before the rank file lands,
    // when every count reads 0 and a factor on 0 would do nothing.
    const weight = (trains + 1) * (homeStates.has(row.station.state) ? HOME_STATE_BOOST : 1)
    scored.push({ row, tier, trains, weight })
  }

  scored.sort((a, b) =>
    // How it matched outranks how busy it is: someone typing an exact code
    // wants that station even if it is a halt, and no amount of traffic
    // should let a substring match jump a code match.
    b.tier - a.tier ||
    b.weight - a.weight ||
    // Shorter name last, so "Delhi" beats "Delhi Safdarjung" at equal traffic.
    a.row.name.length - b.row.name.length ||
    a.row.station.code.localeCompare(b.row.station.code),
  )

  return scored.slice(0, limit).map(({ row, trains }) => ({
    code: row.station.code,
    name: row.station.name,
    state: row.station.state,
    trains,
    twin: row.twin,
  }))
}
