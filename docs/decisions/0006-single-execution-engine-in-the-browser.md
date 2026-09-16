# ADR-0006: All analysis runs in the visitor's browser; the server only delivers data

- Status: Accepted
- Date: 15 September 2026
- Deciders: product owner (Colouring Ghana); design dialogue with Claude (Anthropic) as planning aid
- Requirements served: FR-1.3–1.6, NFR-2.4
- Plain-English record: docs/Design-Decisions-Plain-English.md — D7

### Context

The 'engine' is a small database that runs inside the web page. We use DuckDB-WASM: DuckDB is an analytical database; WASM (WebAssembly) is the technology that lets such software run inside a browser at near-native speed. A spatial extension gives it geographic functions such as buffers and overlays.

For a district like Oforikrom (21,200 buildings, about 100 attributes each), the data is a few megabytes — comfortable to fetch and analyse on a phone. For larger areas, the browser fetches only the part it needs (see D12), and every query starts by choosing an area.

A 'snapshot' is a copy of the database taken at a known moment, with that moment recorded. Answers say 'as of' that moment.

### Decision

One analytical engine, running inside the browser, executes every query plan. The server does not run user queries. Its analytical job is to publish timestamped copies of the building data ('snapshots'), map tiles and reference layers that the browser fetches in small pieces.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Run queries on the server (PostGIS) | Send each query to the server's database and return the answer. | Incompatible with D6 for uploaded data; every query is server load and risk; does not work offline; every user's question and location passes through the server. |
| Two engines: server when there is no upload, browser when there is | Use the server for speed when possible, the browser only when privacy demands it. | Two systems to keep in perfect agreement, or the same question gives different answers depending on whether a file was loaded. At Version 1 data sizes the server engine buys nothing. |
| External GIS server (GeoServer, QGIS Server) or Python service | A separate analysis service on the server. | Same objections as server-side execution, plus another service to run. |
| Notebooks (Jupyter) | A coding notebook environment. | Serves researchers only; heavy; offline-hostile. |

### Rationale

- The privacy rule (D6) requires browser execution for uploads; making it the only engine keeps behaviour identical for everyone.
- Data volumes fit: the pilot is 21,200 footprints; Greater Kumasi will be hundreds of thousands, but no example question is Kumasi-wide — they are scoped to a district, a sub-metro, a buffer or a street.
- Zero server load per query: a thousand planners running analyses at once cost the server nothing.
- It makes offline use nearly free (D13) and makes a SQL editor safe, because there is no server to protect from user code.
- Reproducibility: the plan plus the snapshot is the whole analysis.

### Consequences

- Rules out / defers: Server-side execution for national-scale totals, until the data footprint requires it; the plan format is designed so this can be added later without changing the product.
- Implementation: DuckDB-WASM with its spatial extension in the browser; Turf.js or geos-wasm (browser geometry libraries) for any operation DuckDB lacks; a 'compiler' that turns plans into engine instructions; a 'validator' that checks plans before they run.

### Plain-English summary

One analytical engine, running inside the browser, executes every query plan. The server does not run user queries. Its analytical job is to publish timestamped copies of the building data ('snapshots'), map tiles and reference layers that the browser fetches in small pieces.
