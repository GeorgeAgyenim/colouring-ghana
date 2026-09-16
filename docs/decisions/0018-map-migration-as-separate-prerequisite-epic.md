# ADR-0018: The map migration is its own project, delivered first, before the analytics work is stacked on it

- Status: Accepted
- Date: 16 September 2026
- Deciders: product owner (Colouring Ghana); design dialogue with Claude (Anthropic) as planning aid
- Requirements served: FR-9.1, FR-9.5, FR-9.6; PRD §13 E0
- Plain-English record: docs/Design-Decisions-Plain-English.md — D28

### Context

A 'feature flag' is a switch in the software that turns a capability on or off per environment or per user without changing the code, so the new map can be tested by some people while others keep the old one.

'Parity' means the new map does everything the old one did — category colours, legend, selecting and editing buildings, the location control, layer options — and this is checked against a written list, in production, not assumed.

### Decision

Replacing Leaflet and Mapnik with MapLibre and PMTiles (D11) is delivered as a separate, prerequisite project with its own tracking issue, branch, specification and tickets. It goes into the main codebase first, behind a switch that allows the old and new maps to coexist, and runs in production with the old map available as a fallback until a written parity checklist passes. The analytics work is then rebuilt on top of it. Analytics features that need the new map — result view, drawing results, the building popup in result view, the draw tool, tiles inside packs — wait for it; everything else proceeds in parallel.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Keep the migration inside the analytics project | One branch, one release, as first planned. | The migration is valuable on its own (the current map is slow), is the riskiest change for existing users because it touches viewing and editing, and is the part other Colouring Cities partners will examine most closely. Buried in a larger project it would get none of the separate testing, staged release or focused review it needs. |

### Rationale

- A faster map can reach users months before the analytics does.
- Risk to existing contributors is isolated and released on its own timetable.
- A standalone change is something the shared core codebase can evaluate and adopt.
- Work that does not touch the map — plans, the engine, the builder, data export, reference layers, the assistant — is not delayed.

### Consequences

- Rules out / defers: Starting result-view and result-drawing work before the new map has merged.

### Plain-English summary

Replacing Leaflet and Mapnik with MapLibre and PMTiles (D11) is delivered as a separate, prerequisite project with its own tracking issue, branch, specification and tickets. It goes into the main codebase first, behind a switch that allows the old and new maps to coexist, and runs in production with the old map available as a fallback until a written parity checklist passes. The analytics work is then rebuilt on top of it. Analytics features that need the new map — result view, drawing results, the building popup in result view, the draw tool, tiles inside packs — wait for it; everything else proceeds in parallel.
