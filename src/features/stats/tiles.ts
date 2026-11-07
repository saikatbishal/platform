import { formatKm } from '@/lib/distance.ts'
import type { Totals } from './tally.ts'

/* The figures as the tiles print them. Module-level so StatNumber gets the
   same function every render; it calls them once per frame while counting. */
export const kmFigure = (n: number) => formatKm(n).replace(' km', '')
export const countFigure = (n: number) => Math.round(n).toLocaleString('en-IN')

/**
 * The four totals, in order: label, which total, how to print it.
 *
 * Shared by the strip on the map and the ledger sheet, so the two can never
 * disagree about what a tile is called or how its figure reads.
 */
export const TILES = [
  ['Kilometres', 'km', kmFigure],
  ['Stations', 'stations', countFigure],
  ['States', 'states', countFigure],
  ['Longest', 'longestKm', kmFigure],
] as const satisfies ReadonlyArray<readonly [string, keyof Totals, (n: number) => string]>
