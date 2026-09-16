# ADR-0020 — Shim `node:process` for jest 26 instead of upgrading jest

Date: 2026-09-16. Status: accepted.
Formerly `docs/adr/0002`; moved to `docs/decisions/` as ADR-0020 on 16 September 2026. Body unchanged.

## Context

The deployment commit bumped `pg-promise` from 10 to 11, which brings `pg` 8.17.
`pg-connection-string` in that tree does `require('node:process')`. The test runner is
jest 26.6, bundled with razzle 4, and jest 26 does not understand the `node:` URL
scheme (support arrived in jest 27). Result: `editHistory.test.ts` failed to run with
`TextEncoder is not defined` under jsdom and `ENOENT: open 'node:process'` under the
node environment. The test itself never touches a database; the driver is loaded
because the manual mock uses `jest.genMockFromModule`, which requires the real module.

A generic `moduleNameMapper` of `^node:(.*)$` → `$1` does not work: jest 26 treats the
mapped name as a file path and tries to read a file called `process`.

## Decision

Add `app/jest/node-process-shim.js` containing `module.exports = process;` and map
exactly `^node:process$` to it in the `jest.moduleNameMapper` block of `package.json`
(one of the keys razzle passes through). API tests carry a
`/** @jest-environment node */` docblock so server code stops running under jsdom.

`node:process` is the only `node:` specifier in the pg tree today. If another appears,
add a sibling shim (`module.exports = require('events');` etc.) and a second mapping.

## Consequences

- Tests run again with no dependency changes. 55 tests pass.
- The shim is a known workaround with a clear removal trigger: delete `app/jest/` and
  the mapping when jest is upgraded to ≥27 (which means upgrading razzle or leaving it).
- `@jest-environment node` on API tests is correct regardless of the shim; server-side
  tests should never have run under jsdom.

## Rejected

- **Upgrade jest to 27+.** razzle 4 pins jest 26 and ts-jest 26; upgrading means
  either replacing razzle's test command or a razzle major upgrade. Far larger than
  a failing-test fix and unrelated to the branch.
- **Roll pg-promise back to 10.** The bump was made for the production server; the
  test runner should not dictate the production driver version.
- **Hand-write the `editHistory` mock without `genMockFromModule`.** Fixes one test
  but leaves every future API test that touches `db.ts` to hit the same wall.
