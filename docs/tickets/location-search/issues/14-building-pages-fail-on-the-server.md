# Building pages fail on the server when visited directly

Status: spec-complete
Type: task
Blocked by: 10 (both change the twelve category views under `app/src/frontend/building/data-containers/`)
Feature doc: none
Requirements: none recorded on this branch
Branch: `fix/location-search-14-building-page-server-render` off `feature/location-search`
Source: found while building issues 10 and 11, 19 November 2026; the same fault was fixed on 16 September 2026 on branches that never reached this line (`fix/building-view-01-server-render-building-route-window` 05bf907b, `fix/building-view-02-preload-query-string` 584eaacd)

## Problem

Opening a building's address directly (a shared link, a bookmark, a reload), for example
`/view/age-history/1`, gets HTTP 500 from the server. The twelve category views read the `sc` part of the
address from `window.location` while the page is built, and `window` does not exist on the server
(`ReferenceError: window is not defined`). The server then sends the page without the building; the browser
fetches it afterwards, so the page still appears, but:

- search engines, link previews and monitoring see an error;
- on a slow connection the person sees no building until the script has loaded;
- the edit form is never in the page the server sends, so issue 10's protection of that form only applies
  once this is fixed.

A second fault sits behind it: `parseBuildingURL` in `app/src/parse.ts` matches the building id against the
whole address including `?sc=…`, so any address with a sub-section gets no building from the server.

## What to build

Bring the two September fixes onto this line, adapted to the code as it is now:

- A small hook, `useSubCategory()` in `app/src/frontend/hooks/use-sub-category.ts`, that reads `sc` through
  the router (`useQuery`), so it works on the server and in the browser. The twelve views call it instead of
  `window.location`.
- `parseBuildingURL` ignores the query part when it reads the building id.
- Their tests: every category view renders on the server, with `?sc=` opening the matching section; the
  address parser handles a query part.

Do not bring over the September `CHANGELOG.md` edits: this line has no changelog.

## Acceptance criteria

- [ ] Test (server environment): each of the twelve views renders without error; `?sc=2` opens only the
      matching section; no `sc` leaves all sections closed.
- [ ] Test: `parseBuildingURL` returns the building id for `/view/age-history/1`, `/view/age-history/1?sc=2`
      and `/view/age-history/1/history`.
- [ ] In the running app: `GET /view/age-history/1` and `GET /view/age-history/1?sc=2` answer 200 and the page
      the server sends contains the building's data and the edit form; the `?sc=` links between categories
      still open the right section.
- [ ] `grep` over `app/src/frontend` finds no `window.` read during rendering in the category views.
- [ ] `npm test` and `npm run typecheck` pass.
