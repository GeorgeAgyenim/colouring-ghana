# ADR-0017: The assistant never assumes a location; it asks, and the answer chips are the consent; 'My location' is resolved on the device; the person always chooses between a named area and a radius

- Status: Accepted
- Date: 16 September 2026
- Deciders: product owner (Colouring Ghana); design dialogue with Claude (Anthropic) as planning aid
- Requirements served: FR-14.8, FR-14.9, FR-14.11, OD-10
- Plain-English record: docs/Design-Decisions-Plain-English.md — D25, D26

## D25 — The assistant never assumes a location; it asks, and the answer chips are the consent

### Context

'Consent by action' means there is no separate permission dialog: the person's choice of chip is itself the permission, and the chip says what it will send.

### Decision

No information about where the person is looking, or which building they have selected, is sent to the assistant or the server by default. When a question needs a place ('here', 'my street'), the assistant replies with a clarifying question rendered as choices: This view · My location · A district… · Draw an area · A street name…. Picking a choice is what sends the corresponding information — a viewport rectangle for 'This view', a name for a district or street. The assistant's response format therefore has two kinds: a plan, or a clarification.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Send the current map view with every question | 'Here' just works. | The server would learn where the person is looking on every question, before any plan is run. |
| Send the selected building | 'This building' just works. | For a resident, the selected building is close to a home address. |
| A default-on 'using current view' chip the person can switch off | Convenient with an opt-out. | Opt-out defaults are rarely noticed; the product owner preferred an explicit question. |

### Rationale

- The smallest possible disclosure, chosen by the person each time.
- It creates a testable rule: the evaluation set includes questions where the correct answer is a clarification, so a model that guesses a location is marked wrong.

### Consequences

- None recorded beyond the requirements served.

## D26 — 'My location' is resolved on the device; the person always chooses between a named area and a radius

### Context

A device 'fix' is the position reported by the phone or laptop's location service. It is the most sensitive of the location choices because it reveals a home, not a viewpoint.

Resolving it on the device means the platform turns 'latitude/longitude' into 'Ayeduase Road' before anything leaves the browser — and because reference layers are in every pack, this works offline too.

### Decision

Choosing 'My location' uses the device geolocation feature already built in the development version. The position fix is resolved on the device against the reference layers, and the person is then always shown two options and chooses: the containing named area (street, neighbourhood, electoral area or district), which sends only the area's name; or a radius around the exact point, which sends a small rectangle around the point to fetch nearby buildings and is labelled 'Uses your exact position to fetch nearby buildings'. The assistant never receives coordinates. The accuracy of the fix is shown, and the person confirms the resolved area before the plan runs. Before this is built, the existing geolocation feature must be audited to confirm whether it already sends the fix to the server for any purpose.

### Alternatives considered

| Alternative | What it would have meant | Why not |
|---|---|---|
| Default to the named area; offer the radius only for distance questions | Simpler; discloses least. | Adds a hidden rule about which questions count as 'distance' questions. The product owner chose to always show both and let the person decide. |
| Send the fix to the server | Simplest to implement. | Contrary to the privacy principle; unnecessary when reference layers are available locally. |

### Rationale

- Transparency at the moment of choice, with the disclosure stated on the option itself.
- It reuses a feature already built, once its data flow has been confirmed.

### Consequences

- Depends on: The audit of the existing geolocation feature was completed on 16 September 2026 (PRD FR-14.11): the position fix never leaves the device; it is used only to draw the marker and accuracy circle and is discarded when the map closes. Two indirect exposures were noted and addressed: recentring the map to zoom 19 reveals roughly where the person is (to about 75 metres) to whoever serves the map tiles, so the named-area option does not recentre the map; and clicking a building in View mode sends the clicked point to the server, so in result view clicks are resolved on the device instead.

### Plain-English summary

No information about where the person is looking, or which building they have selected, is sent to the assistant or the server by default. When a question needs a place ('here', 'my street'), the assistant replies with a clarifying question rendered as choices: This view · My location · A district… · Draw an area · A street name…. Picking a choice is what sends the corresponding information — a viewport rectangle for 'This view', a name for a district or street. The assistant's response format therefore has two kinds: a plan, or a clarification. Choosing 'My location' uses the device geolocation feature already built in the development version. The position fix is resolved on the device against the reference layers, and the person is then always shown two options and chooses: the containing named area (street, neighbourhood, electoral area or district), which sends only the area's name; or a radius around the exact point, which sends a small rectangle around the point to fetch nearby buildings and is labelled 'Uses your exact position to fetch nearby buildings'. The assistant never receives coordinates. The accuracy of the fix is shown, and the person confirms the resolved area before the plan runs. Before this is built, the existing geolocation feature must be audited to confirm whether it already sends the fix to the server for any purpose.
