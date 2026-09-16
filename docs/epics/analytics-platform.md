# Epic guide — Analytical platform

Read this when a ticket belongs to the analytics platform or the map migration. It adds to `CLAUDE.md`; it does not replace it.

## Documents

- Requirements: `docs/PRD-colouring-ghana-analytics.md` (FR/NFR identifiers; Section 5 principles; Section 13 milestones)
- Plain-English decision record: `docs/Design-Decisions-Plain-English.md` (D1–D28; the `.docx` is a generated export — never edit it, regenerate at milestones)
- ADRs: `docs/decisions/0001…0018` (new ones from 0019)
- Terminology: `CONTEXT.md`

## Non-negotiable principles (PRD §5)

- **P1** Uploaded layers never leave the browser. No endpoint may receive uploaded rows or geometry. Only an extent may leave, with disclosure.
- **P2** One execution engine, in the browser (DuckDB-WASM). The server delivers snapshots, tiles and reference layers; it never runs user queries.
- **P3** One plan format. Builder, SQL editor and assistant all produce plans; there is one compiler and one validator. Never add a second path from question to execution.
- **P4** Every output carries a denominator and completeness counts.
- **P5** Every output carries the snapshot "as of" timestamp.
- **P6** The assistant emits plans or clarifications only, and declines what the engine cannot do. Never give it capabilities beyond emitting plans, explaining aggregates, charting and refusing.
- **P7** Offline is first-class: builder, SQL editor, outputs and packs work without a connection.
- **P8** Ghana first, contribute to core later: keep portable code (plan format, engine, snapshot exporter, packs, map) separate from Ghana-specific content (layers, definitions, prompts, notices).

## Branches and gates (ADR-018)

- Two epics, two tracking issues, two integration branches, same base. Names follow `CONTRIBUTING.md`'s `feature/description` form:
  - `feature/maplibre-migration` — FR-9. Merges to `master` **first**, behind a feature flag; Mapnik retained until parity (FR-9.5) passes in production.
  - `feature/analytics-platform` — everything else.
- Do not start tickets gated by **FR-9.6** (result view, client-side result rendering, building popup in result view, draw tool, PMTiles in packs) until the migration has merged. After it merges, rebase the analytics branch onto `master` before continuing.
- Specs are written **per feature group** with `/to-spec` (FR-1, FR-4, FR-7, FR-8, FR-9, FR-10, FR-13, FR-14…), each citing its FR IDs and ADRs.

## Extra documentation for this epic

- **Assistant:** prompts are versioned files in `docs/assistant/prompts/`, never inlined in code. Every model or prompt change runs the evaluation set and records a dated result in `docs/assistant/evaluations/` (`docs/templates/evaluation-run.md`), including refusal and clarification cases. `docs/assistant/model-card.md` records model, hosting, hardware, structured-output method and alternatives.
- **Formats:** plan, snapshot, pack and anonymised-activity-view formats are versioned specs in `docs/specs/`; changing one is an ADR.
- **Golden results:** the five canonical questions (PRD §4.2) have golden outputs stored with the snapshot timestamp they were computed from, in `tests/golden/<snapshot-timestamp>/`.
- **Privacy check in every PR:** state what, if anything, newly leaves the browser, with evidence (network-capture test for uploaded layers).

## Known data-flow baselines

- Geolocation control (`src/frontend/map/geolocation-control.tsx`): fix never leaves the device (audit 2026-09-16, PRD FR-14.11). Any network or storage write added to it requires a new ADR. Named-area resolution of "My location" must not recentre the map; result-view clicks resolve locally, not via `/api/buildings/locate`.
- Edit log: analytics read only the anonymised activity view (FR-13); the export role has no access to contributor identities.
