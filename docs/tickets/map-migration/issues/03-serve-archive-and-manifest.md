# Serve the archive and manifest statically with range requests and immutable caching

Status: spec-complete
Type: task
Blocked by: 02
Spec: docs/tickets/map-migration/PRD.md (decisions 13, 14, 30)
Requirements: FR-9.2, NFR-4.1, FR-14.11.c; ADRs: ADR-0009, ADR-0024

## Parent

Map migration epic (FR-9; ADR-0009, ADR-0018). Spec: `docs/tickets/map-migration/PRD.md`.

## What to build

A browser can fetch the manifest at a fixed URL and range-read the archive it lists, from the existing Express
server, with no CDN and no new process. The artefact directory comes from one environment variable documented
beside the tile-cache settings it will eventually replace. The manifest is served with `no-cache` and an ETag so
clients always revalidate; the archive's URL contains its "as of" and is served with a long `Cache-Control`. Both
live under a dedicated static URL prefix, distinct from `/tiles/`, that honours the subdirectory deployment prefix.

## Acceptance criteria

- [ ] `curl` with a `Range` header against the archive returns 206 with the requested bytes and an ETag; the
      manifest returns 200 with `Cache-Control: no-cache` and an ETag, and 304 on a matching `If-None-Match`.
- [ ] The archive response carries a long `Cache-Control` max-age (value recorded in the feature doc).
- [ ] Works under a `SUBDIRECTORY` deployment (URL built through the same prefix mechanism as other static assets).
- [ ] The environment variable is documented in the pm2 ecosystem templates and the feature doc.
- [ ] Feature doc privacy section records the notice item for M5: after the migration the site host sees archive
      range requests (tile-level location exposure moves from the tile server to the archive host).
- [ ] `CHANGELOG.md` updated; commits cite FR-9.2, NFR-4.1.

## Blocked by

- `docs/tickets/map-migration/issues/02-nightly-export-job-and-manifest.md` (manifest format and archive naming).
