# Pasting values onto buildings shows what happened

Status: spec-complete
Type: task
Blocked by: none
Feature doc: none
Requirements: none recorded on this branch
Branch: `fix/location-search-09-paste-result` off `feature/location-search`
Source: found while building issues 02 to 04, 19 November 2026; facts checked in the code the same day

## Problem

A person can copy values from one building and paste them onto others by clicking each on the map
(`/multi-edit/<category>`). After a click nothing tells them the result. On success the map redraws and
that is all. When the API refuses the edit, the person is logged out, or the connection fails, nothing
happens on screen: the refusal goes only to the browser's console (`app/src/frontend/map-app.tsx`,
`colourBuilding`). Someone working along a street cannot tell which buildings were changed.

The panel shown while pasting (`app/src/frontend/building/multi-edit.tsx`) already has a place for
messages but is never told the result.

## What to build

`MapApp` keeps the result of the latest click and passes it to the panel, which shows one of:

- changed: "Building updated."
- the building already had those values (the API says "No change provided"): "That building already has
  these values."
- refused or failed: "The building you clicked was not changed: <reason>", where the reason is the API's
  message, or "could not reach the server. Check your connection and click the building again." when the
  request itself failed.

The message is cleared when the next click starts. If two clicks finish out of order, the message is for
the latest click. A screen reader announces it.

## Acceptance criteria

- [ ] Test: a successful paste shows "Building updated."
- [ ] Test: a refused paste shows "The building you clicked was not changed:" with the API's reason.
- [ ] Test: "No change provided" shows "That building already has these values."
- [ ] Test: a failed request shows the connection message.
- [ ] Test: when an earlier click finishes after a later one, the later click's message stays.
- [ ] In the running app: the panel shows a message after a click (the development database account
      cannot write, so a refusal or failure is what can be shown there; say which was seen).
- [ ] `npm test` and `npm run typecheck` pass.
