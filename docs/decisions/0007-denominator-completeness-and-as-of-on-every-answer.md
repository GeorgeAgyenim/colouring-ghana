# ADR-0007: Every answer carries its denominator, its completeness, and the time it is 'as of'

- Status: Accepted
- Date: 15–16 September 2026
- Deciders: product owner (Colouring Ghana); design dialogue with Claude (Anthropic) as planning aid
- Requirements served: FR-5.5, FR-8.2, FR-10.6
- Plain-English record: docs/Design-Decisions-Plain-English.md — D8

### Context

Colouring Ghana's data is crowdsourced, so many attributes are blank for many buildings. 'No recorded connection to piped water' means the field is empty — not that the building has no water. Reporting '1,900 buildings in poor condition' without saying 'out of 6,200 whose condition is recorded, among 41,000 in the zone' would mislead an official.

The 'as of' time is the moment the snapshot was taken. The product owner asked for feedback of the form 'as of [date, time], [answer]'. It is central for offline users, whose data may be days or weeks old.

### Decision

No count, share, map or download is shown without stating how many buildings it was drawn from, how many of those actually have the relevant attribute recorded, and the date and time of the data snapshot.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Show only the headline number | Present the count and nothing else. | Misleading with incomplete data; unacceptable for public decision-making. |
| Put completeness in a footnote or tooltip | Available, but hidden by default. | Hidden caveats are ignored; the second number is part of the answer, not a caveat. |

### Rationale

- Honesty about data quality is what makes crowdsourced data usable by government.
- The timestamp makes every result reproducible and every offline pack self-describing.

### Consequences

- None recorded beyond the requirements served.

### Plain-English summary

No count, share, map or download is shown without stating how many buildings it was drawn from, how many of those actually have the relevant attribute recorded, and the date and time of the data snapshot.
