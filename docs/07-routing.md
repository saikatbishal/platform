# Drawing a journey

A journey is not a line between two dots. If you draw it that way it does not
follow the railway, and over a long hop it does not even stay on land.

---

## What was wrong

The spike drew a journey as a polyline through its endpoints — seven points from
Howrah to Katpadi. On the Vijayawada → Chennai leg that produced a line straight
across the Bay of Bengal.

It isn't a rendering bug. It is the honest consequence of having only two points.
India's east coast is **concave**, so a chord between two points on it cuts the
corner, and the corner is sea.

Measured, by sampling 25 points along each segment and testing each against the
760 district polygons:

| | points | length | share of the line over water |
| --- | --- | --- | --- |
| Vijayawada → Chennai, straight | 2 | 384 km | **75%** |
| Whole Howrah → Katpadi route, straight | 7 | 2,024 km | 13% |
| Whole route, following the track | 338 | 2,294 km | **0%** |

The straight line also **undercounts distance by about 10%**, so the kilometre
total — the headline number in the whole app — was wrong too.

---

## The fix that didn't work

The obvious move is to snap the journey to `rail.topo.json`, the rail geometry
already being drawn. Build a graph from the line segments, run a shortest path.

It fails, and it is worth knowing why before trying it.

Natural Earth's railroads are a **cartographic** dataset at 1:10 million, not a
routing one. The graph comes out 99% connected — encouraging — but it has
breaks. There is one on the final approach to Chennai, between Sullurupeta and
the city. A router that hits it detours 500 km inland via Guntakal, so
Vijayawada → Chennai comes out at **877 km instead of 430**.

Every other hop down that same coast routes within 6% of straight-line distance:

```
  BZA -> TEL     33 km   x1.06
  TEL -> OGL    108 km   x1.04
  OGL -> NLR    120 km   x1.01
  NLR -> GDR     38 km   x1.05
  GDR -> SPE     54 km   x1.02
  SPE -> MAS   1187 km   x16.00   <-- the break
```

The data is *almost* right, which is the worst kind of wrong: it looks like it
works until one specific journey is nonsense. Simplification isn't the cause —
the unsimplified source has the same gap, and widening the node-snapping
tolerance to 900 m only trades this error for others.

---

## The fix that works

**Build the network from the timetable, not from geometry.**

Every pair of consecutive stops of every train is an edge. A network derived
from actual service cannot have coverage gaps, because a train that runs must
have a continuous sequence of stops.

5,208 trains collapse to **9,895 unique edges** over 8,246 stations. Written as a
station code table plus flat integer triples, that is 176 KB raw and **70 KB
gzipped** — smaller than the geometry used to *draw* the network. It ships to the
browser, and Dijkstra over it takes 2–19 ms, so routing needs no backend.

Verified:

| route | via stops | length | real | over water |
| --- | --- | --- | --- | --- |
| Vijayawada → Chennai | 71 | 427 km | ~430 km | 0.00% |
| Howrah → Chennai | 256 | 1,596 km | ~1,660 km | 0.00% |
| Howrah → New Delhi | 202 | 1,433 km | ~1,450 km | 0.00% |
| New Delhi → Mumbai Central | 217 | 1,346 km | ~1,385 km | 0.14% |
| Chennai → Katpadi | 37 | 128 km | ~130 km | 0.00% |

Distances now land within a few percent of real rail distances, which also
retires the "great-circle undercounts" caveat that was in the spec.

---

## Two levels of truth

`src/features/map/route.ts` exposes both, and the difference matters for what
the UI is allowed to claim:

**Exact.** The user recorded a train number and we know its stop list. Then the
path is not inferred at all — it is the sequence that train actually calls at.
Say "via 71 stops".

**Plausible.** No train number. Shortest path over the network. It is a good
guess and it follows real track, but it may not be the line the user rode. Do not
present it as fact; the UI should be quieter about it.

---

## Two bugs this uncovered in the station data

Chasing the routing failure exposed problems in `build-stations.ts` that had
nothing to do with maps.

**The `name == code` filter was 90% wrong.** It dropped 225 rows on the
assumption that a station whose name equals its code is a placeholder. 202 of
them were real stations that appear in the public timetables — MOGA, REWA, DURG,
GUNA, HAPA, BEAS, ETAH. Plenty of Indian stations are codenamed after
themselves. The filter is gone.

**Coastal stations fell outside every district polygon.** Mumbai Central sits on
reclaimed land that the 2011 census boundary does not cover, so it was dropped
entirely — and with it, any journey starting there. Now an unmatched station
snaps to the nearest district within 25 km. Nineteen stations take that path.

Net effect: **8,455 → 8,696 stations**, and the share of timetable stations
missing from the file fell from 6.0% to 3.4%. The remainder have no coordinates
in the source at all.

---

## What still isn't right

**Between adjacent stops the line is still straight.** Stops are a median of 5 km
and a maximum of 19 km apart, so at country and region zoom this is invisible,
and it never leaves land. At street zoom it will visibly cut corners the track
doesn't. Fixing it properly means real track geometry — OpenStreetMap railways,
not Natural Earth — and that is a v2 project, not a v1 one.

**293 timetable stations have no coordinates** in the source, so a journey
through one of them routes around it.

**The timetable is several years old.** Lines opened since are missing. This is
the same caveat as everywhere else in the data, and it belongs in the case study
rather than being hidden.
