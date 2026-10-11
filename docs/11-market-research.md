---
tags: [project, rail-passport, market-research, product-sense]
date: 2026-09-18
source: Vidit's advice — study similar products before adding features
status: living-document
---
# Platform — Market Research

> **One-line purpose:** find out who else has already built this, what they learned the hard way, and which jobs nobody is serving — so that the next feature is chosen from evidence rather than from whichever idea felt best on a Tuesday.

**Companions:** [[00 - Decisions]] (where conclusions become commitments) · [[01 - Suggestions from Vidit]] (the advice this answers) · [[03 - Rail Passport - Project Spec]] (the scope contract) · [[08 - Roadmap]] (the backlog this should reorder)

---

## What this document is, and is not

It **is** a register of the competitive landscape, a protocol for the research that has
not been done yet, and the tables to write the findings into.

It is **not** finished. The desk research below is real and dated; the hands-on
work — the bake-off, the review mining, the interviews — is scaffolded and empty.
Filling those tables is the actual assignment. A market research doc whose
conclusions arrived before its evidence is just an opinion with headings.

**Verification status matters and is marked throughout.** Two competitors were read
directly, page by page. The rest were found by search and are listed as leads, not as
facts. Anything unverified says so. Prices and feature sets in this category change
without notice, so every claim here carries the date it was true.

---

## 1. What market research actually consists of

Five workstreams. A product team would run all five. For this project three of them
earn their keep and two are mostly ceremony — which is worth saying out loud, because
doing ceremony thoroughly is a good way to feel productive without learning anything.

**1. Category and competitive landscape.** Who else solves this, how they position
themselves, what they charge, what they refuse to build. The output is a feature
matrix — competitors across, capabilities down — plus a positioning read on each:
who it is for, and what it leads with on its own landing page. *Earns its keep.*

**2. Demand evidence.** Proof that people want this, gathered without asking anybody.
Search phrasing, forum and subreddit threads, and the highest-yield source of all:
**review mining.** Sort a competitor's App Store reviews by most critical and read a
hundred of them. People state precisely what is broken and what they wish existed, in
their own words, unprompted, for free. *Earns its keep, and is the cheapest thing on
this list.*

**3. User research.** Five to seven conversations with people who actually take trains,
structured as jobs-to-be-done: *tell me about the last time you wanted to remember a
trip.* Past behaviour, never future intent — "would you use a feature that…" gets a
polite yes from everyone and is worth nothing. The output is a set of JTBD statements
in the user's language. *Earns its keep, and is the one most likely to get skipped
because it requires talking to people.*

**4. Market sizing.** TAM, SAM, SOM. For a one-user craft project this is theatre.
The honest, cheap version is worth twenty minutes: how many people are already in the
rail-logging communities that demonstrably exist? That single number decides whether
invite-only is a real constraint or an irrelevance. *Mostly ceremony. Do the cheap
version only.*

**5. Synthesis into positioning.** One paragraph — for whom, against which alternative,
why this wins — and an explicit list of what will not be built. *Earns its keep. This
is the deliverable to actually be judged on.*

---

## 2. The finding that matters

**The rail-journey-logging category is real, mature, and European. In India it is
empty.**

Every Indian rail app of consequence is transactional: book a ticket, check a PNR,
track a running train. Where is My Train, RailYatri, Confirmtkt, IRCTC Rail Connect,
NTES — utilities, all of them. Not one is a *memory* product.

Meanwhile a whole crop of log-and-map products exists in Europe, several of them free,
at least one of them considerably more featured than Platform is or will soon be.

Two consequences, and they point in opposite directions:

- **The good one.** The wedge is not "a train logging app" — that space is taken and
  well served. The wedge is that the largest passenger railway on earth has no memory
  product, and the existing ones are built on European data and European travel
  patterns. The 8,696-station dataset, the hand-drawn map, and the Indian Railways
  vocabulary are the defensible part. Not the feature list.
- **The uncomfortable one.** Any feature invented from scratch should be checked
  against viaduct first, because it probably shipped there two years ago, and possibly
  shipped badly in a way worth learning from.

---

## 3. Competitor register

Researched 18 September 2026 by web search. **Verified** means the product's own pages
were read directly. **Lead** means it appeared in search results and has not been
opened yet — treat those rows as homework, not findings.

| Product                                                      | What it is                                        | Platform  | Verified?          |
| ------------------------------------------------------------ | ------------------------------------------------- | --------- | ------------------ |
| [viaduct](https://viaduct.world/)                             | The most complete direct competitor found         | Web       | **Verified** |
| [TrainLookout](https://trainlookout.com/)                     | Near-identical premise to Platform                | Web       | **Verified** |
| [Träwelling](https://traewelling.de/)                        | Open-source public-transit check-in service       | Web + API | Lead               |
| [travelynx](https://alternativeto.net/software/travelynx)     | Träwelling's close cousin                        | Web       | Lead               |
| [TrainAtlas](https://trainatlas.app/)                         | Native rail trip tracker                          | iOS       | Lead               |
| [RailLog](https://apps.apple.com/us/app/raillog/id6744766909) | Native rail journey log                           | iOS       | Lead               |
| [Intercity](https://getintercity.app/)                        | "Personal train journey companion"                | Unknown   | Lead               |
| [RailChecker](https://railchecker.app/)                       | Rail tracking                                     | Unknown   | Lead               |
| [Flighty](https://flighty.com/)                               | Flights, not trains — the best-executed analogue | iOS       | Partial            |

### viaduct — study this one hardest

Free, no card required. Journey logging by hand against timetable data, **plus imports
from the Interrail app, CSV, and Träwelling.** Waypoint route adjustment. Interactive
map of everything logged. Coverage percentage and distance per country. A dashboard
with kilometres, overnight journeys and more. Timeline heatmaps. Operator tracking.
Filtering by year or trip. Public profiles with follow. Shareable map images and stat
graphics. Animated route videos with photo overlays. A discovery feed of other rail
enthusiasts. Optional "patron" memberships.

**And it sells physical prints of rail networks through a shop.** That is the most
directly useful commercial fact in this document: a map product with a print revenue
line. It bears on the image-hosting cost problem, where storage was the thing making
free-forever look hard. A print is a physical artifact people already pay for, and the
data to generate one is already in the app.

**What it teaches:** feature parity is lost already, and chasing it is the trap
(see §8). Also that imports — not manual entry — are how a logging product escapes the
cold-start problem. Decision 12's email ingestion is the same insight arrived at
independently, which is mild evidence it is the right next thing.

### TrainLookout — the closest thing to Platform

"Log, map and share your journeys by train, easily and intuitively." Station
autocomplete with full route preview. Customisable routing by adding intermediate
points. History filterable by year and trip. Stats on distance travelled and most
frequented stations. Shareable rail journey maps. Public profiles showing a map and
selected statistics. Over 80 countries.

Read its blog post, [how to log and map your train journeys](https://trainlookout.com/blog/how-to-log-and-map-your-train-journeys). A competitor explaining the job-to-be-done in its own marketing is free user research.

**What it teaches:** the "customise the route by adding waypoints" feature exists here
too, which is quiet validation of the routing work in [[07 - Routing]] — and a warning
that route-drawing is table stakes in this category, not a differentiator.

### Träwelling — competitor, or import source?

Open source ([GitHub](https://github.com/Traewelling/traewelling)), free,
self-hostable, and a *check-in* service rather than a retrospective log: you tell it
you are on a train now, rather than writing up the trip afterwards. It has an API, and
viaduct imports from it.

**What it teaches:** two things. First, check-in and log-afterwards are genuinely
different products serving different moments, and Platform should decide which it is
(currently: log-afterwards, with decision 12 pointing at automatic). Second, an
open-source competitor's **issue tracker is a public list of unmet user needs** — the
cheapest review mining available anywhere.

### Flighty — the quality bar

Flights, not trains, so not a competitor. But it is the best-executed instance of
"personal travel log as a beautiful object," and its paid tier is evidence that people
will pay for this class of product rather than merely enjoy it.

Its all-time-history and stats feature is called **[Passport](https://flighty.com/help/passport)**.
Worth noting without relitigating: decision 13 renamed ours to *Rail pass* for reasons
that still hold (railway-native rather than borrowed). But the incumbent using
"Passport" commercially is a real data point, filed here rather than argued about.

### The Indian market — all utility, no memory

[Where is My Train](https://play.google.com/store/apps/details?id=com.timetable.indian.railwaytimetable&hl=en_IN)
(Google-owned, very large), [RailYatri](https://apps.apple.com/us/app/train-ticket-app-railyatri/id1052177547),
Confirmtkt, IRCTC Rail Connect, NTES, and the field surveyed at
[trainapps.in](https://trainapps.in/).

Every one is book / PNR / live-status. **The gap is the whole opportunity**, and it is
also a warning: these apps have trained hundreds of millions of Indians to expect a
rail app to be a utility. Platform asks for something different — a few minutes of
reflection after a trip rather than thirty seconds of checking a train — and that
expectation gap is a real adoption risk, not just a positioning opportunity.

---

## 4. Feature matrix — to fill during the bake-off

Fill honestly, including where Platform loses. `?` means not yet checked.

| Capability                         | Platform                         | viaduct                            | TrainLookout                 | Träwelling       |
| ---------------------------------- | -------------------------------- | ---------------------------------- | ---------------------------- | ----------------- |
| Works without an account           | Yes (decision 11)                | ?                                  | ?                            | ?                 |
| Manual journey entry               | Yes                              | Yes                                | Yes                          | Check-in model    |
| Time to log one journey            | ? (claim: 15s)<br />takes 20s    | ?                                  | ?                            | ?                 |
| Automatic / imported entry         | No (decision 12 planned)         | Yes — Interrail, CSV, Träwelling | ?                            | n/a               |
| Route drawn on a map               | Yes, hand-drawn SVG              | Yes                                | Yes                          | ?                 |
| Waypoint / route correction        | Yes                              | Yes                                | Yes                          | ?                 |
| Distance stats                     | Yes                              | Yes                                | Yes                          | ?                 |
| Per-country / per-state coverage % | No                               | Yes                                | ?                            | ?                 |
| Most-frequented stations           | No                               | ?                                  | Yes                          | ?                 |
| Overnight journey tracking         | Partial (day offset stored)      | Yes                                | ?                            | ?                 |
| Operator / train-class tracking    | Partial (train number)           | Yes                                | ?                            | ?                 |
| Shareable image artifact           | Yes — Rail pass                 | Yes                                | Yes                          | ?                 |
| Public profile                     | No                               | Yes                                | Yes                          | Yes               |
| Social feed / follow               | No (deliberately)                | Yes                                | ?                            | Yes               |
| Photos attached to journeys        | No (researched, not built)       | Yes — overlays                    | ?                            | ?                 |
| Animated route video               | No                               | Yes                                | ?                            | ?                 |
| Indian Railways coverage           | **Yes — the whole point** | ?                                  | 80+ countries, India unknown | Unlikely          |
| Offline / installable              | Yes — PWA                       | ?                                  | ?                            | ?                 |
| Price                              | Free                             | Free + patron                      | ?                            | Free, open source |
| Monetisation                       | None                             | Patron +**print shop**       | ?                            | Donations         |

**The two rows that decide the next quarter** are *time to log one journey* and *Indian
Railways coverage*. If Platform is not meaningfully faster to log a trip in, the craft
argument is decoration. If a competitor turns out to have decent Indian data, the moat
is thinner than assumed. Check those two first.

---

## 5. Protocol — the competitor bake-off

Half a day. Highest information-per-hour of anything in this document.

1. Sign up for **viaduct**, **TrainLookout** and **Träwelling**.
2. Log **the same three real journeys** in each, and in Platform. Use trips actually
   taken, with awkward details — a train that runs past midnight, a station whose name
   is ambiguous, a leg with no through train.
3. **Time every one with a stopwatch.** Record taps, not just seconds.
4. Screenshot each step. These go in `docs/social/` if any of it ends up being posted.
5. Write down, in the moment: every place their flow beats ours, and every place ours
   beats theirs.

| Journey logged                                  | Platform | viaduct | TrainLookout | Träwelling |
| ----------------------------------------------- | -------- | ------- | ------------ | ----------- |
| Simple day trip — time / taps                  |          |         |              |             |
| Overnight train — time / taps                  |          |         |              |             |
| Awkward route (no through train) — time / taps |          |         |              |             |
| Worst moment of the flow                        |          |         |              |             |
| Best moment of the flow                         |          |         |              |             |

The specific question to answer: **is the fifteen-second claim true against the
competition, or only against nothing?**

---

## 6. Protocol — review mining

Two hours. Read, do not skim. Capture verbatim quotes, not paraphrases — the wording
is the finding.

Sources, in order of expected yield:

1. **Träwelling's GitHub issues** — feature requests from real users, already written
   down and triaged by somebody else.
2. **App Store reviews, sorted most critical**, for TrainAtlas, RailLog and Flighty.
3. **r/trains, r/indianrailways**, and the Indian railway enthusiast communities —
   where the audience for this actually lives.

| Quote (verbatim) | Source + link | What job it implies | Does Platform serve it? |
| ---------------- | ------------- | ------------------- | ----------------------- |
|                  |               |                     |                         |

A complaint that appears three times independently is a feature. A complaint that
appears once is a person.

---

## 7. Protocol — the interviews

Five to seven people who take long-distance Indian trains. Thirty minutes each. Ask
about the past; never pitch.

1. Tell me about the last long train journey you took.
2. Afterwards — did you want to remember any of it? What did you actually do?
3. Show me. (Then watch: it will usually be a camera roll and a vague memory.)
4. Have you ever tried to work out how much of India you have covered by train?
5. Who, if anyone, did you want to tell about the trip?
6. What did you do with the ticket email or SMS after the journey?

Question 6 is the one that tests decision 12. Question 5 tests decision 15. Question 3
tests whether the problem exists at all.

| Person | Takes trains for | What they do to remember | Quote worth keeping | Which decision it tests |
| ------ | ---------------- | ------------------------ | ------------------- | ----------------------- |
|        |                  |                          |                     |                         |

**The expected finding, which should be treated as a hypothesis and not a conclusion:**
people photograph things and then forget the trip. If that holds up across five
conversations, the product has a real job. If people turn out not to care about
remembering journeys at all, that is the most valuable thing this document could
possibly discover, and it should be written down here in full rather than quietly
ignored.

---

## 8. The trap

The failure mode of competitive research is reading viaduct's feature list and building
a worse viaduct. It has years of head start, three import paths, a social feed,
animated route video, and a print shop. Feature parity is not available.

So the rule for using this document: **look for jobs nobody is serving, not features
everybody has.**

Applied to the current backlog:

- **Decision 12, email ingestion — passes.** No Indian app does it, and the IRCTC
  confirmation email is a uniquely Indian data source that no European competitor can
  parse. This is the strongest item in the backlog and this research raises its
  priority rather than lowering it.
- **Decision 15, share page — passes, narrowly.** Serves a job (telling family where
  you are) that the logging competitors do not, because they are built around
  after-the-fact logging rather than a trip in progress.
- **A follow feed — fails.** Everybody has one, we would have it worse, and the project
  spec says this is explicitly not a social network.
- **Per-state coverage percentage — passes cheaply.** viaduct does this per country;
  per *state* is the Indian version, the data is already in the app for the map's own
  state-visited fill, and it is the kind of number that makes people want to travel
  more. Probably the best small idea in this document.

---

## 9. Market sizing, the honest version

Not attempted as TAM/SAM/SOM, because for a project with one user that arithmetic
would be decoration.

The number actually worth finding: **how many people are already active in rail-logging
communities** — Träwelling's registered users, viaduct's public profile count,
subreddit subscriber counts. That establishes whether this category is a few thousand
people worldwide or a few hundred thousand, which in turn decides whether invite-only
is a real constraint (from the storage-cost work) or a non-issue.

**Not yet found. One hour of work.**

---

## 10. Positioning — first draft, to be rewritten after the research

> For people who travel long distances on Indian Railways and want a record of it,
> Platform draws your rail life on a hand-made map of India. Unlike the Indian rail
> apps, which help you catch a train and forget it, and unlike the European logging
> tools, which are built on European data and European journeys, Platform is about
> Indian railways specifically and is made with more care than the category is used to.

Explicitly not building: live train status, booking, a social feed, following,
leaderboards, flights, buses, metros. (Consistent with the project spec's *Not in v1*
list — see [[03 - Rail Passport - Project Spec]].)

This draft was written from desk research alone. **Rewrite it once §5, §6 and §7 have
been done.** If the research does not change a single word of it, the research was
probably not done honestly.

---

## 11. How this feeds decisions

The rule: **a feature request with no evidence link does not get built.**

When something here graduates into a commitment, it moves to
[[00 - Decisions]] as a numbered decision with its reasoning and its honest cost —
the same format as decisions 11 through 15. This document stays the evidence layer;
that one stays the commitment layer. Findings live here, choices live there, and the
link between them should always be traceable in both directions.

---

## APIs

### [railradar.in/docs](https://railradar.in/docs)  - paid (free tier: 1000 calls/month) - useful for sandboxing and developement

**Trains**

* `GET` Train Schedule & Timetable API
* `GET` Live Train Running Status API
* `GET` Train Route Geometry (GIS) API
* `GET` Train Coach Position & Layout API
* `GET` Platform Coach Position API
* `GET` Train Seat Availability API
* `GET` Train Ticket Fare API
* `GET` Trains Between Stations API

**PNR STATUS**

* `GET` PNR Status API
* `GET` PNR Confirmation Prediction API
* `GET` PNR Cancellation Refund API

**STATIONS**

* `GET` Station Timetable Board API
* `GET` Live Station Board API

**LOOKUP & SEARCH**

* `GET` Station Autocomplete Search API
* `GET` Train Autocomplete Search API
* `GET` Station Directory Lookup API
* `GET` Train Directory Lookup API
* `GET` PRS Reserved Trains Directory API
* `GET` Filter Trains API
* `GET` Train Categories API
* `GET` Train Speed Types API
* `GET` NTES Trains Lookup API
* `GET` NTES Stations Lookup API
* `GET` Compressed Station Lookup Stream API
* `GET` Compressed Train Route Lookup Stream API
* `GET` Compressed PRS Trains Stream API

**SUBURBAN / LOCAL TRAINS**

* `GET` Suburban Local Trains API
* `GET` Suburban Local Train Cities API

**LEGACY FEEDS**

* `GET` All Stations KVs API (Legacy)
* `GET` All Trains KVs API (Legacy)
* `GET` Trains Between Stations API (Legacy)
* `GET` Shipping Find Trains API (Legacy)
* `GET` Live Map Snapshot API (Legacy)
* `GET` Train Details API (Legacy)

## 12. Open questions

- Does any existing logging product have usable Indian Railways data? (Decides how
  thin the moat is. Check TrainLookout's 80-country list first.)
- Check-in or log-afterwards — which moment is Platform actually for? Träwelling proves
  they are different products.
- How many people are in this category worldwide? (§9, unanswered.)
- Would anybody pay for a print of their own rail map? viaduct's shop suggests yes, for
  somebody, somewhere.
- Is the expectation gap real — do Indians trained on utility rail apps reject a
  reflective one?

---

## Sources

All retrieved 18 September 2026.

**Direct competitors, read in full:**
[viaduct](https://viaduct.world/) ·
[TrainLookout](https://trainlookout.com/) ·
[TrainLookout — how to log and map your train journeys](https://trainlookout.com/blog/how-to-log-and-map-your-train-journeys)

**Leads, found by search, not yet opened:**
[Träwelling](https://traewelling.de/) ·
[Träwelling on GitHub](https://github.com/Traewelling/traewelling) ·
[travelynx](https://alternativeto.net/software/travelynx) ·
[TrainAtlas](https://trainatlas.app/) ·
[TrainAtlas on the App Store](https://apps.apple.com/us/app/trainatlas-rail-trip-tracker/id6775375290) ·
[RailLog](https://apps.apple.com/us/app/raillog/id6744766909) ·
[Intercity](https://getintercity.app/) ·
[RailChecker](https://railchecker.app/)

**Adjacent quality bar:**
[Flighty](https://flighty.com/) ·
[Flighty Passport](https://flighty.com/help/passport) ·
[Flighty pricing](https://flighty.com/pricing)

**Indian market:**
[Where is My Train](https://play.google.com/store/apps/details?id=com.timetable.indian.railwaytimetable&hl=en_IN) ·
[RailYatri](https://apps.apple.com/us/app/train-ticket-app-railyatri/id1052177547) ·
[trainapps.in — the field surveyed](https://trainapps.in/)
