/** The four figures on the stat tiles. */
export interface Totals {
  km: number
  longestKm: number
  stations: number
  states: number
}

/**
 * The stat tiles' live feed while routes draw in.
 *
 * The draw-in paints sixty frames a second, and the tiles have to agree with
 * the map on every one of them — kilometres growing with the lines, a state
 * counted as it fills. Routing that through React state would re-render App,
 * and with it the whole map, every frame; this is a plain subscription
 * instead, and each tile writes its own text node (StatNumber.tsx).
 *
 * `null` means the draw-in is over: the tiles go back to the totals React
 * holds, which the last frame already matched.
 */
export interface Tally {
  emit: (totals: Totals | null) => void
  subscribe: (listener: (totals: Totals | null) => void) => () => void
  /** True from the first frame to the `null` — while it is, the draw-in owns
      the figures and a change to the totals is not animated separately. */
  readonly live: boolean
}

export function createTally(): Tally {
  const listeners = new Set<(totals: Totals | null) => void>()
  let live = false
  return {
    emit(totals) {
      live = totals !== null
      for (const l of listeners) l(totals)
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    get live() { return live },
  }
}
