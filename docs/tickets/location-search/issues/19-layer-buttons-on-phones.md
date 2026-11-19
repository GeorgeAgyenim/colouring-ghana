# Map layer buttons are hidden on phones

Status: done
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

- [x] Test: below 990px the layer options button is shown and opens a list with the theme, Regions,
      Districts and Editable Buildings controls; each control switches its layer as on desktop.
- [x] In the running app at 360px and 320px wide, light and dark themes: open the options, switch Districts on
      and see district boundaries, close the options; nothing overlaps the search box, zoom/locate buttons or
      side-panel tab. At 1280px the layout is unchanged.
- [x] `npm test` and `npm run typecheck` pass.

## Comments

**19 November 2026, closed.** Implemented in the commit that sets this status.

- Why they were hidden: an upstream change in 2019 ("Hide or shrink theme switch button on mobile") hid the
  buttons because they covered the map; nobody chose to remove layers from phones.
- Below 990px: one 44×44 layers button sits under the zoom and locate buttons, right-aligned. It opens a
  list with the light/dark map, Regions, Districts and Editable Buildings, each at least 44px tall and only
  as wide as its words. The button has an accessible name ("Show map layers" / "Hide map layers"),
  `aria-expanded` and `aria-controls`; each switch says "on" or "off" in its own words. From 990px the
  layout is as before. Server and browser draw the same page; nothing reads the window width.
- Tests: `map/__tests__/map-layer-options.test.tsx` (7, including a guard that the CSS no longer hides the
  buttons on narrow screens). They failed before. Issue 12's 14 tests pass unchanged.
- Whole suite: 292 tests pass (285 before). `npm run typecheck` passes. No new lint errors.
- Running app (Chrome on Linux, the page in a 360px and a 320px frame, dark and light themes): closed, only
  the layers button shows, under zoom and locate; open, the four switches show; switching Districts on drew
  all 261 districts; no sideways scrolling at 320px. At 1536px: "Switch to light mode" and "Show layer
  options" as before.
- Limits: if Regions and Districts both fail to download (issue 12) while the list is open, the list covers
  part of the second message until it is closed. Not checked on a real phone.
- Feature doc: `docs/location-search.md`, "Map layer controls on phones".
