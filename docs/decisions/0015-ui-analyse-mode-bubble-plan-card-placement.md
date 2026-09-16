# ADR-0015: Analysis is a third sidebar mode, with the category tiles kept visible; The AI assistant lives in a floating bubble at the bottom-left of the map; The conversation stays where the person typed it; only 'Edit in builder' moves them; The plan card looks the same everywhere and is the hand-off between assistant and builder; Layers and uploads live in 'Show layer options'; packs in the Menu; status in the header; drawing in the map-corner tools

- Status: Accepted
- Date: 16 September 2026
- Deciders: product owner (Colouring Ghana); design dialogue with Claude (Anthropic) as planning aid
- Requirements served: FR-14.1–14.4, FR-14.10
- Plain-English record: docs/Design-Decisions-Plain-English.md — D18, D19, D20, D21, D27

## D18 — Analysis is a third sidebar mode, with the category tiles kept visible

### Context

Today, clicking a category tile swaps the lower part of the sidebar to that category's content. Analyse mode uses the same behaviour, so nothing new appears on screen until a person asks for it.

Keeping the tiles visible means a planner can recolour the map by 'Retrofit & Condition' while a query is open, rather than having to leave the analysis to look at the data.

### Decision

Alongside the existing View and Edit modes, the sidebar gains an Analyse mode. The twelve category tiles stay visible above it; the panel beneath them shows Build and SQL tabs, the plan card, and the results summary. Web addresses follow the existing pattern (/analyse/… carries a plan, while /view/… continues to carry the selected building's ID).

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| A second panel on the right of the map | Categories on the left, analysis on the right, map in between. | Two panels plus results is heavy on a laptop and impossible on a phone, where it would collapse to a bottom sheet anyway. Keeping the tiles above the analysis panel gives most of the benefit. |
| A thirteenth tile called 'Analyse' | Add it to the grid. | The tiles are data categories; analysis is not one. It would misdescribe what it is. |
| A Menu item only | Reach analysis from the hamburger menu. | Cheapest, and least discoverable — a real cost for residents and students. |
| A separate analytics page | Leave the map and go to a new screen. | Breaks the map-centred experience the platform is known for. |

### Rationale

- It reuses the sidebar's existing mode behaviour and routing conventions.
- It keeps the structured, offline-capable door (the builder) in the most prominent place on the screen.

### Consequences

- None recorded beyond the requirements served.

## D19 — The AI assistant lives in a floating bubble at the bottom-left of the map

### Context

A 'bubble' is the small round button many websites use for chat. An 'anchored panel' is the chat window that opens from it and stays attached to it.

Greying the bubble offline is deliberate: the platform must never appear to promise the assistant when only the builder can deliver.

### Decision

The assistant is a floating bubble at the bottom-left of the map, below the search box and away from the legend. Clicking it opens a panel that grows upward over the map. When offline, the bubble is greyed out with the message 'needs a connection'. On a phone, it opens as a bottom sheet.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Bottom-right of the map | The conventional position for chat bubbles. | The legend, the attribution notice and the Colouring Ghana badge already occupy that corner; the product owner preferred the left, which also stacks the two text-entry points (search, ask) on the same side. |
| An Ask tab inside the sidebar only | No bubble; the assistant is a tab in Analyse mode. | Loses the ability to ask a question from View mode about what you are looking at without switching modes. |
| A centred overlay | A prominent box in the middle of the screen. | It covers the map, which is the thing the person is asking about. |

### Rationale

- A bubble lets a resident ask about the building or street they are looking at without leaving View mode.
- It gives the online and offline doors different, honest appearances.

### Consequences

- None recorded beyond the requirements served.

## D20 — The conversation stays where the person typed it; only 'Edit in builder' moves them

### Context

The product owner's objection to an earlier proposal was simple and correct: why type something in one place and have to go somewhere else to press Run? This decision honours it.

There is exactly one chat surface (the bubble) and exactly one structured surface (the sidebar). Neither duplicates the other.

### Decision

Everything the assistant produces — the plan card, the Run button, the headline number with completeness and 'as of', and the result cards — appears in the bubble's panel. Running a plan does not move the person into the sidebar. The single hand-off to the sidebar is the plan card's 'Edit in builder' action, which opens Analyse mode with that plan loaded. The sidebar has an 'Ask instead' link that opens the bubble, and no chat of its own.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Move the conversation into the sidebar when Run is pressed | Keep all three 'doors' in one sidebar panel for tidiness. | It costs the person their sense of place to buy tidiness for the design. Rejected on the product owner's challenge. |
| Two chats, one in the bubble and one in the sidebar | An Ask tab as well as the bubble. | Nobody should have to wonder which chat is the real one, or whether their conversation followed them. |

### Rationale

- It matches how people expect chat to behave.
- It maps cleanly onto connectivity: the bubble is the online door, the sidebar is the offline-capable door.
- On a phone it means one sheet whose content swaps, not two competing sheets.

### Consequences

- None recorded beyond the requirements served.

## D21 — The plan card looks the same everywhere and is the hand-off between assistant and builder

### Context

The summary line is what a resident reads first ('Residential buildings in poor condition inside flood zones, by electoral area'); the steps beneath are the machinery for anyone who wants to check or change it.

### Decision

A plan is shown as a card with a one-line plain-English summary, the steps expanded beneath (collapsible), and the actions Run, Edit in builder, Save and Share. It is rendered identically in the bubble and in the sidebar. A plan built by clicking can be sent to the assistant for an explanation of its result.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Show only the summary, hide the steps | Simpler for residents. | Transparency is the point of plans; hiding the steps by default hides what the AI decided. |
| Show only the steps | Maximum precision. | Unreadable for residents and students at a glance. |

### Rationale

- One representation means one thing to learn and one thing to test.
- The card is what makes 'edit what the AI proposed' possible.

### Consequences

- None recorded beyond the requirements served.

## D27 — Layers and uploads live in 'Show layer options'; packs in the Menu; status in the header; drawing in the map-corner tools

### Context

A flood zone is a layer whether the platform curated it or the person loaded it; putting both in one place means the builder's 'relate to a layer' step offers the same list the map shows.

### Decision

Reference layers (districts, flood zones and so on) and layers the person loads from their own device both appear in the existing 'Show layer options' panel, with the browser-only notice on the upload control. Downloaded packs are managed from the Menu. The online/offline state and the active pack's 'as of' date are shown in the header. Drawing a point, line or area for a query uses a draw tool in the map-corner button stack, started from a builder step or from the 'Draw an area' choice.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| A separate 'My data' panel for uploads | Uploads get their own home. | One more place to look; and uploads are layers, so they belong with layers. |
| Pack management inside Analyse mode | Keep offline tools with analysis. | Packs affect the whole view (map and analysis), so they belong with whole-view controls. |

### Rationale

- Reuses existing panels and conventions; adds no new chrome.

### Consequences

- None recorded beyond the requirements served.

### Plain-English summary

Alongside the existing View and Edit modes, the sidebar gains an Analyse mode. The twelve category tiles stay visible above it; the panel beneath them shows Build and SQL tabs, the plan card, and the results summary. Web addresses follow the existing pattern (/analyse/… carries a plan, while /view/… continues to carry the selected building's ID). The assistant is a floating bubble at the bottom-left of the map, below the search box and away from the legend. Clicking it opens a panel that grows upward over the map. When offline, the bubble is greyed out with the message 'needs a connection'. On a phone, it opens as a bottom sheet. Everything the assistant produces — the plan card, the Run button, the headline number with completeness and 'as of', and the result cards — appears in the bubble's panel. Running a plan does not move the person into the sidebar. The single hand-off to the sidebar is the plan card's 'Edit in builder' action, which opens Analyse mode with that plan loaded. The sidebar has an 'Ask instead' link that opens the bubble, and no chat of its own. A plan is shown as a card with a one-line plain-English summary, the steps expanded beneath (collapsible), and the actions Run, Edit in builder, Save and Share. It is rendered identically in the bubble and in the sidebar. A plan built by clicking can be sent to the assistant for an explanation of its result. Reference layers (districts, flood zones and so on) and layers the person loads from their own device both appear in the existing 'Show layer options' panel, with the browser-only notice on the upload control. Downloaded packs are managed from the Menu. The online/offline state and the active pack's 'as of' date are shown in the header. Drawing a point, line or area for a query uses a draw tool in the map-corner button stack, started from a builder step or from the 'Draw an area' choice.
