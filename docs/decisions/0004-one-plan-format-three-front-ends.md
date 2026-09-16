# ADR-0004: One plan, three doors: builder, SQL editor and assistant all produce the same 'query plan'

- Status: Accepted
- Date: 15 September 2026
- Deciders: product owner (Colouring Ghana); design dialogue with Claude (Anthropic) as planning aid
- Requirements served: FR-1, FR-2, FR-3, FR-4
- Plain-English record: docs/Design-Decisions-Plain-English.md — D5

### Context

A 'query plan' is a recipe card. It says: start with this area; keep only residential buildings in poor condition; keep those inside the flood zone; count them by electoral area; show the top ten; give me a number, a map and a download.

'SQL' is the standard language for asking questions of databases. 'Spatial SQL' adds geography to it. Most people never need to see it; it is offered for those who want it.

The 'builder' is the set of click actions the product owner asked about for offline use. It is not a weaker version of the assistant: both produce the same plans and can do the same things. The assistant's only extras are turning a sentence into a plan, explaining the result in words, and suggesting what to ask next.

Because a plan is a file, it can be saved, shared, re-run later, and inspected by someone checking the work.

### Decision

Every question, however it is asked, is turned into the same structured description called a query plan — an ordered list of the ten operations in D3, written in a format a computer can check. A click-and-choose 'builder', a SQL editor for people who write code, and the AI assistant are three ways of producing a plan. One engine runs all plans.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Separate systems per audience | A SQL console for researchers, a click tool for planners, a chat box for everyone else, each talking to the database its own way. | Every capability would be built three times and the three would drift apart, giving different answers to the same question. |
| Natural language only | Only the chat assistant. | Does not work offline; cannot be inspected or corrected by a planner; excludes researchers who want precision. |
| SQL only | Only a code console. | Excludes four of the five audiences. |

### Rationale

- Build each capability once; every door benefits.
- A plan produced by the AI can be opened in the builder, read, and edited before it is run — which is how a person stays in control of what the AI proposed.
- Plans are the unit of reproducibility: plan plus data snapshot equals the analysis.

### Consequences

- None recorded beyond the requirements served.

### Plain-English summary

Every question, however it is asked, is turned into the same structured description called a query plan — an ordered list of the ten operations in D3, written in a format a computer can check. A click-and-choose 'builder', a SQL editor for people who write code, and the AI assistant are three ways of producing a plan. One engine runs all plans.
