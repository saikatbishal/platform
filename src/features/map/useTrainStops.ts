import { useCallback, useRef, useState } from 'react'

/**
 * Stop lists for trains the user has actually ridden, fetched a shard at a
 * time.
 *
 * A journey that records a train number does not need its route inferred: the
 * train's own stop list is the route. All 5,208 of them are 385 KB gzipped
 * though — five times the whole rail graph — so they ship split across 251
 * files keyed by the first three characters of the train number, and this
 * fetches only the ones a journey on screen actually asks for. See
 * scripts/build-trainstops.ts.
 */
export interface TrainStops {
  /** Ordered station codes per train number, for every shard that has landed. */
  stops: ReadonlyMap<string, readonly string[]>
  /**
   * Ask for a train's stop list. Cheap and idempotent — safe to call from a
   * render pass or an effect that runs often. Each shard is fetched at most
   * once, whether it succeeds, 404s, or fails.
   */
  request: (trainNumber: string) => void
}

export function useTrainStops(): TrainStops {
  const [stops, setStops] = useState<ReadonlyMap<string, readonly string[]>>(new Map())
  /** Shard keys already fetched or in flight. Never retried: a miss is a
      permanent fact about the data, not a transient failure worth hammering. */
  const requested = useRef(new Set<string>())

  const request = useCallback((trainNumber: string) => {
    const key = trainNumber.slice(0, 3)
    if (key.length < 1 || requested.current.has(key)) return
    requested.current.add(key)

    // BASE_URL matters here for the same reason it does in useMapData: this
    // app is served under /platform/, so a bare "/maps/..." would miss.
    fetch(`${import.meta.env.BASE_URL}maps/trainstops/${key}.json`)
      .then((res) => {
        // A 404 is ordinary — no train in the data starts with those three
        // characters. Nothing to merge, and nothing to warn about.
        if (!res.ok) return null
        return res.json() as Promise<Record<string, string[]>>
      })
      .then((shard) => {
        if (!shard) return
        setStops((prev) => {
          const next = new Map(prev)
          for (const [number, seq] of Object.entries(shard)) next.set(number, seq)
          return next
        })
      })
      .catch((e: unknown) => {
        // Never fatal. Without a stop list the journey is still drawn, just by
        // the inferred shortest path, which is what happened for every journey
        // before this existed.
        if (import.meta.env.DEV) console.warn(`[map] train shard ${key} failed`, e)
      })
  }, [])

  return { stops, request }
}
