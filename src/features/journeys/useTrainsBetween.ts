import { useCallback, useRef, useState } from 'react'

/**
 * Which trains run from A to B.
 *
 * Answered from public/maps/stationtrains/, the reverse of trainstops/: keyed
 * by station instead of by train, so this costs the two shards covering the
 * two station codes rather than a scan of all 5,199 stop lists. Each entry is
 * `{ trainNumber: positionInThatTrain }`, which is what makes the direction
 * check arithmetic — a train calling at both stations is only a candidate if
 * it reaches `from` before `to`. See scripts/build-station-trains.ts.
 */
export interface TrainOption {
  number: string
  name: string
  /** Stops between the two stations, inclusive. A rough "how direct is it". */
  stops: number
}

type Shard = Record<string, Record<string, number>>

const shardKey = (code: string) => {
  const c = code.charAt(0).toUpperCase()
  return c >= 'A' && c <= 'Z' ? c : '_'
}

export interface TrainsBetween {
  /** Load what's needed to answer for this station. Idempotent. */
  request: (code: string) => void
  /**
   * Candidates from `from` to `to`, most direct first. Empty until both
   * shards have landed — call `request` for both codes first.
   */
  between: (from: string, to: string) => TrainOption[]
  /** True while either shard or the name file is still on its way. */
  loading: boolean
}

export function useTrainsBetween(): TrainsBetween {
  const [shards, setShards] = useState<ReadonlyMap<string, Shard>>(new Map())
  const [names, setNames] = useState<Readonly<Record<string, string>> | null>(null)
  const [pending, setPending] = useState(0)
  const asked = useRef(new Set<string>())

  const request = useCallback((code: string) => {
    if (!code) return
    const key = shardKey(code)
    const wanted: Array<[string, () => Promise<void>]> = []

    if (!asked.current.has(key)) {
      asked.current.add(key)
      wanted.push([key, async () => {
        const res = await fetch(`${import.meta.env.BASE_URL}maps/stationtrains/${key}.json`)
        if (!res.ok) return
        const shard = (await res.json()) as Shard
        setShards((prev) => new Map(prev).set(key, shard))
      }])
    }
    // Names are one flat file for every train — a route can offer forty
    // candidates spanning a dozen trainstops shards, and a picker showing bare
    // five-digit numbers is unusable: 12951 and 12952 are the same train in
    // opposite directions.
    if (!asked.current.has('#names')) {
      asked.current.add('#names')
      wanted.push(['#names', async () => {
        const res = await fetch(`${import.meta.env.BASE_URL}maps/trainnames.json`)
        if (!res.ok) return
        setNames((await res.json()) as Record<string, string>)
      }])
    }

    for (const [, run] of wanted) {
      setPending((n) => n + 1)
      run()
        .catch((e: unknown) => {
          if (import.meta.env.DEV) console.warn('[journeys] train lookup failed', e)
        })
        .finally(() => { setPending((n) => n - 1) })
    }
  }, [])

  const between = useCallback((from: string, to: string): TrainOption[] => {
    if (!from || !to || from === to) return []
    const a = shards.get(shardKey(from))?.[from]
    const b = shards.get(shardKey(to))?.[to]
    if (!a || !b) return []

    const out: TrainOption[] = []
    for (const [number, i] of Object.entries(a)) {
      const j = b[number]
      // `j <= i` is the same train running the other way. Offering it would
      // be worse than offering nothing.
      if (j === undefined || j <= i) continue
      out.push({ number, name: names?.[number] ?? number, stops: j - i })
    }
    // Fewest intermediate stops first: for a given pair that is the closest
    // thing the timetable gives us to "most direct".
    out.sort((x, y) => x.stops - y.stops || x.number.localeCompare(y.number))
    return out
  }, [shards, names])

  return { request, between, loading: pending > 0 }
}
