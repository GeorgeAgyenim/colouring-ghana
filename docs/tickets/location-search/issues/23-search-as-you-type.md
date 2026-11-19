# Search results appear while typing

Status: done
Type: task
Blocked by: none
Feature doc: `docs/location-search.md` (Search interaction)
Requirements: none recorded on this branch
Branch: `fix/location-search-23-search-as-you-type` off `feature/location-search`
Source: product owner, 19 November 2026: "Search results options should start appearing the moment the user
starts typing in the search bar, not just after clicking the search button"

## Problem

The results list only appears after the person presses Search (or Enter). Until then they cannot tell
whether what they are typing will match anything, and on a phone they must find the button each time.

## What to build

Search as the person types, using the same request, list, pins and map framing as pressing Search.

- Search once the person pauses typing for 300 ms, so a fast typist sends one request, not one per letter.
- Search from 3 characters. Shorter text matches almost anything: checked against the index on
  19 November 2026, "a" and "ac" return buildings named "AB" and "As"; "acc" returns Accra. Below 3
  characters the list and pins are cleared.
- An answer for earlier text that arrives later is dropped. The current list stays up while the person
  types, until the answer for the new text replaces it, so it does not flicker on every keystroke. A
  failure message is removed as soon as they type.
- Pressing Search or Enter still searches straight away, without waiting for the pause, even below
  3 characters, since the person asked for it.
- Escape, picking a result, and closing the page cancel a search that is waiting for the pause.

## Acceptance criteria

- [x] Test: typing 3 or more characters shows the results list after the pause, without pressing Search.
- [x] Test: nothing is sent before 300 ms; the pause counts from the last keystroke, not the first.
- [x] Test: typing fast sends one request for the final text.
- [x] Test: fewer than 3 characters sends no request and clears the list.
- [x] Test: an older answer arriving after a newer one does not replace it.
- [x] Test: pressing Search searches straight away and the pending pause does not search again.
- [x] Test: Escape before the pause ends sends no request; an answer arriving after Escape, or after
  picking a result, is dropped; removing the box before the pause sends no request.
- [x] Test: an earlier failure message goes away as soon as the person types again.
- [x] Seen in the app: typing a town shows candidates and pins without pressing Search.
- [x] `npm test` and typecheck pass.

## Comments

**19 November 2026, closed.** Implemented in the commit that sets this status. Seen in the app: typing
"kumasi" one letter at a time sent one request and listed "Kumasi, Ashanti" without pressing Search.

**19 November 2026, review.** Two-axis review (standards and spec). Fixed: tests now pin the 300 ms pause
and its restart on each keystroke, and cover cancelling on shortening, picking a result and removing the
box; a failure message no longer stays up while the person types; a variable that shadowed `search()` was
renamed. Decided and documented: Search or Enter searches below 3 characters. Left as is: typing below 3
characters tells the map to clear its pins on each keystroke even when none are shown (one cheap
re-render; not worth a guard).
