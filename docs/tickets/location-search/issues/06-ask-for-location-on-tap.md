# Ask for location only when the person taps, not on page load

Status: needs-decision
Type: task
Blocked by: none
Feature doc: docs/location-search.md
Requirements: none recorded on this branch
Source: docs/audit-2026-09.md ("Known debt left in place"); review of the whole branch for problems,
19 November 2026

## Problem

`app/src/frontend/map/geolocation-control.tsx` starts watching the position as soon as the map loads, with
high accuracy. Every visitor gets the browser's location prompt before doing anything, and a phone keeps
its GPS on for as long as the page is open.

A separate rework of location services was dealing with this. It lived only on local branches, never
pushed, and was withdrawn and deleted on 19 November 2026. This ticket exists so the problem still has an
owner.

## To decide

- Start on the first tap of "Go to my location" only, or keep the automatic start.
- What the button shows before a position is known, and after the person refuses.
- Whether to stop watching when the page is in the background.
