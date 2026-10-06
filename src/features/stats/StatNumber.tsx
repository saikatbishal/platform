import { useEffect, useLayoutEffect, useRef } from 'react'
import { easeArrive } from '@/features/map/drawIn.ts'
import type { Tally, Totals } from './tally.ts'

/** A change to a total that is not a draw-in — a journey removed, a train's
    stop list correcting the distance. Roadmap Phase 5 item 1: 300ms, eased. */
const COUNT_MS = 300

interface Props {
  tally: Tally
  field: keyof Totals
  /** The settled figure, from React. */
  value: number
  /** Module-level, not inline: read through a ref, but a stable function is
      still the honest contract for something called sixty times a second. */
  format: (n: number) => string
  className?: string
}

/**
 * One figure on a stat tile, written straight to its own text node.
 *
 * The span has no React children on purpose. React keeps a handle on any text
 * node it renders and updates that node in place, so if this component wrote
 * into a React-rendered span, the next real change would land on a node no
 * longer in the document and the tile would freeze. Owning the span outright
 * means exactly one writer.
 *
 * Two sources move it: the draw-in's frames, while lines are drawing (see
 * tally.ts), and otherwise a 300ms count from the old figure to the new one.
 * Reduced motion gets neither — the figure is simply the figure.
 */
export function StatNumber({ tally, field, value, format, className }: Props) {
  const el = useRef<HTMLSpanElement>(null)
  /** The figure currently on screen; null before the first write. */
  const shown = useRef<number | null>(null)
  const counting = useRef(0)
  const latest = useRef({ value, format })
  latest.current = { value, format }

  const write = (n: number) => {
    shown.current = n
    const text = latest.current.format(n)
    if (el.current && el.current.textContent !== text) el.current.textContent = text
  }

  useEffect(() => tally.subscribe((totals) => {
    cancelAnimationFrame(counting.current)
    write(totals ? totals[field] : latest.current.value)
  }), [tally, field])

  // Layout, so a first figure is in place before the first paint, not one
  // frame after an empty tile.
  useLayoutEffect(() => {
    if (tally.live) return
    const from = shown.current
    if (from === null || from === value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      write(value)
      return
    }
    let start: number | null = null
    const step = (now: number) => {
      start ??= now
      const t = (now - start) / COUNT_MS
      write(t >= 1 ? value : from + (value - from) * easeArrive(t))
      if (t < 1) counting.current = requestAnimationFrame(step)
    }
    counting.current = requestAnimationFrame(step)
    return () => { cancelAnimationFrame(counting.current) }
  }, [value, tally])

  return <span ref={el} className={className} />
}
