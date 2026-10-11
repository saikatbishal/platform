import { useRef } from 'react'
import type { MouseEvent, PointerEvent } from 'react'

/**
 * Close a sheet when its scrim is tapped — but only by a press that both
 * starts and ends on the scrim itself.
 *
 * `onClick={e => e.target === e.currentTarget && close()}` is the obvious
 * version, and it is wrong in two directions, because a click is dispatched
 * to the nearest element containing both ends of the press:
 *
 * - Select text in a field and let go over the scrim: the click lands on the
 *   scrim, and a half-typed search or a half-logged journey is thrown away.
 * - Press on the scrim and let go inside the sheet: the same, from the other
 *   side.
 *
 * So the press is followed from pointer-down to pointer-up, and the click
 * only counts if it never left the scrim. Touch needs nothing extra: a finger
 * that moves far enough to cross into the sheet becomes a scroll, and no
 * click is fired at all.
 *
 * Spread the result onto the scrim element: `<div {...useScrimDismiss(onClose)}>`.
 */
export function useScrimDismiss(onDismiss: () => void) {
  const pressOnScrim = useRef(false)
  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      pressOnScrim.current = e.target === e.currentTarget
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      pressOnScrim.current &&= e.target === e.currentTarget
    },
    onClick: (e: MouseEvent<HTMLElement>) => {
      if (pressOnScrim.current && e.target === e.currentTarget) onDismiss()
    },
  }
}
