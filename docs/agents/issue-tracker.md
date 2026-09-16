# Issue tracker: Local Markdown

Issues and PRDs for this repo live as markdown files committed under `docs/tickets/`. There are no GitHub
Issues on this repository (the feature is switched off), and pull requests are not a triage surface.

## Why local, and why committed

Decided 16 September 2026 while running `/setup-matt-pocock-skills`.

- **Chosen: markdown files in the repo.** Every ticket and PRD is versioned with the code it describes, is
  present in every clone at the exact commit, and its edit history is in git. That matches the research
  programme's rule that a change is traceable to a requirement and a decision.
- **Rejected: GitHub Issues.** Issues live in GitHub's database, outside the repo; a clone or fork does not
  carry them, and their edit history is not versioned. Comments, assignees and notifications were not needed
  for a single-maintainer research fork.
- **Rejected: git-ignored `.scratch/`.** Tickets would exist on one machine only, and commits could cite files
  nobody else can open.

## Conventions

- One feature per directory: `docs/tickets/<feature-slug>/`
- The PRD or spec is `docs/tickets/<feature-slug>/PRD.md`
- Implementation issues are `docs/tickets/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for
  the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading
- A ticket is referenced by its path, e.g. `docs/tickets/map-migration/issues/03-vector-tile-source.md`.
  Branches for a ticket are `feature/<feature-slug>-<NN>-<slug>` or `fix/<feature-slug>-<NN>-<slug>`;
  commits cite the ticket path and the requirement IDs it serves (see `CLAUDE.md`).
- Epics: the integration branch is `epic/<feature-slug>`; ticket branches come off it, not `master`.

## When a skill says "publish to the issue tracker"

Create a new file under `docs/tickets/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `docs/tickets/<effort>/map.md` — the Notes / Decisions-so-far / Fog body.
- **Child ticket**: `docs/tickets/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the
  body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line
  records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is
  `resolved`.
- **Frontier**: scan `docs/tickets/<effort>/issues/` for files that are open, unblocked, and unclaimed; first
  by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context
  pointer (gist + link) to the map's Decisions-so-far in `map.md`.
