# The map

Yes, it's possible — pan, pinch-zoom, momentum, detail appearing as you go in.
And it does **not** need tiles, a tile server, or a map library.

---

## Why "like Google Maps" doesn't mean "build Google Maps"

Google Maps uses tiles because it has to: the whole planet, twenty-odd zoom
levels, satellite imagery, and data far too large to send to a browser. Tiles
are the answer to *unbounded* data.

This map is bounded in every direction. One country. Vector only, no imagery.
Roughly five useful zoom levels — country, region, state, district, local. The
entire dataset is **262 KB gzipped**, which is less than one photograph.

Once everything fits in memory, the hard problem disappears. Pan and zoom stop
being a data-loading problem and become one 2-D transform. There is nothing to
fetch while the user drags, so there is nothing to stutter.

What still has to be solved is **level of detail** — what to draw at each scale —
because drawing all 8,455 stations at country zoom is both slow and an
unreadable grey smear.

---

## The three layers

Three stacked layers, because they have completely different performance
characteristics and mixing them is what makes maps janky.

**Get the order right.** The obvious instinct is to put the Canvas at the very
bottom as a "backdrop". That is wrong, and it cost an hour to spot in the spike:
the land polygons are opaque, so a Canvas underneath them is completely hidden.
The station dots only appeared over the sea. The correct sandwich is:

```
  SVG  #base   land + district borders     ← opaque fills
  ──────────────────────────────────────
  CANVAS       8,455 station dots          ← must sit ABOVE the land
  ──────────────────────────────────────
  SVG  #over   rail, routes, labels        ← pointer events live here
```

Both SVGs carry the identical `transform` string, set once per frame, so the
three layers stay locked together.

**1. Base — SVG, opaque.**
36 state polygons and, from zoom 4 upward, 760 district borders. Districts are
built on first use rather than on first paint; in the app that's where the lazy
fetch of `districts.topo.json` goes.

**2. The station field — Canvas.**
All 8,455 stations as one- to three-pixel dots, culled to the viewport. In SVG
that would be 8,455 DOM nodes the browser re-rasterises every frame, which drops
frames on a mid-range Android. On a Canvas it is one loop of `fillRect` — measured
at a steady 60 fps in the spike, including at full zoom. Use `fillRect`, not
`arc`; at these sizes they are indistinguishable and the rectangle is far cheaper.

This layer is also, unexpectedly, the best-looking thing in the project. The dots
are dense along the lines, so **the rail network draws itself out of the station
positions** with no rail data at all.

**3. Over — SVG, culled to the viewport.**
Rail lines, travelled routes, visited stations, the current marker, and labels.
A few hundred nodes at most, so SVG is comfortable, and it brings crisp strokes
at any zoom, easy hit-testing, and CSS-driven theming for free.

Two details that matter: `vector-effect="non-scaling-stroke"` keeps a 2 px route
2 px instead of 40 px when zoomed in — but then set the *base* stroke width per
tier, or the rail hairlines vanish at deep zoom. And labels sit inside the
transformed group with an individual counter-scale (`scale(1/k)`), so they stay a
constant size on screen without being repositioned on every pan frame.

---

## Level of detail

The rule lives in one file, `src/features/map/lod.ts`, so it is a data table
rather than conditionals scattered through the renderer.

| Tier | From zoom | Rail | Cities | Districts | Station dot |
| --- | --- | --- | --- | --- | --- |
| country | 1 | rank ≤ 6 | 12 | no | 0.9 px |
| region | 2.5 | ≤ 7 | 40 | no | 1.2 px |
| state | 5 | ≤ 8 | 90 | **loaded** | 1.8 px |
| district | 9 | ≤ 9 | 160 | yes | 2.6 px |
| local | 16 | all | 214 | yes | 3.4 px |

Two of those columns are free, because the source data already ranks itself:

- **Rail `scalerank`** (4–10 in India). Low is a trunk route, high is a branch.
  Filtering by it gives a sensible skeleton at country zoom and the full network
  when you go in.
- **City `SCALERANK`** (0–9). Rank 0 is Mumbai and Delhi; rank 9 is a small state
  capital. `cities.json` is pre-sorted, so "show the first N" is the whole
  algorithm.

Stations have no such ranking in the source. Cull them by viewport instead —
only draw the interactive dots whose projected position is inside the visible
rectangle, which naturally keeps the count low however far in you go.

---

## Pan and zoom without a library

The whole interaction is three numbers: `x`, `y`, `k` (scale).

- **Drag** — pointer events, not mouse events, so touch and trackpad work with
  one code path. `setPointerCapture` so a fast drag that leaves the element
  doesn't get stuck.
- **Wheel** — zoom about the cursor. Take the point under the pointer, change
  `k`, then adjust `x`/`y` so that same geographic point stays under it.
  Skipping this makes zoom feel "wrong" without people being able to say why.
- **Pinch** — two pointers, track the midpoint and the distance between them.
- **Momentum** — keep the last few pointer positions, compute velocity on
  release, decay it at roughly 0.94 per frame. This one detail is most of what
  separates "feels native" from "feels like a website".
- **Clamping** — never let the user pan India off screen or zoom past the point
  where the data has nothing more to give (`ZOOM_MAX = 24`).

`d3-geo` does the projection maths only. It is not doing the interaction, and no
map library is involved.

---

## The assets

`npm run map:build` writes all of these into `public/maps/`. They are gitignored
— regenerate rather than commit.

| File | Raw | Gzip | What |
| --- | --- | --- | --- |
| `outline.topo.json` | 1 KB | <1 KB | India silhouette, for the furthest zoom |
| `states.topo.json` | 16 KB | 3 KB | 36 states and union territories |
| `districts.topo.json` | 162 KB | 45 KB | 760 districts, lazy-loaded at zoom ≥ 5 |
| `rail.topo.json` | 146 KB | 39 KB | 454 rail lines, `scalerank` 4–10 |
| `cities.json` | 19 KB | 4 KB | 214 cities, pre-sorted by importance |
| `data/stations.json` | 802 KB | 168 KB | 8,455 stations (built separately) |
| **total** | **1.1 MB** | **262 KB** | every layer, all zooms |

**Why TopoJSON rather than GeoJSON.** Adjacent polygons share borders. GeoJSON
stores the Maharashtra–Karnataka border twice, once in each state; TopoJSON
stores it once and references it. For 760 districts that is most of the file.
`topojson-client` decodes it in a couple of lines.

---

## The boundary problem — read this before publishing anything

The obvious source for state boundaries is Natural Earth's admin-1 layer. **Don't
use it.** Measured: Natural Earth draws India's northern boundary at the de-facto
line of control, stopping at **35.50°N**. The official Indian boundary reaches
**37.08°N**.

Two consequences. The map looks visibly wrong to any Indian viewer, because the
top of the country is simply missing. And India's 2021 geospatial guidelines
require a published map of India to depict the official boundary — this is a
personal project, so the practical risk is low, but the plan ends with posting it
publicly, and it is a bad look to argue about afterwards.

So the boundaries come from a Survey-of-India-derived district file, dissolved up
to states. Correct northern extent, and a second benefit below.

---

## Why the states come from the district file

`build-stations.ts` derives each station's state by testing its coordinate
against these same district polygons. So the `state` string on a station is
character-for-character the same as the `st_nm` on a state polygon. "States
unlocked" matches **by construction**, not by coincidence.

That matters, because the earlier version — which trusted the `state` field in
the raw station data whenever it was present — silently disagreed with the map:

| Station data said | Boundary file says | Stations affected |
| --- | --- | --- |
| `Orissa` | `Odisha` | 63 |
| `Delhi NCT` | `Delhi` | 28 |
| `Bangladesh` | — | 1 (Dhaca Cantt) |

Odisha and Delhi would never have lit up, and a Bangladeshi station would have
appeared on a map of India. The fix is one line: always derive, never trust.
Verified afterwards — 29 station states, 29 matching polygons, zero mismatches.

---

## Known gaps

**Seven states have no stations at all**: Sikkim, Arunachal Pradesh, Meghalaya,
Ladakh, Andaman and Nicobar Islands, Lakshadweep, and Dadra and Nagar Haveli and
Daman and Diu. Some of that is real — those are genuinely rail-light. But
Meghalaya has Mendipathar and Arunachal has Naharlagun, both opened after this
dataset was compiled. So "states unlocked" can reach at most 29 of 36 today.
Either say so in the UI, or hand-add the handful of missing stations.

**Distances are great-circle**, so a route drawn station-to-station is a series
of straight lines and undercounts real track. Fine for v1, and labelled honestly
in the UI. `trains.json` in the DataMeet repo carries real route geometry if that
ever stops being good enough.

---

## Build order

1. Static render, no interaction. States and rail from the topojson, projected.
   Confirm it looks like India.
2. Add the Canvas station field underneath.
3. Add pan and zoom on the transform. Get the feel right before adding anything
   else — this is where the hours should go.
4. Add level of detail switching. Watch the debug HUD, not the code.
5. Add routes, then labels, then hit-testing.

Labels last, always. Label collision is the fiddliest part of any map, and it is
worthless if the pan underneath it stutters.

---

## The spike

A working version of all of this is published as an artifact — real geometry,
real data, no libraries. It measures a steady 60 fps on desktop and on a phone
viewport, at every zoom level, with the whole 8,455-dot field drawn.

Three things it settled that were worth finding out cheaply:

- **The layer order above.** The station field was invisible for an hour because
  it sat under opaque land.
- **Max zoom is about 17×, not 26×.** Past that the data has nothing more to give
  and the screen is just empty colour. Better to clamp than to let the user find
  the void.
- **Label collision is worth doing on day one, not last.** Without it, "Delhi"
  and "New Delhi" print on top of each other at the default view — the very first
  thing anyone sees. It is about fifteen lines: walk the eligible labels in
  priority order, keep a list of occupied screen rectangles, skip any that
  overlap one already placed.
