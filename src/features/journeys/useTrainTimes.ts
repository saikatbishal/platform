import { useCallback, useRef, useState } from 'react'

/**
 * What the timetable says a train is scheduled to do at two stations.
 *
 * Scheduled, never actual — that distinction is the whole reason this exists
 * as an offer rather than a default. `Journey.departureTime` is a record of
 * the journey the person took, and the timetable cannot know the train left
 * forty minutes late. So this fills the fields only when someone presses the
 * button, with the word "scheduled" in front of them when they do.
 *
 * One file per train (see scripts/build-trainstops.ts), so picking a train
 * costs about 0.7 KB gzipped.
 */
export interface ScheduledLeg {
  /** "HH:MM" leaving the origin, or null if the timetable has no time there. */
  departure: string | null
  /** "HH:MM" reaching the destination. */
  arrival: string | null
  /** Midnights crossed between the two: 0 = same day, 1 = the next morning. */
  dayOffset: number
}

/** station code -> [departure, arrival, day of run] */
type TrainTimes = Record<string, [string | null, string | null, number]>

export interface TrainTimesLookup {
  /** Load a train's times. Idempotent; safe to call from an effect. */
  request: (trainNumber: string) => void
  /** Null until the file lands, and null for a train that has no times. */
  legFor: (trainNumber: string, fromCode: string, toCode: string) => ScheduledLeg | null
}

export function useTrainTimes(): TrainTimesLookup {
  const [loaded, setLoaded] = useState<ReadonlyMap<string, TrainTimes>>(new Map())
  const asked = useRef(new Set<string>())

  const request = useCallback((trainNumber: string) => {
    const key = trainNumber.slice(0, 5)
    if (!key || asked.current.has(key)) return
    asked.current.add(key)
    fetch(`${import.meta.env.BASE_URL}maps/traintimes/${key}.json`)
      .then((res) => (res.ok ? (res.json() as Promise<Record<string, TrainTimes>>) : null))
      .then((shard) => {
        if (!shard) return
        setLoaded((prev) => {
          const next = new Map(prev)
          for (const [number, times] of Object.entries(shard)) next.set(number, times)
          return next
        })
      })
      .catch((e: unknown) => {
        // Never fatal. Without times the fields simply stay empty and are
        // typed by hand, which is what happened before this existed.
        if (import.meta.env.DEV) console.warn(`[journeys] times for ${key} failed`, e)
      })
  }, [])

  const legFor = useCallback(
    (trainNumber: string, fromCode: string, toCode: string): ScheduledLeg | null => {
      const t = loaded.get(trainNumber)
      const a = t?.[fromCode]
      const b = t?.[toCode]
      if (!a || !b) return null
      // Nothing to offer if the timetable has neither end of the leg.
      if (a[0] === null && b[1] === null) return null
      return {
        departure: a[0],
        arrival: b[1],
        // Day of run is 1-based at the origin, so the difference is the
        // number of midnights — exactly what Journey.arrivalDayOffset means.
        dayOffset: Math.max(0, b[2] - a[2]),
      }
    },
    [loaded],
  )

  return { request, legFor }
}
