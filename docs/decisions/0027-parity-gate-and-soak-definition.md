# ADR-0027: The map migration's parity gate and soak period are defined as two staged gates signed off by the product owner

- Status: Accepted
- Date: 2026-09-16
- Deciders: George (GeorgeAgyenim), product owner, Colouring Ghana — accepted 2026-09-16; design dialogue with Claude (Anthropic) as planning aid
- Requirements served: FR-9.1, FR-9.5, NFR-1.4, NFR-1.5
- Related ADRs: ADR-0018 (which this makes concrete; ADR-0018 is accepted and is not edited), ADR-0022, ADR-0026

## Context

FR-9.1 retires Mapnik "after an agreed soak period" and FR-9.5 completes the migration when "a documented
parity checklist passes in production". Neither the PRD nor ADR-0018 says how long the soak is, who runs
the checklist, on what devices, or who decides it has passed. Without those, the flag introduced by FR-9.1
could stay indefinitely, and "parity" would be argued case by case. Most Colouring Ghana visitors are on
Android phones over mobile connections, and the riskiest behaviour is the edit workflow.

## Decision

Two gates, each signed off by the product owner with the date and the checklist version recorded in the
feature doc (`docs/features/map-migration.md`).

**Gate 1 — parity.** Production default stays Leaflet; MapLibre is opt-in via the flag. The parity checklist
is run by the product owner and at least two planners or contributors on their own devices, including at
least one Android phone on a mobile connection. The checklist includes a full edit round-trip (select a
building, edit an attribute, save, confirm the change in the edit history and on the map) and the
geolocation control. Gate 1 passes when every item is ticked and no blocking parity defect is open.

**Gate 2 — soak.** The production default flips to MapLibre with opt-out kept. The NFR-1.4 and NFR-1.5
benchmarks (Mapnik before, MapLibre after) are recorded at the flip. The soak is complete after four weeks
with no blocking parity defect reported; then ticket `docs/tickets/map-migration/issues/01-remove-map-stack-flag.md`
proceeds.

**Parity defect.** *Blocking*: a behaviour is lost or wrong. *Cosmetic*: it looks different. Only a blocking
defect resets the four-week clock; cosmetic defects are logged and either accepted or fixed without a reset.

## Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Single opt-in stage, eight weeks | Default never flips during soak. | Few visitors exercise the new map; thin evidence. |
| Soak ends at the next MMDA training session | Realistic load on a real day. | Date is external and may be months away; the flag would outlive its purpose. |
| No defined soak; retire when it "feels ready" | Do nothing. | Not reproducible; contradicts the research programme's accountability rule. |

## Consequences

- Positive: the flag has a defined end; sign-off is recorded; the phone-first audience is represented in the
  evidence; benchmark evidence is tied to a date.
- Negative: four weeks is a floor, not a ceiling; blocking defects extend it. Recruiting two testers with
  phones is a dependency on people (Unknown — to be confirmed by the product owner who they are).
- Follow-up: the checklist itself is part of the spec; `docs/benchmarks/` gets two dated entries.

## Implementation notes

- Checklist lives in the spec and is copied into the feature doc with tick marks, tester role, device,
  connection type and date per run.
- Defect log: one section in the feature doc with columns date, item, blocking/cosmetic, outcome.

## Plain-English summary

The new map is switched on in two steps. First it is available to anyone who asks for it, and a small group,
including at least one person on an Android phone on mobile data, works through a written list of everything
the old map could do, including editing a building end to end. When every item passes, the new map becomes
the default for everyone, with the old one still available on request. If four weeks go by with nothing
lost or broken, the old map is removed. The product owner signs off each step with a date.

## Correction (appended 2026-09-16; body unchanged)

The Decision section names the flag-removal ticket as
`docs/tickets/map-migration/issues/01-remove-map-stack-flag.md`. `/to-tickets` regenerated the epic's tickets in
dependency order on 2026-09-16, so that ticket is now
`docs/tickets/map-migration/issues/13-remove-map-stack-flag.md`. Nothing else in the decision changes.
