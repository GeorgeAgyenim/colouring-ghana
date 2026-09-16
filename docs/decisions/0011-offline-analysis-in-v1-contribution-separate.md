# ADR-0011: Offline analysis is a first-class mode; the assistant needs a connection in Version 1; Offline contribution (editing buildings offline, syncing later) is a separate project

- Status: Accepted
- Date: 16 September 2026
- Deciders: product owner (Colouring Ghana); design dialogue with Claude (Anthropic) as planning aid
- Requirements served: FR-10, FR-4.9, PRD §10.2
- Plain-English record: docs/Design-Decisions-Plain-English.md — D13, D14

## D13 — Offline analysis is a first-class mode; the assistant needs a connection in Version 1

### Context

A 'PWA' (Progressive Web App) is a website that installs like an app and keeps working without a connection by storing its files locally. A 'service worker' is the browser component that makes this possible.

The product owner visited planners in about five MMDAs; the main complaint was unreliable or absent internet, even within Kumasi. Offline capability is therefore a requirement, not a nicety.

For a training room of 30–50 planners sharing one connection, the practical answer is to download a pack once and share it as a file. This needs no special software beyond the platform's 'load pack from file' feature.

The 'as of' date of the pack is always visible, and when a connection returns the platform says whether a newer pack exists.

### Decision

The platform is an installable web app (a 'PWA') that can store downloaded area packs on the device. With a pack loaded and no internet, the map, the builder, the SQL editor, every output and every download work. A pack can also be loaded from a file passed by USB stick or over a room's local network. The assistant is disabled offline; plans it wrote while online can still be run.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| No offline support | Standard web platform. | Fails the most-cited real-world obstacle. |
| A native mobile/desktop app | Separate installable programs. | Much more to build and maintain; a PWA achieves the goal with one codebase. |
| An 'MMDA box' now | A small local server in each planning office running the model and serving packs. | A real option for Ghana, but a hardware and support commitment; deferred to Version 2 after a pilot. |
| An AI model in the browser for offline assistant | Ship a small model with the app. | Not reliable enough today (see D9). |

### Rationale

- The browser-first architecture (D7) makes offline nearly free: the engine, plans and rendering are already on the device.
- Packs are plain files with a timestamp, so distribution can be as simple as a USB stick.

### Consequences

- Rules out / defers: Offline use of the assistant in Version 1 — accepted explicitly by the product owner.

## D14 — Offline contribution (editing buildings offline, syncing later) is a separate project

### Context

'Syncing' means sending the edits made offline to the server later. The difficulty is not queuing them; it is what to do when someone else changed the same building attribute in the meantime ('conflict resolution'), and how that fits the core platform's edit history and verification workflow.

The intended experience: a quiet badge such as '7 edits waiting to sync', a reminder on each visit, and, on reconnection, the platform flags any edit that clashes with a newer change rather than silently overwriting either.

### Decision

Users should eventually be able to edit building information offline and have it uploaded when a connection returns, with a gentle, non-nagging reminder while edits are waiting. This is wanted, but it is not part of the analytics Version 1. It will have its own requirements document.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Include it in analytics Version 1 | Build both together. | It is the single largest item in the whole programme and would delay analytics. It also touches parts of the core platform we are not otherwise changing. |

### Rationale

- Contribution already requires an account in the core platform, and each edit is a small, self-contained change with a log entry — so the queuing part fits naturally later.
- The conflict semantics deserve their own design conversation.

### Consequences

- None recorded beyond the requirements served.

### Plain-English summary

The platform is an installable web app (a 'PWA') that can store downloaded area packs on the device. With a pack loaded and no internet, the map, the builder, the SQL editor, every output and every download work. A pack can also be loaded from a file passed by USB stick or over a room's local network. The assistant is disabled offline; plans it wrote while online can still be run. Users should eventually be able to edit building information offline and have it uploaded when a connection returns, with a gentle, non-nagging reminder while edits are waiting. This is wanted, but it is not part of the analytics Version 1. It will have its own requirements document.
