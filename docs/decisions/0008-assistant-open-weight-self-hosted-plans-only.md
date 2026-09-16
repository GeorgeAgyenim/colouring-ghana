# ADR-0008: The AI assistant: an open-weight model we host; it sees only what it needs; it writes plans, not code

- Status: Accepted
- Date: 16 September 2026
- Deciders: product owner (Colouring Ghana); design dialogue with Claude (Anthropic) as planning aid
- Requirements served: FR-4, NFR-3.2
- Plain-English record: docs/Design-Decisions-Plain-English.md — D9

### Context

A 'language model' is the AI software behind chat assistants. 'Open-weight' means the model's trained parameters are published, so we can run it on our own computer rather than sending data to a company's service. 'Hosting' it means running that computer (it needs a graphics processor, or GPU, to be fast).

'Drawing the result on the map' is not something the model does. The model writes, as part of the plan, an instruction like 'highlight matching buildings and shade electoral areas by count'; the browser draws it from data the model never saw.

'Approval' is a small dialog: 'The assistant will see these column names and types, 340 rows, polygon shapes. Nothing else. Allow?' Once per layer.

A 'validator' checks each plan against the written list of allowed operations and the known layers and attributes. If the model makes a mistake, the plan fails loudly rather than producing a quietly wrong count. Safety comes from the checker, not from the model being clever.

### Decision

The assistant uses an 'open-weight' language model run on infrastructure the project controls. It receives the user's question, the platform's data definitions, and — only after the user explicitly approves — the column names, types, row count and shape type of an uploaded layer. After a query runs, it may receive the resulting numbers (counts, tables) so it can explain and chart them, with all geometry removed. It never receives rows or shapes of uploaded data, individual building records, or contributor identities. Its output is a query plan, which is checked before it runs and shown to the user. A user may optionally point the assistant at a model service of their own choosing, using their own account.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Paid hosted model service (e.g. via an API) | Send questions to a commercial AI provider and pay per use. | Cost grows with every anonymous visitor and is unbounded without caps; the question and metadata leave the project's control; the provider's data policy applies. |
| OpenRouter (a broker for many models) | Let users pick any model through one service; no hosting to manage. | Still paid per use (the provider's price plus a margin). Some 'free' models come with rate limits and terms that may allow logging or training on requests — exactly what a privacy-focused platform must avoid. And plan quality would vary with models we have never tested. Kept as an optional 'bring your own key' path for researchers who accept the trade-off. |
| A small model inside the browser | Run a tiny AI model on the user's device, offline. | Current small models are not reliable enough at writing correct plans. Revisit later. |
| Text-to-SQL | Let the model write database code directly. | Much harder to check; spatial SQL is where models make subtle mistakes (units, projections). Plans are checkable; code is not. |
| A free-form 'agent' with tools | Let the model call many tools and decide for itself. | Less predictable; harder to explain to a public official why an answer is what it is. |

### Rationale

- Predictable, fixed cost makes it affordable to offer the assistant to anonymous visitors (D10).
- Data stays under project control, consistent with D6.
- Plans plus a validator give a safety property we can test, and let every AI answer be opened in the builder and corrected.

### Consequences

- Depends on: Choosing a model that reliably produces structured output (a plan in a fixed format), and the hardware to serve it (open decision OD-1).
- Rules out / defers: The assistant executing anything itself, or generating code that executes.

### Plain-English summary

The assistant uses an 'open-weight' language model run on infrastructure the project controls. It receives the user's question, the platform's data definitions, and — only after the user explicitly approves — the column names, types, row count and shape type of an uploaded layer. After a query runs, it may receive the resulting numbers (counts, tables) so it can explain and chart them, with all geometry removed. It never receives rows or shapes of uploaded data, individual building records, or contributor identities. Its output is a query plan, which is checked before it runs and shown to the user. A user may optionally point the assistant at a model service of their own choosing, using their own account.
