# ADR-0016: A query result replaces the category colouring on the map; Clicking a building in result view shows a small popup with the values the plan used; Tables and charts are result cards that open full-size in a centred pop-up; there is no results drawer

- Status: Accepted
- Date: 16 September 2026
- Deciders: product owner (Colouring Ghana); design dialogue with Claude (Anthropic) as planning aid
- Requirements served: FR-14.5–14.7
- Plain-English record: docs/Design-Decisions-Plain-English.md — D22, D23, D24

## D22 — A query result replaces the category colouring on the map

### Context

'Choropleth' is the term for shading areas (electoral areas, neighbourhoods) by a value, such as a count. Because only one styling is shown at a time, there is never a question of how to overlay a choropleth on building colours.

### Decision

When a plan runs, the map enters 'result view': all buildings turn neutral except the matches, which are highlighted, or the boundary areas, which are shaded by the result. The legend in the bottom-right switches to the result. Clicking any category tile restores the category colouring without discarding the plan; a 'Back to result' control re-enters result view. Results are never drawn on top of category colours.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Overlay results on the category colouring | Outline matches while the underlying colours stay visible. | Lets a GIS user see two things at once, but is harder to read for everyone else, and has no answer for area shading. The product owner chose replacement. |

### Rationale

- Clarity for the five audiences over density for one.
- A single styling state is simpler to build, test and explain.

### Consequences

- None recorded beyond the requirements served.

## D23 — Clicking a building in result view shows a small popup with the values the plan used

### Context

This keeps the person in their analysis while letting them check individual buildings — and makes data gaps visible one building at a time, consistent with the completeness principle.

### Decision

In result view, clicking a building opens a small popup on the map listing only the attributes the running plan referred to (for example condition, land use, electoral area), showing 'not recorded' where a value is blank, with an 'Open building' link to the building's full page. The popup's contents are generated from the plan.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Do what a click does today: open the building's details and leave the analysis | No new code. | A resident who clicks a highlighted building would lose their result. |
| Do nothing | Clicks are ignored in result view. | Cheapest, and frustrating for everyone. |

### Rationale

- The most useful behaviour, and because the popup is generated from the plan it does not need designing per query.

### Consequences

- None recorded beyond the requirements served.

## D24 — Tables and charts are result cards that open full-size in a centred pop-up; there is no results drawer

### Context

This is the pattern people know from chat assistants, where a generated table or file appears as a card and opens on click. The product owner asked for exactly this.

### Decision

Tables and charts that do not fit the width of the bubble or sidebar are shown as cards — a name, a small preview, the 'as of' stamp, the completeness line, and download formats. Clicking a card opens it full-size in a centred pop-up ('modal') over the map, with download and close; on a phone the pop-up fills the screen. The map itself is never a card.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| A results drawer sliding up over the bottom of the map | A wide strip for tables and charts, collapsible to a thin bar. | More chrome, and a third container to manage on a phone. The card-plus-pop-up pattern needs none of that. |

### Rationale

- Familiar; one fewer panel; and it makes the downloadable session (D10) trivially the list of cards and their plans.
- The trade-off — the pop-up covers the map — is acceptable because the researcher who needs table and map together has the download.

### Consequences

- None recorded beyond the requirements served.

### Plain-English summary

When a plan runs, the map enters 'result view': all buildings turn neutral except the matches, which are highlighted, or the boundary areas, which are shaded by the result. The legend in the bottom-right switches to the result. Clicking any category tile restores the category colouring without discarding the plan; a 'Back to result' control re-enters result view. Results are never drawn on top of category colours. In result view, clicking a building opens a small popup on the map listing only the attributes the running plan referred to (for example condition, land use, electoral area), showing 'not recorded' where a value is blank, with an 'Open building' link to the building's full page. The popup's contents are generated from the plan. Tables and charts that do not fit the width of the bubble or sidebar are shown as cards — a name, a small preview, the 'as of' stamp, the completeness line, and download formats. Clicking a card opens it full-size in a centred pop-up ('modal') over the map, with download and close; on a phone the pop-up fills the screen. The map itself is never a card.
