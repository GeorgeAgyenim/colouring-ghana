# The server draws the default category whatever the address says

Status: done
Type: task
Blocked by: 14 (it makes building pages draw on the server at all)
Feature doc: none
Requirements: none recorded on this branch
Branch: `fix/location-search-16-server-category-and-mode` off `feature/location-search`
Source: found while building issue 14, 19 November 2026

## Problem

With issue 14 done, the server sends building pages, but it always draws them as the default category
(Age & History) in view mode. `/view/location/1` arrives as Age & History; `/edit/age-history/1` arrives
without "Save edits"; `/view/location/1?sc=1` arrives as Age & History with its first section open. The
browser then switches to the right category and mode once the script has run.

Cause: `useUrlParam` (`app/src/frontend/nav/use-url-param.ts`) sets the mode and category from the address
in an effect, after the first drawing, and the category state in `app/src/frontend/map-app.tsx` follows it
through `useLastNotEmpty`. The server draws once and never runs effects.

So on a slow connection the person first sees the wrong category, search engines and link previews see the
wrong one, and issue 10's protection of the edit form only shows in view mode until the script runs.

Seen in the running app on 19 November 2026 after issue 14 was merged: opening `/view/location/1?sc=1`
logs a React warning, "Can't perform a React state update on an unmounted component … at
EditHistoryLatest": the server-drawn Age & History panel is replaced by Location as soon as the script
runs, while its edit history request is still on its way. Check whether this goes away with the fix; if
not, `EditHistoryLatest` needs to ignore an answer that arrives after it is removed.

## What to build

Read the mode and category from the address while drawing (from the route match), not in an effect, so the
server and the browser's first drawing both use the address. Keep the browser's behaviour after that
unchanged (switching category or mode updates the address as now).

## Acceptance criteria

- [x] Test (server environment, through the real page route): `/view/location/1` draws the Location category;
      `/edit/age-history/1` signed in draws "Save edits"; `/view/location/1?sc=1` opens Location's first section.
- [x] Test: switching category and mode in the browser still changes the address and the view as today.
- [x] In the running app: the page the server sends for `/view/location/1` is the Location category, and
      the browser shows no change of category when the script loads (no hydration warning in the console).
- [x] In the running app: opening `/view/location/1?sc=1` logs no React warning.
- [x] `npm test` and `npm run typecheck` pass.

## Comments

**19 November 2026, closed.** Implemented in the commit that sets this status.

- Change: `useUrlParam` (`app/src/frontend/nav/use-url-param.ts`) reads its value from the address while the
  page is drawn, not in an effect afterwards; `map-app.tsx` drops its own delayed copy of the category. The
  server and the browser's first drawing now both use the category and mode the address names. Switching
  category or mode still changes the address as before.
- Also needed: with the building id known from the start, the browser no longer re-reads the building just
  after a server-drawn page loads. That accidental re-read was what put the signed-in visitor's own answers
  (Community: "Your score") on the page. `frontendRoute.tsx` now places those answers beside the building's
  values, as the browser does when it reads the building from the API, so they are in the page the server sends.
- `EditHistoryLatest` ignores an answer that arrives after it was removed or moved to another building: the
  warning seen in the running app came from the category switching after load, which no longer happens, but
  the same warning could still come from switching category during a request.
- Tests: `src/__tests__/building-page-server-render.test.tsx` (+5, through the real page route: Location drawn
  for `/view/location/1`, its first section open with `?sc=1`, "Save edits" on `/edit/…` signed in, the
  visitor's own score shown) and `frontend/nav/__tests__/category-and-mode-follow-the-address.test.tsx` (7,
  in the browser environment: the server's page hydrated with no console error, switching by link, Edit/View
  and history still work, a late edit history answer gives no warning). They failed before the change.
- Whole suite: 285 tests pass (274 before). `npm run typecheck` passes. No new lint errors.
- Running app (development server, Chrome on Linux): `/view/location/1?sc=1` sent as Location with
  "Individual Building/Property Address" open, stayed Location after the script loaded, no warning in the
  console; clicking Age & History switched category with no warning. "Save edits" when signed in is shown by
  test only (the development database account cannot hold a session).
