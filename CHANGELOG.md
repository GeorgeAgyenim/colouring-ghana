# Changelog

All notable changes to Colouring Ghana are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions are dated because the platform is deployed
continuously rather than released. Entries cite the requirement IDs, ADRs and tickets they serve
(`docs/DOCUMENTATION.md`, rule 7).

## [Unreleased]

### Added

- Playwright benchmark harness for the map migration: shared path file (`app/e2e/map-path.json`), the
  benchmark script following method v1 (`docs/benchmarks/map-migration-method.md`), and the renderer for the
  dated result files, plus a stand-in map page for checking the harness without a database. Runs on demand
  with `npm run benchmark:map` in `app/`; not part of `npm test`. The Mapnik
  "before" runs are recorded by the product owner (NFR-1.4, NFR-1.5; ADR-0027;
  `docs/tickets/map-migration/issues/09-playwright-path-and-mapnik-baseline.md`).
- `@playwright/test` 1.63.0 pinned as a development dependency (`docs/tools/inventory.md`).
- Mapnik "before" benchmark recorded on 2026-09-16 for runs A, B and C (`docs/benchmarks/2026-09-16-map-before.md`),
  setting the NFR-1.4 and bytes targets for the migration (NFR-1.4, NFR-1.5; ADR-0027).
- README: how to run the app locally (standard PostgreSQL variables, Node 18, tile cache path).
- Feature document `docs/features/map-migration.md` (FR-9).
