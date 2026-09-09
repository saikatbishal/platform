import { useEffect, useRef, useState } from 'react'
import { MAP_WIDTH, MAP_HEIGHT } from '@/lib/projection.ts'
import { useJourneyRoutes } from '@/features/map/useJourneyRoutes.ts'
import { formatKm } from '@/lib/distance.ts'
import type { MapData } from '@/features/map/useMapData.ts'
import type { Journey } from '@/types/index.ts'

interface Props {
  data: MapData
  journeys: readonly Journey[]
  stats: { km: number; stations: number; states: number }
  onClose: () => void
}

const CARD_W = 1200
const CARD_H = 630
/** Internal resolution, not display size — crisp on a phone screen and in a
    tweet at small size, independent of the viewing device's own DPR. */
const SCALE = 2

/** A CSS custom property's live value, read from the root so light/dark and
    the ICF/Rajdhani/Vande-Bharat token swap all just work without this file
    knowing which theme is active. */
function token(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function drawCard(canvas: HTMLCanvasElement, args: {
  data: MapData
  routes: readonly { d: string }[]
  stats: Props['stats']
}) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  canvas.width = CARD_W * SCALE
  canvas.height = CARD_H * SCALE
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0)

  const ground = token('--ground', '#0A1C33')
  const ink = token('--ink', '#E9F0F6')
  const inkFaint = token('--ink-faint', '#7791A8')
  const cream = token('--cream', '#EECB9A')
  const land = token('--land', '#0C2140')
  const routeTaken = token('--route-taken', '#000000')
  const board = token('--board', '#EAB143')
  const boardInk = token('--board-ink', '#12283F')
  const fontBody = token('--font-body', 'system-ui, sans-serif')
  const fontMono = token('--font-mono', 'monospace')

  ctx.fillStyle = ground
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // Station-board strip — the app's identity without redrawing StationBoard's
  // SVG markup in a canvas that can't render it.
  const stripH = 64
  ctx.fillStyle = board
  ctx.fillRect(0, 0, CARD_W, stripH)
  ctx.fillStyle = boardInk
  ctx.font = `700 26px ${fontBody}`
  ctx.textBaseline = 'middle'
  ctx.fillText('PLATFORM', 32, stripH / 2)
  ctx.font = `600 15px ${fontMono}`
  ctx.textAlign = 'right'
  ctx.fillText('YOUR RAIL LIFE, ON ONE MAP', CARD_W - 32, stripH / 2)
  ctx.textAlign = 'left'

  // Mini-map: the same state outlines the real map draws, fit into a box on
  // the left and centred within it. No visited/unvisited fill split here —
  // at this size the point is "here is where you've been", carried entirely
  // by the route lines.
  const mapBox = { x: 48, y: stripH + 32, w: 520, h: CARD_H - stripH - 64 }
  const fit = Math.min(mapBox.w / MAP_WIDTH, mapBox.h / MAP_HEIGHT)
  const drawnW = MAP_WIDTH * fit
  const drawnH = MAP_HEIGHT * fit
  const ox = mapBox.x + (mapBox.w - drawnW) / 2
  const oy = mapBox.y + (mapBox.h - drawnH) / 2

  ctx.save()
  ctx.translate(ox, oy)
  ctx.scale(fit, fit)

  ctx.fillStyle = land
  for (const s of args.data.states) ctx.fill(new Path2D(s.d))

  ctx.strokeStyle = routeTaken
  ctx.lineWidth = 3 / fit
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const r of args.routes) ctx.stroke(new Path2D(r.d))
  ctx.restore()

  // The big three numbers, stacked — cream is reserved for large numerals
  // exactly because it goes muddy below about 20px, so nothing here is small.
  const col = { x: mapBox.x + mapBox.w + 56 }
  const rows: Array<[string, string]> = [
    [formatKm(args.stats.km).replace(' km', ''), 'KILOMETRES'],
    [args.stats.stations.toLocaleString('en-IN'), 'STATIONS'],
    [String(args.stats.states), 'STATES'],
  ]
  let y = stripH + 84
  for (const [value, label] of rows) {
    ctx.fillStyle = cream
    ctx.font = `700 64px ${fontMono}`
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(value, col.x, y)
    ctx.fillStyle = inkFaint
    ctx.font = `600 15px ${fontBody}`
    ctx.fillText(label, col.x + 4, y + 26)
    y += 130
  }

  ctx.fillStyle = ink
  ctx.font = `500 16px ${fontBody}`
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  ctx.fillText(dateStr, col.x, CARD_H - 40)
}

/**
 * A canvas-rendered share image: the big three numbers, a mini-map of your
 * routes, the date. Rendered client-side, downloadable, shared where the
 * browser supports handing a file to the OS share sheet.
 */
export function PassportCard({ data, journeys, stats, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { routes } = useJourneyRoutes(data, journeys)
  const [canShareFiles, setCanShareFiles] = useState(false)

  useEffect(() => {
    let cancelled = false
    void document.fonts.ready.then(() => {
      const canvas = canvasRef.current
      if (cancelled || !canvas) return
      drawCard(canvas, { data, routes, stats })
    })
    return () => { cancelled = true }
  }, [data, routes, stats])

  useEffect(() => {
    // A share button that fails on tap is worse than no share button —
    // feature-detected once, not assumed from "is this a phone".
    const probe = new File([], 'probe.png', { type: 'image/png' })
    setCanShareFiles(typeof navigator.share === 'function' && navigator.canShare?.({ files: [probe] }) === true)
  }, [])

  const toBlob = () => new Promise<Blob | null>((resolve) => {
    canvasRef.current?.toBlob(resolve, 'image/png')
  })

  return (
    <div className="flex flex-col gap-4">
      <canvas
        ref={canvasRef}
        style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}
        className="w-full rounded-sm border border-line"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={async () => {
            const blob = await toBlob()
            if (!blob) return
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'platform-passport.png'
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="flex-1 rounded-sm bg-accent px-4 py-3 text-label font-semibold tracking-label text-ground uppercase"
        >
          Download
        </button>
        {canShareFiles && (
          <button
            type="button"
            onClick={async () => {
              const blob = await toBlob()
              if (!blob) return
              const file = new File([blob], 'platform-passport.png', { type: 'image/png' })
              try {
                await navigator.share({ files: [file], title: 'My rail journeys' })
              } catch {
                // AbortError on a dismissed share sheet is the common case and
                // not a failure worth surfacing — the person just changed their mind.
              }
            }}
            className="rounded-sm border border-line px-4 py-3 text-label font-semibold tracking-label text-ink-soft uppercase hover:bg-surface-2"
          >
            Share
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm border border-line px-4 py-3 text-label font-semibold tracking-label text-ink-soft uppercase hover:bg-surface-2"
        >
          Close
        </button>
      </div>
    </div>
  )
}
