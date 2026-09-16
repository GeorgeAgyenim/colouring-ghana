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

Ten data containers read the URL's `sc` (sub-category) parameter with `new URLSearchParams(window.location.search)`
inside the render function. `window` does not exist in Node, so any server render that reaches a data
container throws:

`src/frontend/building/data-containers/` `age-history.tsx:91`, `community.tsx:73`, `construction-design.tsx:22`,
`disaster-management.tsx:19`, `energy-performance.tsx:28`, `location.tsx:24`, `planning-conservation.tsx:54`,
`retrofit-condition.tsx:16`, `urban-infrastructure.tsx:28`, `water-green-infrastructure.tsx:22`.

## Fix

Read the parameter through react-router, which knows the location on both server and client. The hook already
exists: `useQuery()` in `src/frontend/hooks/use-query.ts` (wraps `useLocation().search`). Replace the ten
`window.location.search` reads with `const { sc } = useQuery();` (or a small `useSubCategory()` helper over it
if the coercion to string is repeated), and delete nothing else. No new dependency, no ADR: the codebase's own
hook is the only sensible option.

## Acceptance criteria

- [ ] No data container references `window` during render (`grep -rn "window\." src/frontend/building/data-containers`
      returns nothing that runs at render time).
- [ ] `GET /view/age-history/<existing id>` on the dev server answers 200 with the building's data in the
      server-rendered markup; the server log shows no `ReferenceError`.
- [ ] A jest test under `@jest-environment node` renders one data container to a string with a `?sc=2` location
      through `StaticRouter` and asserts the matching group is expanded, so the regression cannot return silently.
- [ ] `?sc=<n>` still expands the same sub-category group in the browser as before (manual check on one category).
- [ ] `CHANGELOG.md` entry under Fixed; feature doc not required (no feature doc covers the building view yet).

## How to reproduce

```bash
cd app && npm start          # with the database variables from README.md
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/view/age-history/95   # expect 500 today
```
