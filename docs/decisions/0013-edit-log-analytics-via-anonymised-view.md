# ADR-0013: Questions about recent edits are answered only from an anonymised summary of the edit log

- Status: Accepted
- Date: 16 September 2026
- Deciders: product owner (Colouring Ghana); design dialogue with Claude (Anthropic) as planning aid
- Requirements served: FR-13, NFR-3.4, NFR-3.5
- Plain-English record: docs/Design-Decisions-Plain-English.md — D17

### Context

The 'edit log' is the platform's history of contributions. An 'anonymised view' is a derived table with all identifying information removed before anyone can query it.

This is what allows a resident to ask 'how many buildings on my street were edited in the last six months' without anyone being able to learn who edited them.

### Decision

The platform's record of who changed what is never exposed for analysis. Instead, the export process reads a summary view that contains, per building and attribute and time period, only counts of additions and edits and the time of the last edit — no contributor names or identifiers. Database permissions enforce that the export can read nothing else.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Expose the raw edit log | Let queries read the full history. | Reveals contributor identities and behaviour; unacceptable. |
| Do not support edit-recency questions | Drop the resident's question. | It is one of the five acceptance questions and a useful measure of platform activity. |

### Rationale

- Contributor privacy is a hard line; a technically enforced view is stronger than a policy.

### Consequences

- None recorded beyond the requirements served.

### Plain-English summary

The platform's record of who changed what is never exposed for analysis. Instead, the export process reads a summary view that contains, per building and attribute and time period, only counts of additions and edits and the time of the last edit — no contributor names or identifiers. Database permissions enforce that the export can read nothing else.
