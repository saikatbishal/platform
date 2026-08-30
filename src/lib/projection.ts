import { geoConicConformal, type GeoProjection, type GeoPermissibleObjects } from 'd3-geo'

/**
 * The map's own coordinate space. Every layer is projected into this box once,
 * and pan/zoom is a 2-D transform on top of it — so nothing is re-projected
 * while the user drags. That is what makes tiles unnecessary.
 */
export const MAP_WIDTH = 1000
export const MAP_HEIGHT = 1100
const PADDING = 16

/**
 * Turns longitude/latitude into x/y for the hand-drawn map.
 *
 * Why not Mapbox or Leaflet: a tiled world map makes this look like every other
 * map app, and looking like nothing else is the point. d3-geo is used ONLY for
 * the maths — no rendering, no tiles, no DOM. It is a few kilobytes.
 *
 * Why conic conformal rather than Mercator: India spans roughly 8°N to 37°N,
 * and Mercator visibly stretches the north. The two standard parallels below
 * are the ones the Survey of India uses for the country, so shapes stay true.
 */
export function createIndiaProjection(
  width: number,
  height: number,
  fitTo: GeoPermissibleObjects,
): GeoProjection {
  return geoConicConformal()
    .parallels([12.472944, 35.172806])
    .rotate([-80, 0])
    .fitExtent(
      [
        [PADDING, PADDING],
        [width - PADDING, height - PADDING],
      ],
      fitTo,
    )
}

export const INDIA_BOUNDS = {
  minLon: 68.0,
  maxLon: 97.5,
  minLat: 6.5,
  maxLat: 37.5,
} as const

/** Reject a coordinate that cannot be in India. Guards against bad source rows. */
export function isPlausiblyIndian(lon: number, lat: number): boolean {
  return (
    lon >= INDIA_BOUNDS.minLon &&
    lon <= INDIA_BOUNDS.maxLon &&
    lat >= INDIA_BOUNDS.minLat &&
    lat <= INDIA_BOUNDS.maxLat
  )
}
