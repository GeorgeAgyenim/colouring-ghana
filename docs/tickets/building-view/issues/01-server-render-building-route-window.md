# Building routes answer 500 because data containers read `window` during server render

Status: spec-complete
Type: fix
Blocked by: none
Spec: none (inherited defect; root cause and fix below need no design decision)
Requirements: none directly; touches NFR-1.4 evidence (the benchmark selects a building) and P9

## Parent

No epic. Found on 2026-09-16 while recording the map benchmark
(`docs/tickets/map-migration/issues/09-playwright-path-and-mapnik-baseline.md`); present since the
`colouring-core` fork's initial commit.

## What happens

Every server-rendered building URL (`/view/<category>/<building_id>`, also `/edit/...`) answers HTTP 500.
The server log shows:

```
ReferenceError: window is not defined
    at AgeHistoryView (src/frontend/building/data-containers/age-history.tsx:91)
    at renderToString ...
    at renderHTML (src/frontendRoute.tsx:78)
```

`frontendRoute.tsx` catches the error, drops the preloaded building, sets status 500 and renders again; the
second render succeeds because there is no building to show. The browser receives a 500 page without the
building, hydrates, fetches the building itself and shows it, so visitors see a working page. What is lost:
the status code (monitoring, crawlers and any HTTP-level check see failures), the server-rendered building
content (first paint without JavaScript), and one wasted render per building request.

## Root cause

Twelve data containers read the URL's `sc` (sub-category) parameter with `new URLSearchParams(window.location.search)`
inside the render function. `window` does not exist in Node, so any server render that reaches a data
container throws:

`src/frontend/building/data-containers/` `age-history.tsx:91`, `community.tsx:73`, `construction-design.tsx:22`,
`disaster-management.tsx:19`, `energy-performance.tsx:28`, `location.tsx:24`, `planning-conservation.tsx:54`,
`retrofit-condition.tsx:16`, `urban-infrastructure.tsx:28`, `water-green-infrastructure.tsx:22`,
and (found during implementation, same read) `land-use.tsx:25`, `typology-size.tsx:53`.

## Fix

Read the parameter through react-router, which knows the location on both server and client. The hook already
exists: `useQuery()` in `src/frontend/hooks/use-query.ts` (wraps `useLocation().search`). Replace the twelve
`window.location.search` reads with `const { sc } = useQuery();` (or a small `useSubCategory()` helper over it
if the coercion to string is repeated), and delete nothing else. No new dependency, no ADR: the codebase's own
hook is the only sensible option.

## Acceptance criteria

- [x] No data container references `window` during render (`grep -rn "window\." src/frontend/building/data-containers`
      returns nothing that runs at render time).
- [x] `GET /view/age-history/<existing id>` on the dev server answers 200 with the building's data in the
      server-rendered markup; the server log shows no `ReferenceError`.
- [x] A jest test under `@jest-environment node` renders one data container to a string with a `?sc=2` location
      through `StaticRouter` and asserts the matching group is expanded, so the regression cannot return silently.
- [x] `?sc=<n>` still expands the same sub-category group in the browser as before (manual check on one category).
- [x] `CHANGELOG.md` entry under Fixed; feature doc not required (no feature doc covers the building view yet).

## How to reproduce

```bash
cd app && npm start          # with the database variables from README.md
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/view/age-history/95   # expect 500 today
```

## Comments

**2026-09-16 (implementation, `/implement`).** `useSubCategory()` added in `app/src/frontend/hooks/use-sub-category.ts`
over the existing `useQuery()`; it returns `string | null` like `URLSearchParams.get`, so the twelve call-site
expressions are unchanged. Twelve containers, not ten: `land-use.tsx` and `typology-size.tsx` had the same read.
Evidence, all on this machine against the dev server (Node 18; the razzle dev server segfaults under Node 22)
and the local database copy with a read-only role:

- `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/view/age-history/95`: **500 on the parent
  commit, 200 with the fix**; with the fix the markup carries the preloaded building and seven
  `data-entry-group` bodies, whereas the 500 page carries neither.
- Regression test `app/src/frontend/building/data-containers/__tests__/server-render.test.tsx`
  (`@jest-environment node`): renders all twelve containers through `StaticRouter`; `?sc=3` on
  retrofit-condition expands "Retrofit History" and leaves "Condition" collapsed; no `sc` leaves both collapsed.
  Fails on the parent commit with the production `ReferenceError`, passes with the fix. Full suite: 9 suites,
  104 tests, green.
- Browser check (headless Chromium via the pinned Playwright): `/view/retrofit-condition/95?sc=3` expands
  Retrofit History only, `?sc=7` expands Condition only, no `sc` expands nothing. Same behaviour as before.
- `tsc --noEmit` reports the same 34 pre-existing errors before and after; eslint the same 116 pre-existing
  errors and twelve fewer warnings (the double-quoted `"sc"` literals are gone).

Found on the way: the server never preloads a building when the URL carries a query string, because
`parseBuildingURL` anchors its regex at the end of `req.url`; `/view/age-history/95?sc=2` answered 200 with
no building before and after this fix. Recorded as `02-building-preload-drops-query-string.md`. Code review (standards and spec axes) ran the same
day: no missing or wrong behaviour; the test now asserts `collapse` by class token rather than by exact string and
covers a literal `?sc=2` case; the standards reviewer noted the work sits on `feature/09-playwright-baseline`
rather than a `fix/building-view-01-...` branch, left to the maintainer. All acceptance criteria are met; the
ticket can close.
