# Map layer buttons are hidden on phones

Status: spec-complete
Type: task
Blocked by: none (issue 12's failure message is placed with these buttons in mind; re-check it)
Feature doc: docs/location-search.md
Requirements: none recorded on this branch
Branch: `fix/location-search-19-layer-buttons-on-phones` off `feature/location-search`
Source: found while building issue 12; product owner's request, 19 November 2026

## Problem

`app/src/frontend/map/map-button.css` hides every `.map-button` below 990px wide (`visibility: hidden`). On a
phone, which is how most contributors stand at a building, there is no way to switch the light or dark map,
open the layer options, or turn Regions, Districts or the editable-buildings layer on or off. The buttons are
also up to 350px wide (the theme button has `min-width: 340px`), which would cover most of a phone's map if
simply shown.

## What to build

On narrow screens the map controls are usable and leave the map visible:

- One small button, by the other map controls, that opens and closes the layer options (the current
  "Show layer options" button, made compact on narrow screens).
- When open, the options (light/dark map, Regions, Districts, Editable Buildings) appear as a compact list
  that fits a 320px-wide screen without covering the search box, the zoom and locate buttons, or the
  side-panel tab, and can be closed again. Each option shows whether it is on.
- Buttons are large enough to tap (at least 44×44 CSS pixels), reachable with the keyboard, and say what they
  do to a screen reader, including whether a layer is on.
- From 990px wide, the layout is as it is today.
- Issue 12's "Could not load …" message still fits beside them.

Judge it by the task: a person at a building, on a phone, wants to see which district they are in.

## Acceptance criteria

- [ ] Test: below 990px the layer options button is shown and opens a list with the theme, Regions,
      Districts and Editable Buildings controls; each control switches its layer as on desktop.
- [ ] In the running app at 360px and 320px wide, light and dark themes: open the options, switch Districts on
      and see district boundaries, close the options; nothing overlaps the search box, zoom/locate buttons or
      side-panel tab. At 1280px the layout is unchanged.
- [ ] `npm test` and `npm run typecheck` pass.
