# Server skips the building preload when the URL carries a query string

Status: spec-complete
Type: fix
Blocked by: none
Spec: none (inherited defect; root cause and fix below need no design decision)
Requirements: none directly; same surface as ticket 01 (server-rendered building pages)

## Parent

No epic. Found on 2026-09-16 while verifying
`docs/tickets/building-view/issues/01-server-render-building-route-window.md`; present since the
`colouring-core` fork's initial commit.

## What happens

`GET /view/age-history/95?sc=2` answers 200, but the server-rendered markup has no building and the preloaded
state carries `"building":undefined`. The same URL without `?sc=2` preloads the building. The browser
hydrates, fetches the building itself and shows it, so visitors see a working page; what is lost is the
server-rendered building content for every sub-category link (`?sc=<n>`), which is exactly the URL shape the
data containers were built to honour on first paint.

## Root cause

`parseBuildingURL` in `app/src/parse.ts` matches `/\/(\d+)(\/history)?$/` against `req.url`, which includes
the query string, so the `$` anchor fails whenever a query string follows the id and the route treats the
request as not being a building URL (`isBuilding` false in `app/src/frontendRoute.tsx`).

## Fix

Match the path without the query string: either strip everything from `?` before matching, or use `req.path`
in `frontendRoute.tsx` (Express exposes it) and keep `parseBuildingURL` unchanged. Prefer the first so the
parser is correct on its own and `parseCategoryURL` benefits too. Add a unit test for `parseBuildingURL` with
`?sc=2`, `/history?x=1` and no query.

## Acceptance criteria

- [x] `parseBuildingURL('/view/age-history/95?sc=2')` returns 95; `/view/age-history/95/history?sc=2` returns 95.
- [x] `GET /view/age-history/<existing id>?sc=2` on the dev server carries the preloaded building and the
      rendered groups, with the `sc` group expanded (ticket 01's test covers the expansion once the building
      is present).
- [x] `CHANGELOG.md` entry under Fixed.

## How to reproduce

```bash
cd app && npm start          # with the database variables from README.md
curl -s http://localhost:3000/view/age-history/95?sc=2 | grep -o '"building":[^,]*'   # "building":undefined today
```
