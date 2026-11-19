# Two links ignore the base path

Status: done
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

- [x] Built with `SUBDIRECTORY=/colouringghana`: both addresses start with `/colouringghana/`.
- [x] Built with `SUBDIRECTORY` unset: both addresses are unchanged from today.
- [x] `grep` over `app/src/frontend` finds no other `href`, `src` or `action` starting at the site root.
- [x] `npm test` and `npm run typecheck` pass.

## Comments

**19 November 2026, closed.** Implemented in the commit that sets this status.

- Correction to the problem statement: "Everything else already goes through the router" was not true. The
  search in the third acceptance criterion found four more links that started at the site root, all from
  one building category to another: `community.tsx` ("here", to Planning Controls), `typology-size.tsx`
  ("Age & History") and `construction-design.tsx` ("Age & History", twice). They are fixed here as well, so
  six addresses changed, not two.
- Change: the welcome page link and the four category links use the router's `Link`. The edit form's
  `action` is prefixed with `SUBDIRECTORY`, as `data-extracts.tsx` does.
- One change in behaviour: the four category links used to reload the whole page; they now move within the
  app, like the category tiles do. Checked in the running app (Chrome on Linux, site at the root): the link
  from Construction & Design opens Age & History with its `?sc=3` part kept and the matching section open;
  the welcome page link opens the data extracts page. No console errors.
- Tests: 6 tests in `pages/__tests__/welcome.test.tsx`, `building/__tests__/data-container.test.tsx` and
  `building/data-containers/__tests__/cross-category-links.test.tsx`. The three sub-path tests failed
  against the old code (addresses without `/colouringghana`); the three root tests guard "unchanged".
- Built with `SUBDIRECTORY=/colouringghana`: the bundle has the form action as `"/colouringghana"` followed
  by `/edit/<category>/<id>`, and both routers have `basename:"/colouringghana"`, which is what puts the
  prefix on every `Link`. Built with it unset: `colouringghana` appears nowhere in the bundle and the
  addresses are as before.
- Search over `app/src/frontend` for `href`, `src` or `action` starting at the site root: nothing left.
- Whole suite: 66 tests pass (60 before). `npm run typecheck` passes. No new lint errors.
- Not checked: the site actually served from `/colouringghana` behind the partners' proxy.
- Found, not changed (outside this ticket):
  - The edit form's address is only used without JavaScript, and the server has no route that saves such a
    submission; it just shows the page again. The address is now correct, but that path still saves nothing.
  - Images written as `images/...` (welcome, contact, supporter logos) and the icon and manifest links in
    `frontendRoute.tsx` are relative to the current page, so they depend on the page's address.
  - The script and stylesheet addresses in the page start at `/static/`. Whether that works on a sub-path
    depends on how the site is built and proxied there; not checked.
  - `privacy-policy.tsx` has an email link without `mailto:`.
