# ADR-0012: The assistant is available to anonymous visitors, keeps no history, and is rate-limited per session

- Status: Accepted
- Date: 16 September 2026
- Deciders: product owner (Colouring Ghana); design dialogue with Claude (Anthropic) as planning aid
- Requirements served: FR-4.8, FR-12
- Plain-English record: docs/Design-Decisions-Plain-English.md — D10

### Context

'Rate limiting' means restricting how many requests one user can make in a period, to keep the service available to all. An 'IP address' is the number that identifies an internet connection; a whole office or training room usually shares one. Limiting by IP would lock out a room of 50 planners after the first few questions, so we limit by a token each browser receives when it loads the page.

Because the model is self-hosted, each question has no per-use fee. But the computer serving it can only handle so many at once, so there is a queue, and the screen shows the user's place in it — with the builder always available as the no-wait alternative.

### Decision

Anyone can use the assistant without an account. The server stores no conversation history; the conversation lives only in the user's browser tab, and the user can download it. Limits on how often the assistant can be used are applied per browser session, not per internet address. Saved chat history for logged-in users is a candidate for Version 2.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Require login | Only registered users may use the assistant. | Excludes residents and students; unnecessary when there is no per-use cost. |
| Store conversation history on the server | Keep chats so users can return to them. | Personal data to protect and retain; not needed in Version 1. Offered later for users whose work requires it. |
| Per-IP rate limits | Standard practice for public services. | Breaks the training-room scenario the product owner described. |

### Rationale

- No per-query cost removes the usual reason to gate an assistant behind accounts.
- Storing nothing is the simplest privacy posture.
- Training rooms are a real deployment scenario in Ghana.

### Consequences

- None recorded beyond the requirements served.

### Plain-English summary

Anyone can use the assistant without an account. The server stores no conversation history; the conversation lives only in the user's browser tab, and the user can download it. Limits on how often the assistant can be used are applied per browser session, not per internet address. Saved chat history for logged-in users is a candidate for Version 2.
