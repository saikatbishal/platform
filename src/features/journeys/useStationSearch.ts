import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildSearchIndex, searchStations, type StationHit } from './searchStations.ts'
import type { Station } from '@/types/index.ts'

/**
 * Station search, ready to hand to an input's onChange.
 *
 * The 8,696 stations are already in memory — they arrive with the map — so
 * this only fetches the ranking file, and only when a form that needs it
 * mounts. Until it lands, search still works; results are just ordered by
 * match quality alone, which is noticeably worse ("del" without ranking has
 * no reason to prefer New Delhi over Deulti) but better than an empty list.
 */
export function useStationSearch(stations: readonly Station[] | undefined): {
  search: (query: string, limit?: number) => StationHit[]
  ranked: boolean
} {
  const [rank, setRank] = useState<Readonly<Record<string, number>> | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`${import.meta.env.BASE_URL}maps/stationrank.json`)
      .then((res) => (res.ok ? (res.json() as Promise<Record<string, number>>) : null))
      .then((r) => { if (!cancelled && r) setRank(r) })
      .catch((e: unknown) => {
        if (import.meta.env.DEV) console.warn('[journeys] station rank failed', e)
      })
    return () => { cancelled = true }
  }, [])

  // Folding 8,696 names on every keystroke is the difference between instant
  // and laggy, so it happens once, when the station list arrives.
  const index = useMemo(() => (stations ? buildSearchIndex(stations) : null), [stations])

  const search = useCallback(
    (query: string, limit = 8) => (index ? searchStations(query, index, rank, limit) : []),
    [index, rank],
  )

  return { search, ranked: rank !== null }
}
