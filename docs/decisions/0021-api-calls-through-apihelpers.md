# ADR-0021 — Route every API call through `apiHelpers`

Date: 2026-09-16. Status: accepted. Accepted by George (GeorgeAgyenim), product owner, 2026-09-16.
Formerly `docs/adr/0003`; moved to `docs/decisions/` as ADR-0021 on 16 September 2026. Body unchanged.

## Context

The app can be deployed under a URL subdirectory (`SUBDIRECTORY`, e.g.
`/colouringghana`). The reverse proxy strips the prefix before requests reach express,
so server routes stay unprefixed, but every URL the browser builds must carry it. The
deployment commit added the prefix to `apiGet`/`apiPost`/`apiDelete` in
`src/frontend/apiHelpers.ts`, tile URLs and font URLs, but three raw `fetch()` calls
(leaderboard, password reset, forgotten password) were missed and 404 under a
subdirectory deployment. The extracts router was also changed to include the prefix
server-side, which produced an unmatchable `//:extract_id` route.

## Decision

- Browser code never calls `fetch()` on an `/api/...` path directly. It uses `apiGet`,
  `apiPost`, `apiPut` (added in this change) or `apiDelete`, which are the single place
  the prefix is applied.
- Server routes are never prefixed. The proxy owns the subdirectory.

## Consequences

- One place to change if the prefix mechanism changes.
- Reviewers can grep for `fetch(` under `src/frontend` and expect only `apiHelpers.ts`.
- The helpers assume JSON responses; a future non-JSON endpoint needs a new helper,
  not a raw `fetch`.

## Rejected

- **Prefix routes on the server as well.** Double-prefixing breaks path matching (as
  the extracts route showed) and couples app code to proxy configuration.
- **A global `fetch` wrapper.** Hides the behaviour from readers; an explicit helper
  import is clearer and already the codebase convention.
