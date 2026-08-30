# Data pipeline

One command: `npm run data:build`. It fetches, cleans, and writes
`public/data/stations.json`. The output is gitignored — regenerate rather than
commit it.

## What it does and why

The raw DataMeet station file cannot be used as it is. Measured against the real
file rather than assumed:

| Problem | Scale | What the script does |
| --- | --- | --- |
| No `state` value | 4,593 of 8,990 (51%) | Ignores the field entirely and derives the state from the coordinate, by point-in-polygon against 760 district polygons |
| `state` present but disagreeing with the map | 92 stations | Same fix — see "Never trust the raw state" below |
| No coordinates | 293 | Drops them — a station that can't be placed can't go on a map |
| ~~Name identical to code~~ | ~~225~~ | **Removed — this rule was wrong.** 202 of those 225 were real stations that appear in the public timetables (MOGA, REWA, DURG, GUNA, HAPA, BEAS). Indian station codes are often just the name. |
| Falls outside every district polygon | 19 | Snaps to the nearest district within 25 km. Coastal stations on reclaimed land — Mumbai Central among them — sit outside the 2011 census boundary and were being dropped entirely |
| Codes prefixed `XX-`/`YY-`/`ZZ-` | a handful | Drops them |

**Why this matters more than it looks.** "States unlocked" is the strongest
reward in the whole design, and half the source data can't say which state a
station is in. Howrah, Sealdah and New Jalpaiguri — the three stations most used
on the routes this app is for — all come back `null`. Built on that field, the
feature would have been quietly wrong for half of your own journeys.

So the state lookup is a build step, not a runtime concern. It runs once and the
app ships a file where every station has a state.

## Never trust the raw state

The first version of this script only derived the state when the raw field was
missing. That was wrong, and it took building the map to notice: where the raw
field *is* present, it often disagrees with the boundary file.

| Station data says | Boundary file says | Stations |
| --- | --- | --- |
| `Orissa` | `Odisha` | 63 |
| `Delhi NCT` | `Delhi` | 28 |
| `Bangladesh` | — | 1 (Dhaca Cantt) |

Odisha and Delhi would never have lit up on the map, and a station in Bangladesh
would have appeared on a map of India — all without a single error in the logs.

The script now derives the state for every station from the same polygons the map
is drawn from, so the two agree by construction. Verified after the change: 29
distinct station states, 29 matching polygons, zero mismatches.

## Verified output — 29 August 2026

```
in                 8,990 stations
out                8,696 stations  (0.80 MB)
states covered     29
state derived from coordinates for 8,696 stations (all of them, by design)
of which snapped to the nearest district (coastal/border): 19

rejected
  no coordinates   293
  outside India    0
  junk code        0
  no name          0
  state unresolved 1

HWH   Howrah Jn — West Bengal
SDAH  Kolkata Sealdah — West Bengal
NJP   New Jalpaiguri — West Bengal
KPD   Katpadi Jn — Tamil Nadu
MAS   Chennai Central — Tamil Nadu
NDLS  New Delhi — Delhi
```

Those six codes are a deliberate sanity check at the end of the script. If any
prints `MISSING`, or carries a state you know is wrong, stop and fix the pipeline
before building anything on top of it.

One station ends up with no polygon match even after the 25 km snap. Dropping
one out of 8,696 is the right trade.

Cross-checked against the timetables: of the 8,539 station codes that appear in
public train schedules, **3.4% are missing** from this file, down from 6.0%
before the two fixes above. The remainder have no coordinates in the source at
all, so there is nothing to place them with.

Only 29 states are represented, not 36. Sikkim, Arunachal Pradesh, Meghalaya,
Ladakh, the island territories and Dadra and Nagar Haveli have no station in this
dataset. Some of that is real; Meghalaya's Mendipathar and Arunachal's Naharlagun
opened after the data was compiled. So "states unlocked" tops out at 29 today —
say so in the UI, or hand-add the missing few.

## Sources

| What | Where | Licence | Size |
| --- | --- | --- | --- |
| Stations | [datameet/railways](https://github.com/datameet/railways) `stations.json` | CC0 | 1.8 MB |
| District polygons | [udit-001/india-maps-data](https://github.com/udit-001/india-maps-data) `india.geojson` | see repo | 4.0 MB |
| Train routes (unused in v1) | datameet `trains.json` | CC0 | 14.8 MB |
| Schedules (unused in v1) | datameet `schedules.json` | CC0 | 82 MB |

The district file is used rather than a state file because it carries `st_nm` on
every district, and district-level polygons also leave the door open to a
"districts visited" stat later without another download.

## Known limitation

The station data is several years old. Station names, codes and coordinates
barely change, so the map is fine. **Train numbers and names may be stale**,
which is why the train field in the form is optional free text rather than a
dropdown validated against the schedule file. Say this in the case study — knowing
your data's limits reads better than pretending it's perfect.

## If you ever need the 82 MB schedules file

Don't put it in the browser. Load it into Postgres once:

```sql
create table schedules (
  id            bigint primary key,
  train_number  text not null,
  train_name    text,
  station_code  text not null,
  station_name  text,
  arrival       text,
  departure     text,
  day           int
);
create index schedules_train_idx on schedules (train_number);
create index schedules_station_idx on schedules (station_code);
```

This is the honest reason the project needs a backend at all, and a better answer
in an interview than "I wanted to learn Supabase".
