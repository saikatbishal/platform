import { useEffect, useState } from 'react'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { FeatureCollection, Geometry } from 'geojson'
import { geoPath } from 'd3-geo'
import { createIndiaProjection, MAP_WIDTH, MAP_HEIGHT } from '@/lib/projection.ts'
import { parseRailGraph, type RailGraph, type RailGraphWire } from './route.ts'
import type { Station } from '@/types/index.ts'

/** A city label from public/maps/cities.json, pre-sorted by importance. */
interface City { name: string; lon: number; lat: number; pop: number; rank: number; state: string }

/** Everything the map draws, already projected into map space. */
export interface MapData {
  /** One path per state, keyed by the same name as Station.state. */
  states: Array<{ name: string; d: string }>
  /** District borders. Fetched lazily, so absent until zoom asks for them. */
  districts: string[] | null
  /** Rail lines with their scalerank, for level-of-detail filtering. */
  rail: Array<{ rank: number; d: string }>
  cities: Array<{ name: string; rank: number; x: number; y: number }>
  /** Flat [x0,y0,x1,y1,...] for the canvas station field. Avoids 8,696 objects. */
  stationXY: Float32Array
  /** Full records, and a code index, for routing and hit-testing. */
  stations: Station[]
  byCode: Map<string, Station & { x: number; y: number }>
  graph: RailGraph
}

interface RailProps { scalerank?: number }
interface StateProps { st_nm?: string }

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} — ${res.status}. Run \`npm run assets\`.`)
  return (await res.json()) as T
}

function firstObject<T extends Topology>(topo: T) {
  const key = Object.keys(topo.objects)[0]
  if (key === undefined) throw new Error('empty topology')
  return topo.objects[key] as GeometryCollection
}

/**
 * Loads and projects every map layer once.
 *
 * Projection happens here, not per frame: pan and zoom are a 2-D transform on
 * top of these fixed map-space coordinates, so nothing is re-projected while
 * the user drags. That is the whole reason this map needs no tiles.
 */
export function useMapData(): { data: MapData | null; error: string | null } {
  const [data, setData] = useState<MapData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [statesTopo, railTopo, cities, stations, wire] = await Promise.all([
        getJson<Topology>('/maps/states.topo.json'),
        getJson<Topology>('/maps/rail.topo.json'),
        getJson<City[]>('/maps/cities.json'),
        getJson<Station[]>('/data/stations.json'),
        getJson<RailGraphWire>('/maps/railgraph.json'),
      ])
      if (cancelled) return

      const statesFc = feature(statesTopo, firstObject(statesTopo)) as FeatureCollection<Geometry, StateProps>
      const projection = createIndiaProjection(MAP_WIDTH, MAP_HEIGHT, statesFc)
      const path = geoPath(projection)
      const round = (d: string | null) =>
        d ? d.replace(/-?\d+\.\d+/g, (m) => Number(m).toFixed(1)) : ''

      const railFc = feature(railTopo, firstObject(railTopo)) as FeatureCollection<Geometry, RailProps>

      const statePaths: MapData['states'] = []
      for (const f of statesFc.features) {
        const d = round(path(f))
        if (d) statePaths.push({ name: f.properties?.st_nm ?? '', d })
      }

      const railPaths: MapData['rail'] = []
      for (const f of railFc.features) {
        const d = round(path(f))
        if (d) railPaths.push({ rank: f.properties?.scalerank ?? 99, d })
      }

      const cityPts: MapData['cities'] = []
      for (const c of cities) {
        const p = projection([c.lon, c.lat])
        if (p) cityPts.push({ name: c.name, rank: c.rank, x: p[0], y: p[1] })
      }

      const xy = new Float32Array(stations.length * 2)
      const byCode = new Map<string, Station & { x: number; y: number }>()
      let n = 0
      for (const s of stations) {
        const p = projection([s.lon, s.lat])
        if (!p) continue
        xy[n * 2] = p[0]
        xy[n * 2 + 1] = p[1]
        n++
        byCode.set(s.code, { ...s, x: p[0], y: p[1] })
      }

      setData({
        states: statePaths,
        districts: null,
        rail: railPaths,
        cities: cityPts,
        stationXY: xy.subarray(0, n * 2),
        stations,
        byCode,
        graph: parseRailGraph(wire),
      })
    }

    load().catch((e: unknown) => {
      if (!cancelled) setError(e instanceof Error ? e.message : String(e))
    })
    return () => { cancelled = true }
  }, [])

  return { data, error }
}

/**
 * District borders are 162 KB and only wanted from zoom 4 upward, so they are
 * fetched the first time a level-of-detail tier asks for them rather than on
 * first paint.
 */
export async function loadDistricts(
  projectionSource: FeatureCollection<Geometry, StateProps>,
): Promise<string[]> {
  const topo = await getJson<Topology>('/maps/districts.topo.json')
  const fc = feature(topo, firstObject(topo)) as FeatureCollection<Geometry>
  const path = geoPath(createIndiaProjection(MAP_WIDTH, MAP_HEIGHT, projectionSource))
  const out: string[] = []
  for (const f of fc.features) {
    const d = path(f)
    if (d) out.push(d.replace(/-?\d+\.\d+/g, (m) => Number(m).toFixed(0)))
  }
  return out
}
