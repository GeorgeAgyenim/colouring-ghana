# ADR-0014: Handling many users at once: no server work per query, static delivery, and a sized queue for the assistant

- Status: Accepted
- Date: 16 September 2026
- Deciders: product owner (Colouring Ghana); design dialogue with Claude (Anthropic) as planning aid
- Requirements served: NFR-2
- Plain-English record: docs/Design-Decisions-Plain-English.md — D16

### Context

'Concurrency' means many people using the system at the same time. 'Load testing' means simulating that before it happens for real.

In a training room the real bottleneck is often the room's own internet connection, not the project's server: 50 people each downloading a 40 MB pack is 2 GB through one link. Hence packs shared as files (D13) and rate limits per session rather than per shared address (D10).

### Decision

Queries cost the server nothing because they run in browsers. Data and packs are static files. The only shared bottleneck is the AI model, which is sized and load-tested for the named scenario of 30–50 planners in one training room, with a visible queue and the builder as the no-wait alternative. Exports run from a read replica so they never block contributors.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Per-query server execution with connection pools | The conventional web-GIS approach. | Every query competes for the database; concurrency becomes a scaling problem instead of a non-problem. |
| Unlimited assistant access | No queue or limits. | A single GPU serves a finite number of requests; without a queue, everyone experiences failures rather than a short wait. |

### Rationale

- The architecture removes the usual bottleneck by design; what remains can be measured and provisioned.

### Consequences

- Depends on: Load test before the first training session; hardware chosen to meet the target of 50 concurrent assistant requests completing within 30 seconds at worst.

### Plain-English summary

Queries cost the server nothing because they run in browsers. Data and packs are static files. The only shared bottleneck is the AI model, which is sized and load-tested for the named scenario of 30–50 planners in one training room, with a visible queue and the builder as the no-wait alternative. Exports run from a read replica so they never block contributors.
