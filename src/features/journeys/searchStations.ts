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
  }>
}

export function buildSearchIndex(stations: readonly Station[]): SearchIndex {
  return {
    rows: stations.map((station) => {
      const name = fold(station.name)
      const starts: number[] = name.length > 0 ? [0] : []
      for (let i = 1; i < name.length; i++) if (name[i - 1] === ' ') starts.push(i)
      return { station, code: station.code.toLowerCase(), name, starts }
    }),
  }
}

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
): StationHit[] {
  const q = fold(query)
  if (q.length === 0) return []

  const scored: Array<{ row: SearchIndex['rows'][number]; tier: Tier; trains: number }> = []
  for (const row of index.rows) {
    const tier = tierFor(row, q)
    if (tier === Tier.None) continue
    scored.push({ row, tier, trains: rank?.[row.station.code] ?? 0 })
  }

  scored.sort((a, b) =>
    // How it matched outranks how busy it is: someone typing an exact code
    // wants that station even if it is a halt, and no amount of traffic
    // should let a substring match jump a code match.
    b.tier - a.tier ||
    b.trains - a.trains ||
    // Shorter name last, so "Delhi" beats "Delhi Safdarjung" at equal traffic.
    a.row.name.length - b.row.name.length ||
    a.row.station.code.localeCompare(b.row.station.code),
  )

  return scored.slice(0, limit).map(({ row, trains }) => ({
    code: row.station.code,
    name: row.station.name,
    state: row.station.state,
    trains,
  }))
}
