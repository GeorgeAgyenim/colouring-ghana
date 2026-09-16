# Documentation rules — Colouring Ghana

These rules apply to every change. Colouring Ghana is part of a research programme, so each change must be
reproducible, traceable to a requirement and a decision, and accountable: who decided, when, why, and what
else was considered. A change that works but is undocumented is not done.

Where things live: terminology in `CONTEXT.md`; decisions in `docs/decisions/` (index in its `README.md`);
requirements in `docs/PRD-colouring-ghana-analytics.md`; tickets in `docs/tickets/`; templates in
`docs/templates/`; tool and dependency inventory in `docs/tools/inventory.md`.

## Rules

1. **Choosing between alternatives** (library, format, data source, API shape, model, prompt strategy):
   write an ADR from `docs/templates/adr.md` *before* implementing. Status is `Proposed` until a human
   accepts it. An ADR lists the alternatives rejected and ends with a plain-English summary. Never edit an
   accepted ADR; write a new one that supersedes it and add a row to the index.
2. **Every feature** has a doc in `docs/features/` from `docs/templates/feature.md`: what it does, how it
   works, tools used, choices made, limitations, how to test it, how to reproduce it.
3. **Code traces to requirements.** A module that implements a requirement says so in a header comment,
   for example `// Implements FR-1.5; see ADR-0004`. Commits cite the requirement IDs (`FR-x.y`, `NFR-x.y`)
   and ADRs they serve, and the ticket path.
4. **New terms** go in `CONTEXT.md` with a plain-English definition. There is no second glossary.
5. **Data** (datasets, reference layers, exports) gets a provenance record in `docs/data/` from
   `docs/templates/provenance.md`: source, licence, date, processing, limitations.
6. **Performance claims** need a dated benchmark in `docs/benchmarks/` stating the method and the hardware.
   Method files (for example `docs/benchmarks/map-migration-method.md`) are versioned; result files cite
   the method version.
7. **`CHANGELOG.md`** (Keep a Changelog format) records every user-visible or architectural change.
8. **New dependencies** get a row in `docs/tools/inventory.md`: version, purpose, licence, why chosen,
   alternatives considered. External services go there too, with their terms of use.
9. **Writing style:** plain English; define a term on first use; precise dates and versions; record what
   was *not* chosen and why; write "Unknown — to be confirmed by <role>" rather than guess.

## Definition of done

A pull request that changes behaviour without a documentation change is incomplete. The checklist and PR
template are in `docs/templates/pull-request.md`. Every PR states what, if anything, newly leaves the
browser, with evidence (see the analytics epic guide, `docs/epics/analytics-platform.md`).
