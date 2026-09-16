# Architecture Decision Records

Seeded from the requirements dialogue of 15–16 September 2026 (the `/grill-with-docs` stage, run outside the repo). Plain-English mirror: `docs/Design-Decisions-Plain-English.md`. New ADRs continue the numbering from 0019.

| ADR | Title | Decisions | Status | Date |
|---|---|---|---|---|
| ADR-0001 | Serve all five kinds of user equally in Version 1; Every question returns three things: a number, a map, and a downloadable dataset | D1, D2 | Accepted | 15 September 2026 |
| ADR-0002 | A fixed list of ten operations; statistics are out of scope; the assistant says so honestly | D3 | Accepted | 15–16 September 2026 |
| ADR-0003 | Reference geography is curated by the platform, not brought by users | D4 | Accepted | 15 September 2026 |
| ADR-0004 | One plan, three doors: builder, SQL editor and assistant all produce the same 'query plan' | D5 | Accepted | 15 September 2026 |
| ADR-0005 | Data that a user loads never leaves their browser | D6 | Accepted | 15 September 2026 |
| ADR-0006 | All analysis runs in the visitor's browser; the server only delivers data | D7 | Accepted | 15 September 2026 |
| ADR-0007 | Every answer carries its denominator, its completeness, and the time it is 'as of' | D8 | Accepted | 15–16 September 2026 |
| ADR-0008 | The AI assistant: an open-weight model we host; it sees only what it needs; it writes plans, not code | D9 | Accepted | 16 September 2026 |
| ADR-0009 | Replace the current map technology: MapLibre with vector tiles instead of Leaflet with Mapnik raster tiles; Ghana first, then contribute to the core platform | D11, D15 | Accepted | 16 September 2026 |
| ADR-0010 | Building data is published as one spatially addressable snapshot, plus downloadable area packs | D12 | Accepted | 16 September 2026 |
| ADR-0011 | Offline analysis is a first-class mode; the assistant needs a connection in Version 1; Offline contribution (editing buildings offline, syncing later) is a separate project | D13, D14 | Accepted | 16 September 2026 |
| ADR-0012 | The assistant is available to anonymous visitors, keeps no history, and is rate-limited per session | D10 | Accepted | 16 September 2026 |
| ADR-0013 | Questions about recent edits are answered only from an anonymised summary of the edit log | D17 | Accepted | 16 September 2026 |
| ADR-0014 | Handling many users at once: no server work per query, static delivery, and a sized queue for the assistant | D16 | Accepted | 16 September 2026 |
| ADR-0015 | Analysis is a third sidebar mode, with the category tiles kept visible; The AI assistant lives in a floating bubble at the bottom-left of the map; The conversation stays where the person typed it; only 'Edit in builder' moves them; The plan card looks the same everywhere and is the hand-off between assistant and builder; Layers and uploads live in 'Show layer options'; packs in the Menu; status in the header; drawing in the map-corner tools | D18, D19, D20, D21, D27 | Accepted | 16 September 2026 |
| ADR-0016 | A query result replaces the category colouring on the map; Clicking a building in result view shows a small popup with the values the plan used; Tables and charts are result cards that open full-size in a centred pop-up; there is no results drawer | D22, D23, D24 | Accepted | 16 September 2026 |
| ADR-0017 | The assistant never assumes a location; it asks, and the answer chips are the consent; 'My location' is resolved on the device; the person always chooses between a named area and a radius | D25, D26 | Accepted | 16 September 2026 |
| ADR-0018 | The map migration is its own project, delivered first, before the analytics work is stacked on it | D28 | Accepted | 16 September 2026 |
