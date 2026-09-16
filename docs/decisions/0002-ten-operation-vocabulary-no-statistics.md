# ADR-0002: A fixed list of ten operations; statistics are out of scope; the assistant says so honestly

- Status: Accepted
- Date: 15–16 September 2026
- Deciders: product owner (Colouring Ghana); design dialogue with Claude (Anthropic) as planning aid
- Requirements served: FR-1.2, FR-4.6
- Plain-English record: docs/Design-Decisions-Plain-English.md — D3

### Context

An 'operation' is one step in answering a question. 'Buffer' means drawing a zone of a chosen distance around something (for example, everything within 500 metres of a market site). 'Relate to another layer' means asking which buildings fall inside, touch, or are nearest to some other shapes (a flood zone, a road). 'Group and count' means totting up buildings by area or by attribute. 'Completeness' means reporting how many buildings actually have a value recorded for an attribute, as opposed to a blank.

'Regression' and 'significance' are statistical methods that estimate whether one thing is related to another beyond what chance would produce. They need expert interpretation, and an AI system producing them confidently is the most likely way to publish a wrong result.

'Honestly' means the assistant will not improvise. It will not pretend to compute a statistic it cannot, and it will not quietly substitute a simpler calculation without saying so.

### Decision

The platform supports exactly ten kinds of operation (choose an area; filter by attribute; draw a buffer; relate buildings to another layer; group and count; compare two groups; rank; filter by recent edits; report completeness; produce outputs). Statistical modelling — regression, tests of significance, measures of spatial clustering — is not supported in Version 1. When asked for it, the assistant must say plainly that it cannot, and offer the clean dataset the person would need to do it elsewhere.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Build a statistics engine | Run a Python or R service on the server that computes regressions and spatial statistics on demand. | Another service to run; does not work offline; and the responsible interpretation of statistical output cannot be automated. The researcher's real need is a clean dataset with completeness counts, which we can provide. |
| Let the AI write any code | Allow the assistant to generate and run arbitrary analysis code. | Impossible to validate; the single biggest source of confident, wrong answers in systems like this. |

### Rationale

- The five real questions supplied by the product owner (Section 6) all decompose into the same ten operations. Only the statistical version of the researcher's question did not, and the product owner confirmed the dataset-plus-honest-refusal approach was sufficient for it.
- A short, written list of what the platform can do is what makes it possible to check automatically whether an AI-generated plan is allowed.

### Consequences

- Rules out / defers: In-platform statistical modelling (deferred to a later version with its own design and ethics review).

### Plain-English summary

The platform supports exactly ten kinds of operation (choose an area; filter by attribute; draw a buffer; relate buildings to another layer; group and count; compare two groups; rank; filter by recent edits; report completeness; produce outputs). Statistical modelling — regression, tests of significance, measures of spatial clustering — is not supported in Version 1. When asked for it, the assistant must say plainly that it cannot, and offer the clean dataset the person would need to do it elsewhere.
