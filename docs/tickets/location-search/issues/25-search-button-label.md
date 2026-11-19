# The Search button always reads "Search"

Status: done
Type: task
Blocked by: none
Feature doc: `docs/location-search.md` (Search interaction)
Requirements: none recorded on this branch
Branch: `fix/location-search-25-search-button-label` off `feature/location-search`
Source: product owner, 19 November 2026, asked after issue 24 whether the button should keep reading
"Searching…" while a search is out: "always show "Search""

## Problem

Since issue 24 searches on every keystroke, the button switched to "Searching…" and back on each letter.

## What to build

The button always reads "Search". The list updating is the sign that a search happened.

## Acceptance criteria

- [x] Test: while a search is still on its way, the button reads "Search".
- [x] `npm test` and typecheck pass.

## Comments

**19 November 2026, closed.** Implemented in the commit that sets this status. The busy state behind the
label had no other use, so it was removed.
