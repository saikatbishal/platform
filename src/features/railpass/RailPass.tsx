import { useEffect, useRef, useState, type ReactNode } from 'react'
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

/*
 * Type sizes are in CARD pixels, and the card is never seen at 1:1. In the
 * sheet it is ~0.3× on a phone and ~0.45× on a desktop; in a tweet it is about
 * the same. So the app's 11px label floor means ≥ 26px here, not 11px — the
 * first version used 15px and shipped 7px labels. Sizes below are chosen so
 * the smallest text on the card lands at 9–12px as displayed.
 */
const TYPE = {
  wordmark: 38,
  tagline: 26,
  label: 28,
  figure: 96,
  footLabel: 22,
  footValue: 28,
} as const

const PAD = 48
const STRIP_H = 88
const FOOT_Y = 556
/** Same ratios the DOM uses (--tracking-board, --tracking-label). */
const TRACK = { board: 0.12, label: 0.14 } as const

/** A CSS custom property's live value, read from the root so light/dark and
    the ICF/Rajdhani/Vande-Bharat token swap all just work without this file
    knowing which theme is active. */
function token(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

type TrackedCtx = CanvasRenderingContext2D & { letterSpacing?: string }

/**
 * Left-aligned text with letter-spacing, returning its advance width.
 * Uses the native `letterSpacing` where the browser has it (kerning intact),
 * and places glyphs one by one where it doesn't. Left-aligned only: native
 * spacing trails the last glyph, which would knock a right-aligned line off
 * its edge.
 */
function fillTracked(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, em: number,
): number {
  const gap = size * em
  const c = ctx as TrackedCtx
  ctx.textAlign = 'left'
  if (typeof c.letterSpacing === 'string') {
    c.letterSpacing = `${gap}px`
    ctx.fillText(text, x, y)
    const w = ctx.measureText(text).width
    c.letterSpacing = '0px'
    return w
  }
  let cx = x
  for (const ch of text) {
    ctx.fillText(ch, cx, y)
    cx += ctx.measureText(ch).width + gap
  }
  return cx - x
}

/** Baseline that centres capital letters on `cy`. `textBaseline: middle`
    centres the em box, which sits visibly low for all-caps text. */
function capCentre(ctx: CanvasRenderingContext2D, cy: number): number {
  return cy + ctx.measureText('H').actualBoundingBoxAscent / 2
}

/**
 * Figures in Plex Mono, with the thousands comma pulled in. Mono gives the
 * comma a full digit-wide cell, so 8,386 reads as "8 , 386". The comma gets
 * half a cell and is centred in it; digits keep their tabular advance.
 */
function fillFigures(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  const cell = ctx.measureText('0').width
  ctx.textAlign = 'left'
  let cx = x
  for (const ch of text) {
    if (ch === ',') {
      ctx.fillText(ch, cx - cell * 0.25, y)
      cx += cell * 0.5
    } else {
      ctx.fillText(ch, cx, y)
      cx += cell
    }
  }
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
  const inkSoft = token('--ink-soft', '#A2B7C9')
  const cream = token('--cream', '#EECB9A')
  const land = token('--land', '#0C2140')
  const line = token('--line', '#1F4568')
  const lineStrong = token('--line-strong', '#2E5C82')
  const routeTaken = token('--route-taken', '#000000')
  const board = token('--board', '#EAB143')
  const boardInk = token('--board-ink', '#12283F')
  const fontBody = token('--font-body', 'system-ui, sans-serif')
  const fontMono = token('--font-mono', 'monospace')

  ctx.fillStyle = ground
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // Station-board strip — the app's identity without redrawing StationBoard's
  // SVG markup in a canvas that can't render it. The tagline is a sentence, so
  // it is set as one: sentence case, not tracked caps (the voice rule is that
  // uppercase is for labels only).
  ctx.fillStyle = board
  ctx.fillRect(0, 0, CARD_W, STRIP_H)
  ctx.fillStyle = boardInk
  ctx.textBaseline = 'alphabetic'
  ctx.font = `800 ${TYPE.wordmark}px ${fontBody}`
  fillTracked(ctx, 'PLATFORM', PAD, capCentre(ctx, STRIP_H / 2), TYPE.wordmark, TRACK.board)
  ctx.font = `600 ${TYPE.tagline}px ${fontBody}`
  ctx.textAlign = 'right'
  ctx.fillText('Your rail life, on one map.', CARD_W - PAD, capCentre(ctx, STRIP_H / 2))
  ctx.textAlign = 'left'

  // Hairlines: one between map and figures, one above the footer. Hairline at
  // card scale is 2px — about 0.7px as displayed, which is what a hairline is.
  ctx.strokeStyle = line
  ctx.lineWidth = 2
  const bodyTop = STRIP_H + 28
  const bodyBottom = FOOT_Y - 28
  const splitX = 616
  ctx.beginPath()
  ctx.moveTo(splitX, STRIP_H)
  ctx.lineTo(splitX, FOOT_Y)
  ctx.moveTo(0, FOOT_Y)
  ctx.lineTo(CARD_W, FOOT_Y)
  ctx.stroke()

  // Mini-map: the same state outlines the real map draws, fit into a box on
  // the left and centred within it. No visited/unvisited fill split here —
  // at this size the point is "here is where you've been", carried entirely
  // by the route lines. The states get a hairline outline because in the
  // light theme --land is 1.07:1 against the ground: without it the country
  // is a ghost.
  const mapBox = { x: PAD, y: bodyTop, w: splitX - PAD * 2, h: bodyBottom - bodyTop }
  const fit = Math.min(mapBox.w / MAP_WIDTH, mapBox.h / MAP_HEIGHT)
  const drawnW = MAP_WIDTH * fit
  const drawnH = MAP_HEIGHT * fit
  const ox = mapBox.x + (mapBox.w - drawnW) / 2
  const oy = mapBox.y + (mapBox.h - drawnH) / 2

  ctx.save()
  ctx.translate(ox, oy)
  ctx.scale(fit, fit)

  const statePaths = args.data.states.map((s) => new Path2D(s.d))
  ctx.fillStyle = land
  for (const p of statePaths) ctx.fill(p)
  ctx.strokeStyle = lineStrong
  ctx.lineWidth = 1.25 / fit
  ctx.lineJoin = 'round'
  for (const p of statePaths) ctx.stroke(p)

  // One path, one stroke — the same fix the live map got (26 Sep): stroking
  // each route separately compounds antialiased edges wherever journeys share
  // track, so a corridor travelled often drew heavier and fuzzier than one
  // travelled once. Width is 3.5 card px (was 2): the card is shown at ~0.3×,
  // and a 2px line arrives as a 0.6px one. --route-taken is --ink, so it also
  // reads after dark.
  ctx.strokeStyle = routeTaken
  ctx.lineWidth = 3.5 / fit
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (args.routes.length) ctx.stroke(new Path2D(args.routes.map((r) => r.d).join(' ')))
  ctx.restore()

  // The big three, stacked and ruled like a timetable. Label above, figure
  // below; cream is reserved for large numerals, so only the figures wear it.
  const colX = splitX + PAD
  const colR = CARD_W - PAD
  const rows: Array<[string, string]> = [
    [formatKm(args.stats.km).replace(' km', ''), 'KILOMETRES'],
    [args.stats.stations.toLocaleString('en-IN'), 'STATIONS'],
    [String(args.stats.states), 'STATES'],
  ]
  const pitch = (bodyBottom - bodyTop) / rows.length
  rows.forEach(([value, label], i) => {
    const top = bodyTop + i * pitch
    if (i > 0) {
      ctx.strokeStyle = line
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(colX, top)
      ctx.lineTo(colR, top)
      ctx.stroke()
    }
    ctx.fillStyle = inkSoft
    ctx.font = `600 ${TYPE.label}px ${fontBody}`
    const labelBase = top + 14 + ctx.measureText('H').actualBoundingBoxAscent
    fillTracked(ctx, label, colX, labelBase, TYPE.label, TRACK.label)

    ctx.fillStyle = cream
    ctx.font = `600 ${TYPE.figure}px ${fontMono}`
    const figBase = labelBase + 18 + ctx.measureText('0').actualBoundingBoxAscent
    fillFigures(ctx, value, colX, figBase)
  })

  // Footer: when it was issued, on the figures' left edge so the column is a
  // column all the way down.
  const footMid = (FOOT_Y + CARD_H) / 2
  ctx.fillStyle = inkSoft
  ctx.font = `600 ${TYPE.footLabel}px ${fontBody}`
  const issuedW = fillTracked(ctx, 'ISSUED', colX, capCentre(ctx, footMid), TYPE.footLabel, TRACK.label)
  ctx.fillStyle = ink
  ctx.font = `600 ${TYPE.footValue}px ${fontBody}`
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  ctx.fillText(dateStr, colX + issuedW + 20, capCentre(ctx, footMid))
}

/**
 * A canvas-rendered share image: the big three numbers, a mini-map of your
 * routes, the date. Rendered client-side, downloadable, shared where the
 * browser supports handing a file to the OS share sheet.
 */
export function RailPass({ data, journeys, stats, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { routes } = useJourneyRoutes(data, journeys)
  const [canShareFiles, setCanShareFiles] = useState(false)

  useEffect(() => {
    let cancelled = false
    // `fonts.ready` only waits for fonts the page has already asked for, and a
    // canvas never asks. Request the exact faces the card uses (the sample text
    // picks the Latin unicode-range subset) so the first draw is not fallback.
    void Promise.all([
      document.fonts.load('800 38px Archivo', 'PLATFORM'),
      document.fonts.load('600 28px Archivo', 'Aa'),
      document.fonts.load('600 96px "IBM Plex Mono"', '0123456789,'),
    ]).then(() => document.fonts.ready).then(() => {
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

  const download = async () => {
    const blob = await toBlob()
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'platform-rail-pass.png'
    a.click()
    URL.revokeObjectURL(url)
  }

  const share = async () => {
    const blob = await toBlob()
    if (!blob) return
    const file = new File([blob], 'platform-rail-pass.png', { type: 'image/png' })
    try {
      await navigator.share({ files: [file], title: 'My rail journeys' })
    } catch {
      // AbortError on a dismissed share sheet is the common case and
      // not a failure worth surfacing — the person just changed their mind.
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-label font-semibold tracking-label text-ink-faint uppercase">
          Rail pass
        </h2>
        {/* Icon-only, so each carries its name twice: aria-label for a screen
            reader, title for a pointer. 44px targets with a 36px visible
            square, the same trade the map's find button makes. */}
        <div className="-mr-1 flex items-center gap-1">
          <IconButton label="Download the rail pass as an image" onClick={() => { void download() }} primary>
            <path d="M12 4v10m0 0-4-4m4 4 4-4M5 19h14" />
          </IconButton>
          {canShareFiles && (
            <IconButton label="Share the rail pass" onClick={() => { void share() }}>
              <path d="M12 15V4m0 0L8 8m4-4 4 4M6 11v8h12v-8" />
            </IconButton>
          )}
          <IconButton label="Close the rail pass and look at the map" onClick={onClose}>
            <path d="M6 6l12 12M18 6 6 18" />
          </IconButton>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Rail pass: ${formatKm(stats.km)}, ${stats.stations.toLocaleString('en-IN')} stations, ${stats.states} states`}
        style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}
        className="w-full rounded-sm border border-line"
      />
    </div>
  )
}

/** Drawn for this one job, like the close cross on the board: 1.6 stroke,
    round caps, currentColor. No icon library (docs/00-decisions.md). */
function IconButton({ label, onClick, primary = false, children }: {
  label: string
  onClick: () => void
  primary?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-11 items-center justify-center rounded-sm transition-colors duration-150"
    >
      <span
        className={
          'flex size-9 items-center justify-center rounded-sm border ' +
          (primary
            ? 'border-transparent bg-accent text-ground'
            : 'border-line bg-surface text-ink hover:bg-surface-2 hover:text-accent')
        }
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
          strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {children}
        </svg>
      </span>
    </button>
  )
}
