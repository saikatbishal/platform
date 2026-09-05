import type { View } from './usePanZoom.ts'

/**
 * Draws the whole station field onto a canvas.
 *
 * 8,696 stations as SVG circles would be 8,696 DOM nodes the browser
 * re-rasterises every frame; on a mid-range Android that drops frames. Here
 * it's one canvas path — every dot's `arc` added to a single `Path2D`-style
 * path, filled once — which stays a steady 60 fps because the cost is one
 * `fill()` call, not one per dot.
 *
 * Culling to the viewport is what keeps deep zoom cheap: at street level only a
 * few hundred of the 8,696 are on screen.
 */
export function drawStationField(
  ctx: CanvasRenderingContext2D,
  xy: Float32Array,
  view: View,
  viewport: { width: number; height: number; dpr: number },
  radius: number,
  colour: string,
): number {
  ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0)
  ctx.clearRect(0, 0, viewport.width, viewport.height)
  ctx.fillStyle = colour
  // Present, not shouting: the routes are the subject, this is the texture.
  ctx.globalAlpha = 0.6

  const pad = 8
  let drawn = 0

  ctx.beginPath()
  for (let i = 0; i < xy.length; i += 2) {
    const x = xy[i]! * view.k + view.x
    const y = xy[i + 1]! * view.k + view.y
    if (x < -pad || y < -pad || x > viewport.width + pad || y > viewport.height + pad) continue
    ctx.moveTo(x + radius, y)
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    drawn++
  }
  ctx.fill()

  ctx.globalAlpha = 1
  return drawn
}
