# ADR-0003: Reference geography is curated by the platform, not brought by users

- Status: Accepted
- Date: 15 September 2026
- Deciders: product owner (Colouring Ghana); design dialogue with Claude (Anthropic) as planning aid
- Requirements served: FR-7
- Plain-English record: docs/Design-Decisions-Plain-English.md — D4

### Context

A 'layer' is a set of map shapes with information attached (for example, the outline of each district with its name). A 'reference layer' is one the platform provides for everyone.

When an MMDA officer says 'my district', the platform can only answer if it already knows what a district is and where its edges are. Four of the five example questions depend on such layers.

### Decision

Boundaries and features that questions refer to — districts, electoral areas, sub-metros, neighbourhoods, major roads, flood-prone zones, named streets — are loaded and maintained by the Colouring Ghana team as 'reference layers'. District boundaries are already loaded (awaiting release); the flood-zone layer exists but is empty and its data is yet to be loaded.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Users bring their own boundaries | Each user uploads district or neighbourhood shapes when they need them. | Inconsistent definitions between users; unusable by residents and students; defeats offline use. |
| Fetch boundaries from external web services | Call an online map service for boundaries each time. | Needs an internet connection at query time; definitions can change without notice; no control over licensing. |

### Rationale

- Consistency: everyone's 'neighbourhood' is the same neighbourhood.
- Offline: reference layers can be packaged for download (see D13).
- Accountability: each layer gets a written provenance record — where it came from, its licence, its date, and any definitional choices such as which roads count as 'major'.

### Consequences

- Depends on: A data-curation workstream that is on the critical path, and decisions on what 'neighbourhood' and 'major road' mean in Ghana (open decisions OD-3).

### Plain-English summary

Boundaries and features that questions refer to — districts, electoral areas, sub-metros, neighbourhoods, major roads, flood-prone zones, named streets — are loaded and maintained by the Colouring Ghana team as 'reference layers'. District boundaries are already loaded (awaiting release); the flood-zone layer exists but is empty and its data is yet to be loaded.
