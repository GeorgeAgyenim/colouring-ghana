# Style config: one definition generates the MapLibre expression and the legend

Status: spec-complete
Type: task
Blocked by: none
Spec: docs/tickets/map-migration/PRD.md (decisions 6, 16; seam 1)
Requirements: FR-9.2, FR-9.5, P8; ADRs: ADR-0023

## Parent

Map migration epic (FR-9; ADR-0009, ADR-0018). Spec: `docs/tickets/map-migration/PRD.md`.

## What to build

A visitor sees exactly the same legend as today, but the colours now come from one place. Each active category
map definition (39 today) gains the attribute it colours and its value-to-colour mapping or numeric bands. One
function turns a definition into legend entries and a MapLibre `match` or `step` expression; the legend renders
from the generated entries, so the Leaflet map is unaffected and the MapLibre map (ticket 05) can consume the
expressions. A second function derives the full list of attributes any active definition reads, which the export
job (ticket 02) uses as the archive's property list and the export checker asserts against.

This is the prefactor the rest of the epic stands on: the style config becomes the single source of colouring
names, attributes and colours.

Also creates, if absent, `docs/features/map-migration.md` from the feature template and `CHANGELOG.md` at the
repository root (documentation rule 7; the file does not exist yet).

## Acceptance criteria

- [ ] Every active category map definition carries its attribute and mapping; the three base themes (`light`,
      `night`, `night_outlines`) are generated variants of one base definition.
- [ ] jest (node environment, pure function): for every active definition, every legend colour appears in the
      generated expression and every expression colour appears in the legend; the derived attribute list equals
      the set of attributes the definitions read plus nothing else.
- [ ] The legend renders identically to before (same titles, descriptions, disclaimers, element order and colours)
      on the Leaflet map; `npm test`, `npm run lint` and `npm run build` pass.
- [ ] Module header cites FR-9.2, FR-9.5 and ADR-0023.
- [ ] Feature doc and `CHANGELOG.md` exist and record this change; `CONTEXT.md` needs no new term (style config is
      already defined).

## Blocked by

- None (can start immediately).
