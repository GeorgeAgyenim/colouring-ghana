# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Layout: single-context

One `CONTEXT.md` at the repo root and one ADR folder, `docs/decisions/`. There is no `CONTEXT-MAP.md`.

```
/
├── CONTEXT.md                          ← terminology and standing constraints (P1–P9)
├── CLAUDE.md                           ← documentation rules that apply to every change
└── docs/
    ├── decisions/                      ← all ADRs, numbered ADR-0001 upwards; README.md is the index
    ├── PRD-colouring-ghana-analytics.md ← requirement IDs (FR-x.y / NFR-x.y) that commits and ADRs cite
    ├── templates/adr.md                ← template for new ADRs
    └── tickets/                        ← issues and PRDs (see issue-tracker.md)
```

`docs/adr/` no longer exists. Its three engineering ADRs were moved into `docs/decisions/` as ADR-0019 to
ADR-0021 on 16 September 2026 so that "ADR-NNNN" means one thing.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — the canonical vocabulary for specs, tickets, code identifiers and UI copy.
- **`docs/decisions/README.md`** — the ADR index. Then read the ADRs that touch the area you're about to work
  in. ADRs record the alternatives rejected as well as the choice.
- **`docs/PRD-colouring-ghana-analytics.md`** when the work belongs to the analytical platform — it holds the
  requirement IDs that code headers, commits and ADRs must cite.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them
upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`)
creates them lazily when terms or decisions actually get resolved.

## Writing a new ADR

Use `docs/templates/adr.md`, take the next number from the README table, and set status `Proposed` until a
human accepts it. Never edit an accepted ADR; write a new one that supersedes it. Add a row to the README table.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name),
use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the
project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`, and add the term to
`CONTEXT.md` with a plain-English definition; there is no second glossary).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0006 (single execution engine in the browser) — but worth reopening because…_
