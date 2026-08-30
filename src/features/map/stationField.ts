import type { View } from './usePanZoom.ts'

/**
 * Draws the whole station field onto a canvas.
 *
 * 8,696 stations as SVG circles would be 8,696 DOM nodes the browser
 * re-rasterises every frame; on a mid-range Android that drops frames. Here it
 * is one loop of `fillRect` — measured at a steady 60 fps including at full
 * zoom. `fillRect` rather than `arc` because at one to three pixels the two are
 * indistinguishable and the rectangle is far cheaper.
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

  const size = radius * 2
  const pad = 8
  let drawn = 0

  for (let i = 0; i < xy.length; i += 2) {
    const x = xy[i]! * view.k + view.x
    const y = xy[i + 1]! * view.k + view.y
    if (x < -pad || y < -pad || x > viewport.width + pad || y > viewport.height + pad) continue
    ctx.fillRect(x - radius, y - radius, size, size)
    drawn++
  }

  ctx.globalAlpha = 1
  return drawn
}
