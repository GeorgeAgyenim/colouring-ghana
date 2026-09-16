# CONTEXT.md — Colouring Ghana Analytical Platform

Project terminology and standing context, in the form `/grill-with-docs` maintains. Terms here are the canonical vocabulary for specs, tickets, code identifiers and UI copy. Keep entries short; put rationale in `docs/decisions/`.

## What we are building

An analytical layer for Colouring Ghana (a colouring-core fork): spatial questions composed as **plans**, executed in the visitor's browser by **DuckDB-WASM**, entered through a click **builder**, a **SQL editor**, or an **assistant** that emits plans; results as a **number**, a **map** (result view) and a **dataset**, each carrying **completeness** and an **as of** timestamp; **packs** for offline use; uploaded layers never leave the browser. Requirements: `docs/PRD-colouring-ghana-analytics.md`. Decisions: `docs/decisions/`.

## Standing constraints

- P1 Uploaded layers never leave the browser (extent may, with disclosure).
- P2 One execution engine, in the browser; the server delivers snapshots, tiles, reference layers.
- P3 One plan format; builder, SQL editor and assistant all target it.
- P4 Every answer carries a denominator and completeness.
- P5 Every answer carries the snapshot 'as of' timestamp.
- P6 The assistant declines what the engine cannot do.
- P7 Offline is a first-class mode.
- P8 Ghana first, contribute to core later.
- P9 Everything is documented (see CLAUDE.md).

## Terminology

| Term | Meaning |
|---|---|
| ADR (Architecture Decision Record) | A short document that records one decision: the situation, the options considered, the choice made, and why. This document is the plain-English companion to those records. |
| Aggregate / group and count | Totting up buildings by some grouping — by district, by construction material — to get counts, shares or averages. |
| Anchored panel | The chat window that opens from the assistant bubble and stays attached to it, growing upward over the map. |
| Anonymised view | A derived table from which all identifying information has been removed before anyone can query it. |
| API | Application Programming Interface: a defined way for one program to ask another for something over the internet. |
| As of | The date and time of the data snapshot an answer was computed from. Shown on every result. |
| Attribute | A piece of information recorded about a building, such as its number of storeys, construction material or condition. |
| Benchmark run (A, B, C) | One of the three settings the map benchmark is measured in: A, a laptop on an unthrottled office connection; B, the same laptop with a fixed slow-4G network throttle (the run the pass rule is judged on); C, an Android phone on mobile data driven over remote debugging. Five repetitions each. |
| Bottom sheet | On a phone, a panel that slides up from the bottom of the screen; the mobile form of the bubble's panel and the sidebar. |
| Bounding box | The smallest rectangle that contains a set of shapes. |
| Bring your own key (BYOK) | Letting a user connect their own account with an AI provider instead of using the project's model. |
| Browser | The program (Chrome, Safari, Firefox, Edge) on a person's own device in which the platform runs. |
| Bubble (assistant bubble) | The small round button at the bottom-left of the map that opens the AI assistant. |
| Buffer | A zone of a chosen distance around a point, line or shape — for example, everything within 500 metres of a site. |
| Builder | The click-and-choose interface for composing a query plan without writing code. |
| CDN (Content Delivery Network) | A network of servers around the world that keep copies of files close to users so downloads are faster. |
| Checksum | A short fingerprint computed from a file's contents; if the file changes or is corrupted, the fingerprint changes. |
| Chip | A small clickable option (for example 'This view', 'My location') rendered under a clarifying question. |
| Choropleth | Shading areas — electoral areas, neighbourhoods — by a value such as a count. |
| Clarification | The assistant's second kind of answer: a question with a fixed set of options, shown as chips, used when it needs a place, a distance or an attribute value. |
| Cold cache | A browser that holds nothing from an earlier visit, so every file is downloaded. The benchmark starts each repetition in a fresh browser context and fails if a response comes from the cache without an earlier download in the same repetition. |
| colouring-core | The shared codebase that every Colouring Cities platform is copied from. |
| Compiler (plan compiler) | The component that turns a query plan into instructions the engine can run. |
| Completeness | For an attribute, how many buildings in scope have a value recorded versus how many are blank. |
| Concurrency | Many people using the system at the same time. |
| Conflict resolution | Deciding what to do when two people have changed the same thing while apart. |
| Consent by action | The person's choice of an option is itself the permission to send what that option says it sends; there is no separate dialog. |
| Cross-tab | A table counting buildings by two attributes at once — for example, storeys against material. |
| Database | Organised storage of data that can be queried. Colouring Ghana uses PostgreSQL with the PostGIS extension for geography. |
| deck.gl | A browser library for drawing very large numbers of shapes quickly on a map. |
| Delta update | Downloading only what has changed since the last download, instead of everything. |
| Denominator | The total an answer is measured against — 'out of how many'. |
| DuckDB-WASM | DuckDB is an analytical database; the WASM version runs inside a web browser. It is the platform's analysis engine. |
| Edit log | The platform's history of who changed what and when. |
| Edits-since overlay | The buildings changed after the nightly tile file was made, fetched as a short list and drawn on top of it so contributors see their edits at once. |
| Engine | The software that actually runs a query plan: DuckDB-WASM in the browser. |
| Export job | The scheduled task that reads the buildings table once and builds every published file (tiles, snapshot, manifest) from that single reading. |
| Export role | The dedicated read-only database role the export job runs under; it can read buildings and reference layers but never contributor identities. |
| Feature flag | A switch in the software that turns a capability on or off per environment or per user without changing the code. |
| Feature state | A MapLibre mechanism for attaching a temporary flag (such as 'selected' or 'superseded') to one map feature by its id, so it can be restyled without refetching tiles. |
| Fix (position fix) | The location reported by a device's location service, with an accuracy estimate. |
| FlatGeobuf | A compact single-file format for map shapes, used as the export job's intermediate file. |
| Footprint | The outline of a building as seen from above; the basic shape the platform stores for each building. |
| Fork | A copy of a codebase that is developed separately; Colouring Ghana is a fork of colouring-core. |
| GeoJSON | A common text format for geographic shapes. |
| GeoPackage | A single-file container for geographic data, readable by most GIS software. |
| GeoParquet | A file format for tables of geographic data, stored by column in blocks, so software can read only the parts it needs. |
| GIS | Geographic Information System: software and methods for working with map data. |
| GPU | Graphics Processing Unit: the kind of processor that runs AI models quickly. |
| Grounding | The reference material (definitions, layer lists, metric definitions) an AI assistant is given so its answers are consistent with the platform. |
| Hit-test (local) | Finding which building is under a click by asking the map for the rendered shapes at that point, in the browser, instead of asking the server. |
| Inference server | The program that runs an AI model and answers requests; examples include vLLM. |
| IP address | The number identifying an internet connection; often shared by a whole office. |
| JSON | A simple text format for structured data that both people and programs can read; query plans are written in it. |
| Language model (LLM) | The AI software behind chat assistants. |
| Layer | A set of map shapes with information attached (district outlines, roads, flood zones). |
| Leaflet | The browser map library the platform uses today. |
| Load test | Simulating many simultaneous users before they arrive for real. |
| Local network (LAN) | The network within one building or room, which works without the wider internet. |
| Manifest | A small file inside a pack listing what it contains, its 'as of' time and checksums. |
| Map-stack flag | The feature flag that chooses between the old map (Leaflet and Mapnik) and the new one (MapLibre and PMTiles): an environment default, a `?map=` URL parameter, and a cookie that remembers the parameter. |
| MapLibre GL | An open-source browser map library built for vector tiles. |
| Mapnik | The server program that currently draws picture tiles; reported as slow. |
| Martin / pg_tileserv | Programs that produce vector tiles directly from a PostGIS database. |
| MMDA | Metropolitan, Municipal or District Assembly — Ghana's local government units. |
| Modal (pop-up) | A window that opens in the middle of the screen over everything else, used here to show a table or chart at full size. |
| Open-weight model | An AI model whose trained parameters are published, so it can be run on one's own computer. |
| OpenRouter | A commercial service that gives access to many AI models through one account, charging per use. |
| Origin-private file system | Private storage inside the browser for a website's own files; where packs and uploaded layers are kept. |
| Pack | A downloadable bundle for one area — tiles, building data, reference layers, definitions, manifest — for offline use. |
| Parity | The new map doing everything the old one did, checked against a written list. |
| Parity checklist | A written list of everything the old map does, used to confirm the new map does it too. |
| Parity defect | A difference found by the parity checklist. Blocking: a behaviour is lost or wrong. Cosmetic: it only looks different. |
| Path file (benchmark path) | One checked-in definition of the map journey (viewport, places, zoom steps, category pair, fixed building) that both the browser smoke test and the benchmark script read, so they cannot drift apart. |
| Plan / query plan | The platform's structured description of a question: an ordered list of operations, written in JSON. |
| Plan card | The on-screen form of a plan: a one-line summary, the steps beneath, and the actions Run, Edit in builder, Save, Share. |
| PMTiles | A single file containing all the map tiles for an area, readable in small pieces without a tile server. |
| Popup (map popup) | A small box that opens on the map next to a clicked building, showing the values the plan used. |
| PostGIS | The extension that gives the PostgreSQL database geographic abilities. |
| PRD | Product Requirements Document: the formal statement of what is to be built. |
| Provenance | The recorded origin of a dataset: source, licence, date, processing, limitations. |
| PWA (Progressive Web App) | A website that installs like an app and keeps working without a connection. |
| Range request | Asking a web server for only part of a file. |
| Raster tiles / vector tiles | Raster tiles are pictures; vector tiles carry the shapes themselves and can be restyled instantly. |
| Rate limit | A cap on how many requests one user can make in a period. |
| Read replica | A copy of the database used only for reading, so heavy reads never slow down people writing. |
| Reference layer | A layer the platform provides for everyone, such as district boundaries. |
| Regression / significance test | Statistical methods that estimate whether one thing is related to another beyond chance. Not supported in Version 1. |
| Result card | An inline card for a table or chart, with preview, 'as of' stamp and completeness, that opens full-size in a modal. |
| Result view | The map state after a plan runs: neutral buildings except matches or a choropleth; the legend shows the result. |
| Row group | A block of rows inside a GeoParquet file, with its own recorded bounding box. |
| Schema | The formal description of a data structure — what fields exist and what type each is. |
| Segment (path segment) | One step of the benchmark path (the initial load, a pan, one zoom level, a category switch, the selection) for which time and bytes are recorded together. |
| Service worker | The browser component that lets a PWA work offline. |
| Session token | A code the browser receives when the page loads, used to identify that session for rate limiting. |
| Settled (map settled) | The moment the map has nothing left to do after a gesture: every tile loaded, no animation running, no request in flight. Time-to-interactive is measured to the first settle; each segment ends at its settle. |
| Shapefile | An older but widespread GIS file format, usually shared as a zip. |
| Sideloading | Installing a file by copying it directly (USB, local network) rather than downloading from the internet. |
| Snapshot | A copy of the data taken at a known, recorded moment. |
| Soak period | A stretch of time a change runs in production, with the old behaviour still available, before it is declared final. |
| Space-filling curve | A way of ordering locations so that things near each other on the map are near each other in a file. |
| Spatial relate / spatial join | Asking which buildings fall inside, touch, or are nearest to some other shapes. |
| SQL / spatial SQL | The standard language for asking questions of databases; spatial SQL adds geographic functions. |
| Structured output | Making an AI model answer in a fixed format (such as a JSON plan) rather than free text. |
| Style config | The one list of attribute-to-colour rules from which both the map colouring and the legend are generated. |
| Sync | Sending edits made offline to the server once a connection returns. |
| Tile / tile cache | A small square of map; a cache keeps recently produced tiles so they need not be made again. |
| Tile schema | The versioned list of properties carried by each building in the tile archive; packs and the core contribution rely on it. |
| Time-to-interactive (map) | The time from starting to load the page until the map first settles, measured with a cold cache. NFR-1.4's target is set from the recorded Mapnik baseline. |
| Tippecanoe | The command-line tool that turns exported shapes into a tile file. |
| Turf.js / geos-wasm | Browser libraries for geometry operations. |
| Uploaded layer | Data a user loads from their own device; it stays in the browser. |
| Validator | The component that checks a plan is allowed and well-formed before it runs. |
| Viewport | The part of the map currently visible on screen. |
| WebAssembly (WASM) | Technology that lets full programs run inside a browser at near-native speed. |
| Within-repetition reuse | A tile served from the browser cache because the same repetition already downloaded it (for example after zooming out and back in). Counted per segment, contributes no bytes and is left out of latency percentiles; it is not a cold-cache violation. |

## Canonical acceptance questions

Q1 MMDA officer — residential, poor condition, in flood zone, by electoral area.
Q2 Planner — 500 m of a drawn site: storeys × material vs the sub-metro.
Q3 Researcher — >30 years old, poor condition, within 200 m of a major road, by neighbourhood.
Q3′ Researcher — statistical relationship: **not supported**; assistant declines and offers the dataset.
Q4 Student — share with no recorded piped water / paved road by neighbourhood vs oldest housing stock.
Q5 Resident — buildings on my street edited in last six months; attributes still blank.

Full wording and decomposition: PRD §4.2.
