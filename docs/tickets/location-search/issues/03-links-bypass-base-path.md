# Two links ignore the base path

Status: spec-complete
Type: task
Blocked by: none
Feature doc: none; decision record docs/decisions/0003 (local)
Requirements: none recorded on this branch
Branch: `fix/location-search-03-base-path-links` off `feature/location-search`
Source: review of the whole branch for problems, 19 November 2026

## Problem

The site can be served from a sub-path (`SUBDIRECTORY`, for example `/colouringghana` on the partners'
server). Two places still build an address from the site root, so on a sub-path they point outside the site:

- `app/src/frontend/pages/welcome.tsx` line 30: `<a href="/data-extracts.html">`.
- `app/src/frontend/building/data-container.tsx` line 374: the edit form's `action`
  (`/edit/<category>/<building id>`), used when the form is submitted without JavaScript.

Everything else already goes through the router or the helpers in `app/src/frontend/apiHelpers.ts`.

## What to build

- Welcome page: use the router's `Link`, which applies the base path.
- Edit form: prefix the action with `SUBDIRECTORY`, the way
  `app/src/frontend/pages/data-extracts.tsx` builds its download link.

## Acceptance criteria

- [ ] Built with `SUBDIRECTORY=/colouringghana`: both addresses start with `/colouringghana/`.
- [ ] Built with `SUBDIRECTORY` unset: both addresses are unchanged from today.
- [ ] `grep` over `app/src/frontend` finds no other `href`, `src` or `action` starting at the site root.
- [ ] `npm test` and `npm run typecheck` pass.
