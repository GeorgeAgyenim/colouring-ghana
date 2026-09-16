# ADR-0010: Building data is published as one spatially addressable snapshot, plus downloadable area packs

- Status: Accepted
- Date: 16 September 2026
- Deciders: product owner (Colouring Ghana); design dialogue with Claude (Anthropic) as planning aid
- Requirements served: FR-8, FR-10
- Plain-English record: docs/Design-Decisions-Plain-English.md — D12

### Context

'GeoParquet' is a file format for tables of geographic data. It stores data by column, so the browser can fetch only the attributes a question needs, and in blocks ('row groups') that each record the rectangle they cover.

A 'range request' lets the browser ask a web server for just part of a file — 'bytes 4,000,000 to 4,300,000' — which is how it reads only the relevant blocks. A buffer around a market site may need a few hundred kilobytes out of a file that is gigabytes nationally.

The product owner asked what happens when a user pans or zooms to a new area. Browsing is served by tiles (D11) and works everywhere; analysis fetches whatever blocks the query area needs, wherever it is. A drawn buffer that straddles two districts simply reads blocks from both.

A 'pack' is a bundle for one area: tiles, the building data with all attributes, reference layers clipped to the area, the data definitions, and a manifest with the 'as of' time and checksums (fingerprints that prove the files are intact). A district pack should be tens of megabytes, not hundreds.

### Decision

The server exports the buildings table as a GeoParquet file sorted so that buildings near each other are stored near each other, in blocks with recorded bounding boxes. The browser reads only the blocks that overlap the area of a query. For offline use, the same data is pre-cut into 'packs' per district, together with tiles and reference layers.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Fixed per-district files only | One file per district; queries limited to one district. | Queries do not respect district boundaries once users can draw shapes. Kept as the packaging for offline, not the only path. |
| A query service returning results per request | The server assembles data for each query. | Server work per request; poor under concurrency; no offline. |
| Download everything | Each user fetches the whole dataset. | Fine for 21,200 buildings, impossible for Greater Kumasi on a mobile connection. |

### Rationale

- Tiny transfers per query on poor connections.
- Static files are the most concurrent thing a web server can serve; no per-request computation.
- Packs and the live snapshot are the same bytes, packaged differently — one export pipeline.

### Consequences

- Depends on: Choice of sort order and block size (open decision OD-6); pack size cap and update strategy (OD-2).
- Implementation: Nightly export from a read replica (a copy of the database used for reading so exports never slow down contributors); static hosting with range-request support, ideally behind a CDN (a network of servers that keeps copies close to users).

### Plain-English summary

The server exports the buildings table as a GeoParquet file sorted so that buildings near each other are stored near each other, in blocks with recorded bounding boxes. The browser reads only the blocks that overlap the area of a query. For offline use, the same data is pre-cut into 'packs' per district, together with tiles and reference layers.
