import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

/**
 * The first-visit tour: a coach mark per step, each pointing at one real
 * control, with the rest of the screen dimmed behind a spotlight.
 *
 * Built here rather than taken from react-joyride or driver.js. Both are a
 * styling layer to fight — their own tooltip, their own overlay, their own
 * idea of a button — and docs/00-decisions.md rejects exactly that kind of
 * component library. The whole thing is one SVG path and one card.
 *
 * The scrim is a single path with `fill-rule: evenodd`: the viewport, with
 * the spotlit control cut out of it as a rounded rectangle. That one shape
 * does both jobs. It dims everything but the target, and because SVG only
 * hit-tests painted area, the hole is genuinely open — the highlighted
 * control can be tapped through it. Tapping it ends the tour, because doing
 * the thing is a better ending than reading about it.
 *
 * A step with no target (the map) cuts the hole to the whole viewport, so
 * nothing is dimmed and the map stays draggable while the card describes
 * dragging it. The next step then animates that full-screen hole down onto
 * its control: the spotlight closes in rather than appearing.
 */

export interface TourStep {
  id: string
  /** The `data-tour` value of the control this step points at. Null means
      the map itself: no spotlight, the card sits near the top. */
  target: string | null
  title: string
  body: string
  /** Replaces `body` below `sm`, where the control looks different. */
  phoneBody?: string
  /** The last step's primary button can do the thing instead of closing. */
  action?: { label: string; run: () => void }
}

/** How the tour ended — App records all three the same way today, but a
    skip and an action are different facts and the caller may want them. */
export type TourEnd = 'done' | 'skipped' | 'acted'

interface Props {
  steps: readonly TourStep[]
  onEnd: (how: TourEnd) => void
}

interface Box { x: number; y: number; w: number; h: number }

/** Space between a control and the edge of its spotlight. */
const PAD = 6
/** The controls are 4px radius; 4 + PAD keeps the cut-out concentric with
    the corner it surrounds, the rule the rest of the chrome follows. */
const HOLE_RADIUS = 4 + PAD
/** The chrome's own side gutter (`left-3`, `right-3`). */
const GUTTER = 12
/** Gap between the spotlight and the card. */
const GAP = 10
const CARD_MAX = 320

/**
 * The one copy of a control that is actually on screen. `+` is rendered twice
 * — bottom-right on a phone, in the bottom-left stack from `sm` up — and the
 * breakpoint hides one with CSS rather than unmounting it, so `offsetParent`
 * is what tells them apart (the same test App's focusFindButton uses).
 */
function findTarget(id: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`)) {
    if (el.offsetParent !== null) return el
  }
  return null
}

/**
 * The spotlight's rounded rectangle; the scrim is the viewport followed by
 * this, cut out by `evenodd`. Always the same sequence of commands — even the no-target case is a hole with radius 0 —
 * because Motion can only interpolate between two paths whose numbers line
 * up one for one.
 */
function holePath(vw: number, vh: number, hole: Box | null): string {
  const b = hole ?? { x: 0, y: 0, w: vw, h: vh }
  const r = hole ? Math.min(HOLE_RADIUS, b.w / 2, b.h / 2) : 0
  const { x, y, w, h } = b
  return (
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}` +
    `V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
    `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}` +
    `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  )
}

interface Layout {
  vw: number
  vh: number
  hole: Box | null
  narrow: boolean
}

function measure(step: TourStep | undefined): Layout {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const narrow = window.matchMedia('(width < 40rem)').matches
  const el = step?.target ? findTarget(step.target) : null
  if (!el) return { vw, vh, hole: null, narrow }
  const r = el.getBoundingClientRect()
  return {
    vw,
    vh,
    narrow,
    hole: { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 },
  }
}

export function Tour({ steps, onEnd }: Props) {
  const [index, setIndex] = useState(0)
  const step = steps[index]
  const last = index === steps.length - 1
  const [layout, setLayout] = useState<Layout>(() => measure(step))
  const reduced = useReducedMotion() ?? false
  const primary = useRef<HTMLButtonElement>(null)
  const titleId = 'tour-title'
  const bodyId = 'tour-body'

  // Measured before paint, so a step never flashes its card at the previous
  // step's position.
  useLayoutEffect(() => { setLayout(measure(step)) }, [step])
  useEffect(() => {
    const remeasure = () => { setLayout(measure(step)) }
    window.addEventListener('resize', remeasure)
    return () => { window.removeEventListener('resize', remeasure) }
  }, [step])

  // Where focus was before the tour took it, given back when it ends —
  // unless the tour ended by opening something, which takes focus itself.
  // Read in a state initialiser, during the first render: an effect would run
  // after the one below has already moved focus into the card.
  const [returnTo] = useState(() => document.activeElement)
  const end = useCallback((how: TourEnd) => {
    if (how !== 'acted' && returnTo instanceof HTMLElement) returnTo.focus()
    onEnd(how)
  }, [onEnd, returnTo])

  // Focus follows the card, so a keyboard or screen-reader user is always on
  // the step being described. `preventScroll`: the page never scrolls, but
  // iOS will try to scroll a fixed element into view anyway.
  useEffect(() => { primary.current?.focus({ preventScroll: true }) }, [index])

  // A tap on the spotlit control itself, through the hole. Its own handler
  // still runs — this only listens.
  useEffect(() => {
    const el = step?.target ? findTarget(step.target) : null
    if (!el) return
    const onClick = () => { end('acted') }
    el.addEventListener('click', onClick)
    return () => { el.removeEventListener('click', onClick) }
  }, [step, end])

  const next = useCallback(() => {
    if (last) end('done')
    else setIndex((i) => i + 1)
  }, [last, end])
  const back = useCallback(() => { setIndex((i) => Math.max(0, i - 1)) }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); end('skipped') }
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') back()
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey) }
  }, [end, next, back])

  if (!step) return null

  const { vw, vh, hole, narrow } = layout
  const cardW = Math.min(CARD_MAX, vw - GUTTER * 2)
  /*
   * The card goes on whichever side of its control has room: above anything
   * in the bottom half (every control here except the sign-in mark), below
   * anything in the top half. Positioned by the edge nearest the control —
   * `bottom` when above — so the card's own height never has to be known.
   *
   * The map step has no control; its card sits under the nameplate and the
   * sign-in mark, clear of both corners' chrome, leaving the middle of the
   * map — the subject of the step — uncovered.
   */
  const above = hole ? hole.y + hole.h / 2 > vh / 2 : false
  const centre = hole ? hole.x + hole.w / 2 : vw / 2
  const left = Math.min(Math.max(centre - cardW / 2, GUTTER), vw - GUTTER - cardW)
  const vertical = hole
    ? above ? { bottom: vh - hole.y + GAP } : { top: hole.y + hole.h + GAP }
    : { top: 64 }
  // The caret points at the control's centre, kept off the card's corners.
  const caretX = Math.min(Math.max(centre - left, 16), cardW - 16)

  const morph = reduced ? { duration: 0 } : { duration: 0.26, ease: [0.4, 0, 0.2, 1] as const }
  const arrive = reduced ? { duration: 0 } : { duration: 0.15, ease: 'easeOut' as const }

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      {/* Decorative: the card carries everything a screen reader needs. */}
      <svg aria-hidden="true" width={vw} height={vh} viewBox={`0 0 ${vw} ${vh}`} className="absolute inset-0">
        <motion.path
          initial={false}
          animate={{ d: `M0 0H${vw}V${vh}H0Z` + holePath(vw, vh, hole) }}
          transition={morph}
          fillRule="evenodd"
          className="pointer-events-auto fill-ground/70"
        />
        {/* The hole's edge, drawn. In the dark theme the scrim alone makes a
            clear spotlight; in light, --ground is whitewash, so the scrim
            fades the screen rather than darkening it and the cut-out has no
            edge of its own — it read as a pale patch of sea. A 1.5px accent
            line on the same path gives both themes the same crisp outline.
            Hidden on the map step, where the hole is the viewport. */}
        <motion.path
          initial={false}
          animate={{ d: holePath(vw, vh, hole), opacity: hole ? 1 : 0 }}
          transition={morph}
          className="fill-none stroke-accent [stroke-width:1.5]"
        />
      </svg>

      <motion.div
        key={step.id}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        initial={{ opacity: 0, y: above ? 4 : -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={arrive}
        style={{ left, width: cardW, ...vertical }}
        className="pointer-events-auto absolute rounded-sm border border-line bg-surface p-4 shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--ground)_70%,transparent)]"
      >
        {hole && (
          <span
            aria-hidden="true"
            style={{ left: caretX - 5 }}
            className={`absolute size-2.5 rotate-45 border-line bg-surface ${
              above ? '-bottom-[6px] border-r border-b' : '-top-[6px] border-t border-l'
            }`}
          />
        )}

        <p className="mb-2 text-label font-semibold tracking-label text-ink-faint uppercase">
          <span className="tabular">{index + 1}</span> of <span className="tabular">{steps.length}</span>
        </p>
        <h2 id={titleId} className="mb-1.5 text-base font-semibold text-ink">
          {step.title}
        </h2>
        <p id={bodyId} className="mb-4 text-sm text-ink-soft">
          {narrow && step.phoneBody ? step.phoneBody : step.body}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { end('skipped') }}
            className="-ml-2.5 min-h-11 rounded-sm px-2.5 text-label font-semibold tracking-label text-ink-faint uppercase transition-colors duration-150 hover:bg-surface-2 hover:text-accent"
          >
            {last ? 'Later' : 'Skip tour'}
          </button>
          <span className="flex-1" />
          {index > 0 && (
            <button
              type="button"
              onClick={back}
              className="min-h-11 rounded-sm px-2.5 text-label font-semibold tracking-label text-ink-soft uppercase transition-colors duration-150 hover:bg-surface-2 hover:text-accent"
            >
              Back
            </button>
          )}
          <button
            ref={primary}
            type="button"
            onClick={() => {
              if (last && step.action) { step.action.run(); end('acted') }
              else next()
            }}
            className="min-h-11 rounded-sm bg-accent px-4 text-label font-semibold tracking-label text-ground uppercase"
          >
            {last ? step.action?.label ?? 'Done' : 'Next'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
