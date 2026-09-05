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

/**
 * Names a handful of on-screen station dots, once zoomed in enough
 * (LodTier.stationLabels) that there's room to read them. Canvas text, not an
 * SVG <text> per station: the candidate list is the same 8,696 stations as
 * the dots above, and mounting one DOM node per station is exactly the cost
 * this file's dot-drawing already avoids. `placed` is pre-culled and
 * collision-resolved by `placeLabels` — this only draws.
 */
export function drawStationLabels(
  ctx: CanvasRenderingContext2D,
  placed: ReadonlyArray<{ name: string; sx: number; sy: number }>,
  colour: string,
  haloColour: string,
): void {
  ctx.font = '8.5px system-ui, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 2.5
  ctx.strokeStyle = haloColour
  ctx.fillStyle = colour
  for (const p of placed) {
    ctx.strokeText(p.name, p.sx + 6, p.sy + 3)
    ctx.fillText(p.name, p.sx + 6, p.sy + 3)
  }
}
