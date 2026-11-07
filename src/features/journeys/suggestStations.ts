import type { Journey } from '@/types/index.ts'

/**
 * The stations to offer in an empty station field, before anything is typed.
 *
 * The spec's line is "most of my journeys are the same four stations", and
 * the roadmap's target is zero typing for a repeat route. So this answers two
 * questions from the log alone — nothing is stored, the same rule the totals
 * keep:
 *
 * 1. With the other field empty: which stations do you use? Every journey
 *    counts towards both its ends.
 * 2. With the other field filled: where do you go from there? Stations you
 *    have travelled between with that one — in either direction, because the
 *    way back from Katpadi is a Howrah route too — come first, and the
 *    general list fills whatever they leave. Pick Howrah, and To offers your
 *    Howrah destinations; a repeat journey is then two taps.
 *
 * Pure, so `scripts/check-suggest.ts` can run it under plain node.
 */

/**
 * How fast a journey stops counting: it weighs half as much after this many
 * days. Pure frequency keeps a station you stopped using years ago on top for
 * ever; pure recency drops your home station after one trip elsewhere. Six
 * months lets a new routine take over within a season, without a single
 * holiday displacing the station you leave from every week.
 */
export const HALF_LIFE_DAYS = 182

/** The spec's four, and what fits in two rows of chips on a 390px phone. */
export const SUGGESTION_COUNT = 4

const DAY_MS = 86_400_000

export function suggestStations(
  journeys: readonly Journey[],
  /** The station picked in the other field, if any — it anchors the pairing,
      and is never offered itself: a journey needs two different stations. */
  other: string | null,
  now: number,
  limit = SUGGESTION_COUNT,
): string[] {
  const used = new Map<string, number>()
  const paired = new Map<string, number>()
  const add = (to: Map<string, number>, code: string, w: number) => {
    to.set(code, (to.get(code) ?? 0) + w)
  }

  for (const j of journeys) {
    // `travelledOn` is a calendar day; reading both ends as UTC keeps the
    // arithmetic in whole days without a timezone deciding the order. A date
    // after `now` (a clock set wrong) counts as today rather than as more
    // than a whole journey.
    const ageDays = Math.max(0, (now - Date.parse(`${j.travelledOn}T00:00:00Z`)) / DAY_MS)
    const w = 0.5 ** (ageDays / HALF_LIFE_DAYS)
    if (!Number.isFinite(w)) continue
    add(used, j.fromCode, w)
    add(used, j.toCode, w)
    if (other !== null) {
      if (j.fromCode === other) add(paired, j.toCode, w)
      else if (j.toCode === other) add(paired, j.fromCode, w)
    }
  }

  // Heavier first; a tie goes to the code, so the order never shuffles
  // between two renders of the same log.
  const ranked = (m: Map<string, number>) =>
    [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([code]) => code)

  const out: string[] = []
  for (const code of [...ranked(paired), ...ranked(used)]) {
    if (out.length === limit) break
    if (code !== other && !out.includes(code)) out.push(code)
  }
  return out
}
