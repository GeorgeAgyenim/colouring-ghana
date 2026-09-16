# Select a building with a local hit-test, highlight via feature-state, multi-edit

Status: spec-complete
Type: task
Blocked by: 05
Spec: docs/tickets/map-migration/PRD.md (decisions 7, 21 to 24, 29)
Requirements: FR-9.5, FR-14.11.b (spirit), NFR-3.4; ADRs: ADR-0022, ADR-0026

## Parent

Map migration epic (FR-9; ADR-0009, ADR-0018). Spec: `docs/tickets/map-migration/PRD.md`.

## What to build

On the MapLibre stack a visitor clicks a building and it is selected and highlighted at once, with no request to
the server locate endpoint: the map hit-tests the rendered building layers at the click point, reports the
`building_id`, and the app shell loads the building record through the existing building-by-id API (as when a
building URL is opened directly), then selects or toggles as today. The highlight is a `selected` feature-state on
that id, styled by a highlight layer over the colouring. In multi-edit mode the same hit-test feeds the pending
edit to each clicked building. The map's callback contract changes from a building record to a building id; the
Leaflet map adapts to the same contract by resolving the id from its existing locate call, so both stacks share
the shell code.

Documented expected difference: with "Editable Buildings" off, a click selects nothing on MapLibre (the layers are
not rendered). This is listed in the parity checklist as expected, not as a defect.

## Acceptance criteria

- [ ] View mode: click selects and highlights; click again deselects; the sidebar shows the building; no request
      to the locate endpoint on the MapLibre stack (network capture).
- [ ] Edit mode: selection and highlight work; the sidebar loads the building for editing.
- [ ] Multi-edit: clicking buildings applies the pending edit to each, exactly as on Leaflet.
- [ ] Highlight follows the selection across zoom levels and category switches without a tile fetch.
- [ ] Leaflet stack still selects as before through the shared id-based contract.
- [ ] Click coordinates no longer leave the browser on the MapLibre stack; feature doc privacy section updated.
- [ ] Module headers cite FR-9.5; `CHANGELOG.md` updated; `CONTEXT.md` already defines hit-test and feature state.

## Blocked by

- `docs/tickets/map-migration/issues/05-buildings-from-the-archive.md`.
