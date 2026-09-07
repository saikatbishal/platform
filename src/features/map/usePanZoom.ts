import { useCallback, useEffect, useRef } from 'react'
import { MAP_WIDTH, MAP_HEIGHT } from '@/lib/projection.ts'
import { ZOOM_MIN, ZOOM_MAX } from './lod.ts'

export interface View {
  /** Screen-space translation of the map origin. */
  x: number
  y: number
  /** Scale. `k / fitScale` is the zoom the level-of-detail table talks about. */
  k: number
}

interface Options {
  /** Called on every frame the view changed. Do the drawing here, not in React. */
  onFrame: (view: View, fitScale: number) => void
  /** Called only when the zoom tier could have changed — rare, safe for setState. */
  onZoomSettled?: (relativeZoom: number) => void
}

/**
 * Pan, zoom, pinch and momentum on a single 2-D transform.
 *
 * The view lives in a ref, never in React state: a drag produces a frame every
 * 16 ms, and re-rendering the component tree that often would drop frames for
 * no benefit. React owns the static structure; this hook moves it imperatively
 * and only calls back into React when the zoom tier changes.
 */
export function usePanZoom(
  stage: React.RefObject<HTMLElement | null>,
  { onFrame, onZoomSettled }: Options,
) {
  const view = useRef<View>({ x: 0, y: 0, k: 1 })
  const fit = useRef(1)
  const dirty = useRef(true)
  const raf = useRef(0)

  // Latest-ref pattern: `onFrame`/`onZoomSettled` are read from inside the
  // setup effect below via these refs, which is what lets the effect itself
  // omit them from its dependency array (see the comment down there). A prop
  // that changed identity on every journeys-list update (adding a journey,
  // crossing an LOD tier) would otherwise re-run the effect and its
  // unconditional `fitToViewport()` call — snapping the view back to the
  // country fit mid-zoom.
  const onFrameRef = useRef(onFrame)
  onFrameRef.current = onFrame
  const onZoomSettledRef = useRef(onZoomSettled)
  onZoomSettledRef.current = onZoomSettled

  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const dragging = useRef(false)
  const pinchDist = useRef(0)
  const history = useRef<Array<{ dx: number; dy: number; t: number }>>([])
  const velocity = useRef({ x: 0, y: 0 })
  const lastTier = useRef(-1)

  const clamp = useCallback(() => {
    const el = stage.current
    if (!el) return
    const vw = el.clientWidth, vh = el.clientHeight
    const w = MAP_WIDTH * view.current.k, h = MAP_HEIGHT * view.current.k
    // Never let the country leave the viewport entirely.
    const margin = Math.min(vw, vh) * 0.35
    view.current.x = Math.min(vw - margin, Math.max(margin - w, view.current.x))
    view.current.y = Math.min(vh - margin, Math.max(margin - h, view.current.y))
  }, [stage])

  const fitToViewport = useCallback(() => {
    const el = stage.current
    if (!el) return
    const vw = el.clientWidth, vh = el.clientHeight
    fit.current = Math.min(vw / MAP_WIDTH, vh / MAP_HEIGHT)
    view.current.k = fit.current
    view.current.x = (vw - MAP_WIDTH * fit.current) / 2
    view.current.y = (vh - MAP_HEIGHT * fit.current) / 2
    dirty.current = true
  }, [stage])

  const zoomAt = useCallback((sx: number, sy: number, factor: number) => {
    const min = fit.current * ZOOM_MIN, max = fit.current * ZOOM_MAX
    const next = Math.min(max, Math.max(min, view.current.k * factor))
    const f = next / view.current.k
    view.current.x = sx - (sx - view.current.x) * f
    view.current.y = sy - (sy - view.current.y) * f
    view.current.k = next
    dirty.current = true
  }, [])

  useEffect(() => {
    const el = stage.current
    if (!el) return

    fitToViewport()

    const loop = () => {
      const v = velocity.current
      if (!dragging.current && (Math.abs(v.x) > 0.04 || Math.abs(v.y) > 0.04)) {
        view.current.x += v.x
        view.current.y += v.y
        const bx = view.current.x, by = view.current.y
        clamp()
        if (view.current.x !== bx) v.x = 0
        if (view.current.y !== by) v.y = 0
        // 0.94 per frame is the decay that reads as "native" rather than icy.
        v.x *= 0.94
        v.y *= 0.94
        dirty.current = true
      }
      if (dirty.current) {
        clamp()
        onFrameRef.current(view.current, fit.current)
        const rel = view.current.k / fit.current
        const bucket = Math.round(rel * 100)
        if (bucket !== lastTier.current) {
          lastTier.current = bucket
          onZoomSettledRef.current?.(rel)
        }
        dirty.current = false
      }
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)

    const rect = () => el.getBoundingClientRect()

    const onDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId)
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      velocity.current = { x: 0, y: 0 }
      if (pointers.current.size === 1) { dragging.current = true; history.current = [] }
      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()]
        if (a && b) pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y)
      }
    }

    const onMove = (e: PointerEvent) => {
      const prev = pointers.current.get(e.pointerId)
      if (!prev) return
      const r = rect()
      if (pointers.current.size === 2 && pinchDist.current > 0) {
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        const [a, b] = [...pointers.current.values()]
        if (!a || !b) return
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, d / pinchDist.current)
        pinchDist.current = d
        return
      }
      if (!dragging.current) return
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y
      view.current.x += dx
      view.current.y += dy
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      history.current.push({ dx, dy, t: performance.now() })
      if (history.current.length > 6) history.current.shift()
      dirty.current = true
    }

    const onUp = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId)
      if (pointers.current.size < 2) pinchDist.current = 0
      if (pointers.current.size === 0) {
        dragging.current = false
        // Velocity from the last ~90 ms only, so a pause before release stops it.
        const now = performance.now()
        let sx = 0, sy = 0, n = 0
        for (const h of history.current) if (now - h.t < 90) { sx += h.dx; sy += h.dy; n++ }
        if (n > 1) velocity.current = { x: (sx / n) * 1.6, y: (sy / n) * 1.6 }
        history.current = []
      }
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = rect()
      const f = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0022))
      zoomAt(e.clientX - r.left, e.clientY - r.top, f)
    }

    const onDouble = (e: MouseEvent) => {
      const r = rect()
      zoomAt(e.clientX - r.left, e.clientY - r.top, 2.2)
    }

    const onResize = () => {
      const relative = view.current.k / fit.current
      fit.current = Math.min(el.clientWidth / MAP_WIDTH, el.clientHeight / MAP_HEIGHT)
      view.current.k = fit.current * relative
      dirty.current = true
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('dblclick', onDouble)
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf.current)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('dblclick', onDouble)
      window.removeEventListener('resize', onResize)
    }
    // `onFrame`/`onZoomSettled` are read via onFrameRef/onZoomSettledRef
    // above and deliberately excluded here — that is the entire point of
    // the latest-ref pattern. Including them defeats it the same way not
    // having the refs would: either way, a caller passing a new function
    // identity each render (an inline arrow, or a callback that closes over
    // changing props) re-runs this effect and its unconditional
    // `fitToViewport()`, snapping the view back to the country fit mid-zoom
    // or mid-drag. `stage`, `clamp`, `fitToViewport` and `zoomAt` are all
    // stable across the component's life (a ref object, and callbacks with
    // no changing dependencies of their own), so this effect in practice
    // runs once on mount and once on unmount, which is what a "wire up
    // event listeners" effect should do.
    //
    // No eslint-disable here: this project has no linter yet
    // (docs/00-decisions.md) and, if one lands, it's slated to be Biome, not
    // ESLint — a directive naming the wrong tool's rule is worse than no
    // directive, since it looks like protection that isn't actually wired up.
  }, [stage, clamp, fitToViewport, zoomAt])

  const zoomBy = useCallback((factor: number) => {
    const el = stage.current
    if (!el) return
    zoomAt(el.clientWidth / 2, el.clientHeight / 2, factor)
  }, [stage, zoomAt])

  /**
   * Repaint on the next frame without moving the view.
   *
   * The loop below only calls `onFrame` when something marked the view dirty,
   * and the things that mark it dirty are all *interactions* — fit, zoom,
   * drag, momentum, resize. Data arriving is not one of them, and `onFrame`
   * bails while `data` is null, so the first frame after mount paints nothing
   * and then clears the flag. Without this, a map whose data resolves after
   * mount sits untransformed with an empty station canvas until the user
   * happens to touch it. `reset` would also repaint, but it re-fits, which
   * would yank the view back if data ever reloads mid-zoom.
   */
  const invalidate = useCallback(() => { dirty.current = true }, [])

  return { zoomBy, reset: fitToViewport, invalidate, view }
}
