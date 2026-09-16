# ADR-0001: Serve all five kinds of user equally in Version 1; Every question returns three things: a number, a map, and a downloadable dataset

- Status: Accepted
- Date: 15 September 2026
- Deciders: product owner (Colouring Ghana); design dialogue with Claude (Anthropic) as planning aid
- Requirements served: FR-5; PRD §4.1
- Plain-English record: docs/Design-Decisions-Plain-English.md — D1, D2

## D1 — Serve all five kinds of user equally in Version 1

### Context

There is no single 'typical user'. A researcher who wants to write code, a planner who wants to click, and a resident who wants to type a question must all be able to ask the platform the same thing.

This is more than a statement of inclusiveness: it forces the platform to offer several different 'doors' into the same capability (see D5).

### Decision

Version 1 is built for five groups at once, with none treated as more important: GIS researchers (who may or may not know spatial SQL), planners (who know GIS ideas but not SQL), MMDA officers (staff of Metropolitan, Municipal and District Assemblies), students, and ordinary visitors or residents.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Pick one primary audience | Design a single interface for, say, researchers (a code console) or planners (a click-only tool) and treat others as secondary. | The product owner judged all five groups to be important now. A platform for open public data that only serves specialists would not meet the programme's mission. |
| Phase the audiences | Serve researchers first, then planners in a later release, and so on. | The five groups need the same underlying capabilities; separating them in time would mean building the same thing several times in different clothes. |

### Rationale

- The product owner explicitly asked not to rank the audiences.
- Once we looked at the real questions each group asks (see Section 6), it became clear they all need the same small set of operations, just expressed differently.

### Consequences

- Depends on: D5 (one plan, three doors), which is what makes serving everyone affordable.
- Rules out / defers: A single-interface product (a pure SQL console or a pure chat box) as the end state.

## D2 — Every question returns three things: a number, a map, and a downloadable dataset

### Context

A dataset is a table of the buildings (or areas) that matched the question, with their attributes and shapes, in files that GIS and statistics software can open.

For a researcher, the downloadable dataset is often the real deliverable: they will take it into R or Python to do their own modelling (see D3).

### Decision

For Version 1, the outputs of any query are a headline number, a map showing the result, and a dataset the user can download. Charts are a 'should have' addition.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Add reports and dashboards | Automatically generate written reports or interactive dashboards. | Useful, but not needed for any of the five example questions; kept for a later version. |
| Notebook output | Give researchers a coding notebook inside the platform. | Serves one audience only and does not work offline; the downloadable dataset achieves the same goal more simply. |

### Rationale

- These three outputs cover what all five groups said they needed.
- They are also what makes an answer checkable: someone else can look at the same map and dataset.

### Consequences

- None recorded beyond the requirements served.

### Plain-English summary

Version 1 is built for five groups at once, with none treated as more important: GIS researchers (who may or may not know spatial SQL), planners (who know GIS ideas but not SQL), MMDA officers (staff of Metropolitan, Municipal and District Assemblies), students, and ordinary visitors or residents. For Version 1, the outputs of any query are a headline number, a map showing the result, and a dataset the user can download. Charts are a 'should have' addition.
