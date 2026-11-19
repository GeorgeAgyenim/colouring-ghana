# Search results update on every keystroke, from the first letter

Status: done
Type: task
Blocked by: none
Feature doc: `docs/location-search.md` (Search interaction)
Requirements: none recorded on this branch
Branch: `fix/location-search-24-search-every-keystroke` off `feature/location-search`
Source: product owner, 19 November 2026, after issue 23: "1-letter minimum. Results should keep refreshing
or updating as the user types."

## Problem

Issue 23 searched only once the person paused typing for 300 ms, and only from 3 characters. Someone
typing steadily saw nothing change until they stopped, and the first two letters showed nothing.

## What to build

- Search on every change of the text, from the first character. Empty text (or only spaces) clears the
  list and pins and sends nothing.
- Show each answer as it arrives, so the list keeps updating while the person types, even when answers
  take longer than the gap between keystrokes. Drop an answer only when a newer one is already shown,
  or when the person has since pressed Escape, picked a result, or cleared the text.
- Pressing Search or Enter still searches the current text.

Server cost, measured 19 November 2026 on the local index (27,775 rows): one search takes 6 to 13 ms
(`EXPLAIN ANALYZE`, trigram index scan, 5 rows). The box allows 28 characters, so one search is at most
28 requests.

## Acceptance criteria

- [x] Test: typing one letter sends a request at once and shows its results.
- [x] Test: each keystroke sends a request for the text so far.
- [x] Test: while typing, each answer replaces the list as it arrives, even when the next keystroke came
  before it.
- [x] Test: an older answer arriving after a newer one does not replace it.
- [x] Test: empty text sends no request and clears the list.
- [x] Test: an answer arriving after Escape, or after picking a result, is dropped; the Search button is
  usable again.
- [x] Seen in the app: typing a town one letter at a time updates the list on each letter.
- [x] `npm test` and typecheck pass.

## Comments

**19 November 2026, closed.** Implemented in the commit that sets this status. Replaces the 300 ms pause and
3-character minimum from issue 23. Seen in the app: typing "kumasi" sent six requests (k, ku, kum, kuma,
kumas, kumasi) and the list updated as answers arrived; typing "a" alone listed five results; the input did
not change width while the button read "Searching…".

**19 November 2026, review.** Two-axis review (standards and spec). Fixed: an error while showing an answer
was silently swallowed (now kept apart from a failed search); the Search button was disabled while any
search was out, so Enter did nothing (now always usable, and works as "try again"); a failure of an older
search wiped the list while a newer one was on its way (now only the latest text's failure is shown). Tests
added for the pins updating, the button returning to "Search", and answers after the box is removed.
Left as is: the button reads "Searching…" while a search is out, so it flips on each letter (a product
call, raised with the product owner); superseded requests are not cancelled (one search is 6 to 13 ms).

**19 November 2026.** The product owner chose "always show Search"; done in issue 25.
