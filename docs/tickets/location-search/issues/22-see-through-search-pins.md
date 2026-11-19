# Search pins have a see-through centre

Status: done
Type: task
Blocked by: none
Feature doc: `docs/location-search.md` (Search flow)
Requirements: none recorded on this branch
Branch: `fix/location-search-22-see-through-search-pins` off `feature/location-search`
Source: product owner, 19 November 2026: "use an svg with a transparent background for the teardrop search
locations icons", with a design set of teardrop pins in several colours, each in a desktop and a mobile size

## Problem

The search result pin was a filled teardrop with a white dot in its centre. It covered the map at the very
place the person searched for.

## What to build

Draw the pins from the new design: a teardrop whose centre is a hole, with a white outline and nothing
drawn behind it, so the map shows through.

- Results: orange (`pin-orange-*`). The hovered result: red (`pin-red-*`). Orange and red stay apart from
  the blue location dot. The set's blue "active" pin (`#1666C5`) was not used: it is almost the location
  dot's colour (`#1a6de0`).
- Size: the desktop size (32 × 51 px) with a mouse; the mobile size (40 × 64 px) on touch screens
  (`(pointer: coarse)`). The hovered pin uses the larger size so it still pops out; the design set has no
  separate hover size.
- The tip of the teardrop sits on the place.
- The four designs used are kept in `docs/images/search-pins/` as the source of the drawing.

## Acceptance criteria

- [x] Test: the pin has no box or white fill behind it, and its body has a hole.
- [x] Test: with a mouse the pin is 32 × 51 px, outline 3, tip on the place.
- [x] Test: on a touch screen the pin is 40 × 64 px, outline 4, tip on the place.
- [x] Test: the hovered pin grows and turns red.
- [x] Seen in the app: pins over Ghana show the map through their centres; hovering a result grows it.
- [x] `npm test` and typecheck pass.

## Comments

**19 November 2026, closed.** Implemented in the commit that sets this status.
