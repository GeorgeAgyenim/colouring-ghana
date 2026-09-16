# ADR-0005: Data that a user loads never leaves their browser

- Status: Accepted
- Date: 15 September 2026
- Deciders: product owner (Colouring Ghana); design dialogue with Claude (Anthropic) as planning aid
- Requirements served: FR-6, NFR-3.1
- Plain-English record: docs/Design-Decisions-Plain-English.md — D6

### Context

A 'browser' is the program (Chrome, Safari, Firefox) in which the platform runs on the user's own phone or laptop. A 'server' is the computer, run by the project, that everyone connects to.

'Never leaves the browser' is a promise that can be tested: we can watch every message the browser sends and confirm none contains the user's shapes or rows.

A 'bounding box' is the smallest rectangle that contains a set of shapes. Sending it tells the server roughly where the user's data is, but not what it looks like.

### Decision

If a user loads their own file (for example, the outline of a proposed road, or a ward boundary the platform does not have), that file stays on their device. It is never sent to the Colouring Ghana server. The one thing that may be sent — with the user's knowledge — is the rough rectangle covering the file's area, so that the platform can fetch the buildings nearby. The user may instead choose an area from the platform's list to avoid even that.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Upload to a temporary server table, delete afterwards | Send the file up, run the analysis on the server, delete the file. | Requires trusting the server, its logs and its backups; a promise that cannot be verified by the user. |
| Encrypted upload | Send the file in encrypted form. | The server must decrypt it to analyse it, so the privacy gain is illusory. |
| Trust-based policy only | A written policy that uploads are not kept. | Policy is not proof. Local data privacy was stated as crucial. |

### Rationale

- Local data privacy was set as a hard constraint by the product owner.
- Planners and researchers hold sensitive datasets; a technically verifiable guarantee is what will let them use the platform at all.

### Consequences

- Depends on: D7: analysis must run in the browser, because the user's data cannot go anywhere else.
- Rules out / defers: Any server feature that accepts uploaded analysis layers.

### Plain-English summary

If a user loads their own file (for example, the outline of a proposed road, or a ward boundary the platform does not have), that file stays on their device. It is never sent to the Colouring Ghana server. The one thing that may be sent — with the user's knowledge — is the rough rectangle covering the file's area, so that the platform can fetch the buildings nearby. The user may instead choose an area from the platform's list to avoid even that.
