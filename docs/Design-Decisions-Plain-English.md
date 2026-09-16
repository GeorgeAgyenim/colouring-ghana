# Colouring Ghana Analytical Platform — Design Decisions and Rationale

*A plain-English record of what was decided, what else was considered, and why.*

| Field | Value |
|---|---|
| Document | DDR-CG-ANALYTICS (plain-English decision record) |
| Version | 0.4 (draft for review; map migration split out) |
| Date | 2026-09-16 |
| Companion documents | `PRD-colouring-ghana-analytics.md` (requirements); `CLAUDE.md` (documentation rules); `Design-Decisions-Plain-English.docx` (identical content, Word format for human circulation) |
| Maintenance rule | This `.md` is the only maintained version. The `.docx` is regenerated from it after an implementation is complete and accepted (a milestone step), never edited by hand and never updated per change. Decisions D1–D28 map to ADR-001…ADR-018 in `docs/decisions/` (see Section 11). |

> **Note for Claude Code.** This is the plain-English mirror of the ADRs. Use it to understand *why* things are the way they are before proposing changes. Never edit a decision here to make a task easier; propose a new ADR that supersedes it (see `CLAUDE.md` §4.8), then update this file. Leave the `.docx` alone; it is regenerated at milestones.

## 1. How to read this document

This document is written for people who are not software engineers: research leads, programme managers, partner institutions, funders, and assembly officials. It explains every decision made so far about the Colouring Ghana Analytical Platform, what other options were on the table, and why each choice was made.

It is written in plain English. Every technical term is explained the first time it appears and again in the glossary in Section 10. If a term is still unclear, that is a fault in this document; please report it so it can be fixed.

Why does this document exist? Colouring Ghana is part of a research programme. Research must be reproducible (someone else can rebuild it), traceable (every part links back to the reason it exists), and accountable (it is clear who decided what, when, and why). The features described here are software, but the standard for documenting them is the research standard. The technical companion documents are the Product Requirements Document (PRD) and the set of Architecture Decision Records (ADRs) kept in the code repository; this document is their plain-English mirror and should be updated whenever they change.

### Structure

- Section 2 states the problem. Section 3 says how the decisions were reached. Section 4 describes what will be built, in one page. Section 5 lists the principles every decision follows.
- Section 6 lists the five real questions the platform must be able to answer; they drove almost every decision.
- Section 7 is the heart of the document: twenty-eight decisions, each with the alternatives considered and the reasons.
- Section 8 records the five broad approaches considered at the start. Section 9 lists what is not yet decided and what is deliberately postponed. Section 10 is the glossary. Section 11 is the decision log table.

## 2. The problem in plain words

Colouring Ghana collects information about buildings — their use, age, size, materials, condition and more — from the public and from partners, and shows it on a map that anyone can explore and download. What it cannot do today is answer questions. A planner who wants to know how many houses in poor condition sit within a flood zone has to download the data and use specialist software. Most of the people the platform is meant to serve do not have that software or the training to use it.

The goal is to let anyone ask such questions directly — by clicking, by typing a question in ordinary language to an AI assistant, or, for specialists, by writing code — and get back a number, a map and a dataset they can download.

Three facts about the Ghanaian context shape everything that follows:

- **Connectivity.** Planners in about five assemblies told the product owner that unreliable or absent internet — even inside Kumasi — is the main obstacle to using any web platform. The system must work offline.
- **Privacy.** Planners and researchers hold sensitive datasets (proposed developments, hazard maps, boundaries). Any data a user brings to the platform must never leave their own device.
- **Data quality.** The building data is crowdsourced, so many fields are blank. An honest answer must always say how much of the data it is based on.

## 3. How these decisions were made

The decisions were reached in a structured dialogue on 15 and 16 September 2026 between the product owner and an AI design assistant (Claude, by Anthropic), used as a planning aid. The method was:

1. First, all the options were laid out without judgement: five broad architectural approaches, and the separate choices within each (where computation runs, how users express questions, how data and maps are delivered, how the AI assistant works, and how the system is governed). These are recorded in Section 8.
2. Second, the assistant asked the product owner a sequence of questions — one thread at a time, in the manner of the Socratic method — each chosen to eliminate the largest remaining set of options. The product owner's answers are the source of every decision in Section 7. Where the product owner declined to make a choice (for example, refusing to rank the audiences), that refusal was itself treated as a decision with consequences.
3. Third, the resulting decisions were written into the PRD, this document, and the documentation rules for the codebase.

Names and roles of the people who participated should be recorded here before this document is circulated: `_______________________`.

This document should be read as a record of reasoning, not a promise that every choice is final. Where a decision is later reversed, the original is kept and marked as superseded, with a link to its replacement, so that the history of reasoning is never lost.

## 4. What will be built, in one page

A visitor opens Colouring Ghana in a web browser. The map appears quickly, drawn from small pre-made map pieces ('tiles') that can be recoloured instantly. The visitor can ask a question in one of three ways:

- **By clicking:** a side panel (the 'builder') lets them choose an area, filter buildings, draw a distance zone, relate buildings to a boundary or flood zone, group and count, and choose what to see.
- **By asking:** an AI assistant turns a plain sentence into the same set of steps, shows them, and lets the visitor run or edit them.
- **By coding:** specialists can write database queries directly.

All three produce the same thing — a 'query plan' — and the same engine runs it, inside the visitor's own browser. The server does not run queries; it publishes timestamped copies of the data that the browser fetches in small pieces, only for the area asked about.

The answer is always a number, a map and a downloadable dataset, and every answer states the time the data is 'as of' and how complete the underlying data is: 'Of 41,000 residential buildings in the flood zone, condition is recorded for 6,200; of those, 1,900 are recorded as poor.'

If a visitor loads their own file (a proposed road, a ward boundary), it stays in their browser; the platform never receives it. If they will be somewhere without internet, they can download a 'pack' for their district — map, data, boundaries, definitions — and everything except the AI assistant keeps working. Packs are ordinary files and can be shared by USB stick in a training room.

The AI assistant runs on a model the project hosts itself, so it costs nothing per question and can be offered to anonymous visitors. It sees only the question, the data definitions, the numbers that come back, and — with explicit permission — the column names of a loaded file. It writes plans, never code, and it says plainly when a question needs something the platform does not do.

## 5. The principles every decision follows

| Principle | In plain English |
|---|---|
| P1 Privacy by construction | Data a user loads never leaves their browser. This is enforced by how the system is built, not by a policy. |
| P2 Browser-first execution | One engine, in the visitor's browser, does all the analysis. The server delivers data; it does not run queries. |
| P3 One plan, three doors | Clicking, asking and coding all produce the same query plan. Capabilities are built once. |
| P4 Every answer has a denominator | No number without 'out of how many, and how many of those are recorded'. |
| P5 Every answer is 'as of' | Every result carries the time of the data it was computed from. |
| P6 Honest capability boundary | The assistant says what it cannot do instead of improvising. |
| P7 Offline is a first-class mode | Analysis, maps and downloads work without internet once a pack is loaded. |
| P8 Ghana first, core later | Prove it here; then share the portable parts with other Colouring Cities platforms. |
| P9 Everything is documented | Every decision, alternative, tool and implementation is written down. |

## 6. The five questions the platform must answer

The product owner supplied five real, practical questions, one for each kind of user. They are the acceptance test for Version 1: the platform is finished when all five can be answered, by clicking and by asking. They also drove the decisions: once each question was broken into steps, it became clear that the same ten operations answer four of them, and that one (the researcher's original question about statistical relationships) needs something the platform will not do in Version 1.

| Who | Question | What the platform has to do | Extra data needed |
|---|---|---|---|
| MMDA officer (e.g. Kumasi Metropolitan Assembly) | How many residential buildings in my district are in the flood-prone zone and were recorded as being in poor condition, and which electoral areas have the most? | Pick the district; keep residential buildings in poor condition; keep those inside the flood zone; count by electoral area; rank. | Flood zones; electoral areas |
| Planner | Within 500 m of the proposed new market site, what is the mix of building heights and construction materials, and how does it compare to the rest of the sub-metro? | Take the drawn site; draw a 500 m zone; tabulate storeys against materials; do the same for the sub-metro; show side by side. | Sub-metro boundaries |
| GIS researcher (revised) | Which neighbourhoods have the highest concentration of buildings that are more than 30 years old, have poor structural condition, and are within 200 metres of a major road? | Keep buildings over 30 years old in poor condition; draw 200 m zones along major roads; keep buildings inside; count and share by neighbourhood; rank. | Major roads; neighbourhoods |
| GIS researcher (original) | Is there a statistically meaningful relationship between building age and current structural condition, controlling for construction material, across Accra? | Not supported. The assistant says so and offers a clean downloadable dataset of age, condition and material for Accra, with completeness counts, for analysis in R or Python. | — |
| Student | Which neighbourhoods have the highest share of buildings with no recorded connection to piped water or a paved road, and are those the same neighbourhoods with the oldest housing stock? | Count blanks for water and road by neighbourhood; rank; compute typical age by neighbourhood; rank; compare the two rankings. | Neighbourhoods |
| Resident | How many buildings on my street have been added or edited in the last six months, and which attributes are still blank for most of them? | Pick the street; keep buildings edited in the last six months; count; report which attributes are blank for most. | Street outlines; anonymised edit summary |

## 7. The decisions

Each decision below follows the same pattern: the decision itself; what it means in plain English; the alternatives considered and why they were not chosen; the reasons; what it depends on; and what it rules out or postpones. Decisions are numbered D1 to D28 (D18–D27 are user-interface decisions; D28 is a delivery decision) and correspond to Architecture Decision Records ADR-001 to ADR-018 in the code repository (some ADRs cover more than one decision here; the mapping is in Section 11).

### D1 — Serve all five kinds of user equally in Version 1

**Status:** Accepted · **Date:** 15 September 2026

**The decision.** Version 1 is built for five groups at once, with none treated as more important: GIS researchers (who may or may not know spatial SQL), planners (who know GIS ideas but not SQL), MMDA officers (staff of Metropolitan, Municipal and District Assemblies), students, and ordinary visitors or residents.

**What it means in plain English.**

There is no single 'typical user'. A researcher who wants to write code, a planner who wants to click, and a resident who wants to type a question must all be able to ask the platform the same thing.

This is more than a statement of inclusiveness: it forces the platform to offer several different 'doors' into the same capability (see D5).

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Pick one primary audience | Design a single interface for, say, researchers (a code console) or planners (a click-only tool) and treat others as secondary. | The product owner judged all five groups to be important now. A platform for open public data that only serves specialists would not meet the programme's mission. |
| Phase the audiences | Serve researchers first, then planners in a later release, and so on. | The five groups need the same underlying capabilities; separating them in time would mean building the same thing several times in different clothes. |

**Why we chose this.**

- The product owner explicitly asked not to rank the audiences.
- Once we looked at the real questions each group asks (see Section 6), it became clear they all need the same small set of operations, just expressed differently.

**What it depends on.**

- D5 (one plan, three doors), which is what makes serving everyone affordable.

**What it rules out or postpones.**

- A single-interface product (a pure SQL console or a pure chat box) as the end state.

**Requirements this decision feeds:** PRD Section 4.1; Principle P3.

### D2 — Every question returns three things: a number, a map, and a downloadable dataset

**Status:** Accepted · **Date:** 15 September 2026

**The decision.** For Version 1, the outputs of any query are a headline number, a map showing the result, and a dataset the user can download. Charts are a 'should have' addition.

**What it means in plain English.**

A dataset is a table of the buildings (or areas) that matched the question, with their attributes and shapes, in files that GIS and statistics software can open.

For a researcher, the downloadable dataset is often the real deliverable: they will take it into R or Python to do their own modelling (see D3).

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Add reports and dashboards | Automatically generate written reports or interactive dashboards. | Useful, but not needed for any of the five example questions; kept for a later version. |
| Notebook output | Give researchers a coding notebook inside the platform. | Serves one audience only and does not work offline; the downloadable dataset achieves the same goal more simply. |

**Why we chose this.**

- These three outputs cover what all five groups said they needed.
- They are also what makes an answer checkable: someone else can look at the same map and dataset.

**Requirements this decision feeds:** PRD Section 6.5 (FR-5).

### D3 — A fixed list of ten operations; statistics are out of scope; the assistant says so honestly

**Status:** Accepted · **Date:** 15–16 September 2026

**The decision.** The platform supports exactly ten kinds of operation (choose an area; filter by attribute; draw a buffer; relate buildings to another layer; group and count; compare two groups; rank; filter by recent edits; report completeness; produce outputs). Statistical modelling — regression, tests of significance, measures of spatial clustering — is not supported in Version 1. When asked for it, the assistant must say plainly that it cannot, and offer the clean dataset the person would need to do it elsewhere.

**What it means in plain English.**

An 'operation' is one step in answering a question. 'Buffer' means drawing a zone of a chosen distance around something (for example, everything within 500 metres of a market site). 'Relate to another layer' means asking which buildings fall inside, touch, or are nearest to some other shapes (a flood zone, a road). 'Group and count' means totting up buildings by area or by attribute. 'Completeness' means reporting how many buildings actually have a value recorded for an attribute, as opposed to a blank.

'Regression' and 'significance' are statistical methods that estimate whether one thing is related to another beyond what chance would produce. They need expert interpretation, and an AI system producing them confidently is the most likely way to publish a wrong result.

'Honestly' means the assistant will not improvise. It will not pretend to compute a statistic it cannot, and it will not quietly substitute a simpler calculation without saying so.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Build a statistics engine | Run a Python or R service on the server that computes regressions and spatial statistics on demand. | Another service to run; does not work offline; and the responsible interpretation of statistical output cannot be automated. The researcher's real need is a clean dataset with completeness counts, which we can provide. |
| Let the AI write any code | Allow the assistant to generate and run arbitrary analysis code. | Impossible to validate; the single biggest source of confident, wrong answers in systems like this. |

**Why we chose this.**

- The five real questions supplied by the product owner (Section 6) all decompose into the same ten operations. Only the statistical version of the researcher's question did not, and the product owner confirmed the dataset-plus-honest-refusal approach was sufficient for it.
- A short, written list of what the platform can do is what makes it possible to check automatically whether an AI-generated plan is allowed.

**What it rules out or postpones.**

- In-platform statistical modelling (deferred to a later version with its own design and ethics review).

**Requirements this decision feeds:** PRD FR-1.2, FR-4.6; Principle P6.

### D4 — Reference geography is curated by the platform, not brought by users

**Status:** Accepted · **Date:** 15 September 2026

**The decision.** Boundaries and features that questions refer to — districts, electoral areas, sub-metros, neighbourhoods, major roads, flood-prone zones, named streets — are loaded and maintained by the Colouring Ghana team as 'reference layers'. District boundaries are already loaded (awaiting release); the flood-zone layer exists but is empty and its data is yet to be loaded.

**What it means in plain English.**

A 'layer' is a set of map shapes with information attached (for example, the outline of each district with its name). A 'reference layer' is one the platform provides for everyone.

When an MMDA officer says 'my district', the platform can only answer if it already knows what a district is and where its edges are. Four of the five example questions depend on such layers.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Users bring their own boundaries | Each user uploads district or neighbourhood shapes when they need them. | Inconsistent definitions between users; unusable by residents and students; defeats offline use. |
| Fetch boundaries from external web services | Call an online map service for boundaries each time. | Needs an internet connection at query time; definitions can change without notice; no control over licensing. |

**Why we chose this.**

- Consistency: everyone's 'neighbourhood' is the same neighbourhood.
- Offline: reference layers can be packaged for download (see D13).
- Accountability: each layer gets a written provenance record — where it came from, its licence, its date, and any definitional choices such as which roads count as 'major'.

**What it depends on.**

- A data-curation workstream that is on the critical path, and decisions on what 'neighbourhood' and 'major road' mean in Ghana (open decisions OD-3).

**Requirements this decision feeds:** PRD Section 6.7 (FR-7); Section 9.

### D5 — One plan, three doors: builder, SQL editor and assistant all produce the same 'query plan'

**Status:** Accepted · **Date:** 15 September 2026

**The decision.** Every question, however it is asked, is turned into the same structured description called a query plan — an ordered list of the ten operations in D3, written in a format a computer can check. A click-and-choose 'builder', a SQL editor for people who write code, and the AI assistant are three ways of producing a plan. One engine runs all plans.

**What it means in plain English.**

A 'query plan' is a recipe card. It says: start with this area; keep only residential buildings in poor condition; keep those inside the flood zone; count them by electoral area; show the top ten; give me a number, a map and a download.

'SQL' is the standard language for asking questions of databases. 'Spatial SQL' adds geography to it. Most people never need to see it; it is offered for those who want it.

The 'builder' is the set of click actions the product owner asked about for offline use. It is not a weaker version of the assistant: both produce the same plans and can do the same things. The assistant's only extras are turning a sentence into a plan, explaining the result in words, and suggesting what to ask next.

Because a plan is a file, it can be saved, shared, re-run later, and inspected by someone checking the work.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Separate systems per audience | A SQL console for researchers, a click tool for planners, a chat box for everyone else, each talking to the database its own way. | Every capability would be built three times and the three would drift apart, giving different answers to the same question. |
| Natural language only | Only the chat assistant. | Does not work offline; cannot be inspected or corrected by a planner; excludes researchers who want precision. |
| SQL only | Only a code console. | Excludes four of the five audiences. |

**Why we chose this.**

- Build each capability once; every door benefits.
- A plan produced by the AI can be opened in the builder, read, and edited before it is run — which is how a person stays in control of what the AI proposed.
- Plans are the unit of reproducibility: plan plus data snapshot equals the analysis.

**Requirements this decision feeds:** PRD Sections 6.1–6.4; Principle P3.

### D6 — Data that a user loads never leaves their browser

**Status:** Accepted · **Date:** 15 September 2026

**The decision.** If a user loads their own file (for example, the outline of a proposed road, or a ward boundary the platform does not have), that file stays on their device. It is never sent to the Colouring Ghana server. The one thing that may be sent — with the user's knowledge — is the rough rectangle covering the file's area, so that the platform can fetch the buildings nearby. The user may instead choose an area from the platform's list to avoid even that.

**What it means in plain English.**

A 'browser' is the program (Chrome, Safari, Firefox) in which the platform runs on the user's own phone or laptop. A 'server' is the computer, run by the project, that everyone connects to.

'Never leaves the browser' is a promise that can be tested: we can watch every message the browser sends and confirm none contains the user's shapes or rows.

A 'bounding box' is the smallest rectangle that contains a set of shapes. Sending it tells the server roughly where the user's data is, but not what it looks like.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Upload to a temporary server table, delete afterwards | Send the file up, run the analysis on the server, delete the file. | Requires trusting the server, its logs and its backups; a promise that cannot be verified by the user. |
| Encrypted upload | Send the file in encrypted form. | The server must decrypt it to analyse it, so the privacy gain is illusory. |
| Trust-based policy only | A written policy that uploads are not kept. | Policy is not proof. Local data privacy was stated as crucial. |

**Why we chose this.**

- Local data privacy was set as a hard constraint by the product owner.
- Planners and researchers hold sensitive datasets; a technically verifiable guarantee is what will let them use the platform at all.

**What it depends on.**

- D7: analysis must run in the browser, because the user's data cannot go anywhere else.

**What it rules out or postpones.**

- Any server feature that accepts uploaded analysis layers.

**Requirements this decision feeds:** PRD Section 6.6 (FR-6); NFR-3.1; Principle P1.

### D7 — All analysis runs in the visitor's browser; the server only delivers data

**Status:** Accepted · **Date:** 15 September 2026

**The decision.** One analytical engine, running inside the browser, executes every query plan. The server does not run user queries. Its analytical job is to publish timestamped copies of the building data ('snapshots'), map tiles and reference layers that the browser fetches in small pieces.

**What it means in plain English.**

The 'engine' is a small database that runs inside the web page. We use DuckDB-WASM: DuckDB is an analytical database; WASM (WebAssembly) is the technology that lets such software run inside a browser at near-native speed. A spatial extension gives it geographic functions such as buffers and overlays.

For a district like Oforikrom (21,200 buildings, about 100 attributes each), the data is a few megabytes — comfortable to fetch and analyse on a phone. For larger areas, the browser fetches only the part it needs (see D12), and every query starts by choosing an area.

A 'snapshot' is a copy of the database taken at a known moment, with that moment recorded. Answers say 'as of' that moment.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Run queries on the server (PostGIS) | Send each query to the server's database and return the answer. | Incompatible with D6 for uploaded data; every query is server load and risk; does not work offline; every user's question and location passes through the server. |
| Two engines: server when there is no upload, browser when there is | Use the server for speed when possible, the browser only when privacy demands it. | Two systems to keep in perfect agreement, or the same question gives different answers depending on whether a file was loaded. At Version 1 data sizes the server engine buys nothing. |
| External GIS server (GeoServer, QGIS Server) or Python service | A separate analysis service on the server. | Same objections as server-side execution, plus another service to run. |
| Notebooks (Jupyter) | A coding notebook environment. | Serves researchers only; heavy; offline-hostile. |

**Why we chose this.**

- The privacy rule (D6) requires browser execution for uploads; making it the only engine keeps behaviour identical for everyone.
- Data volumes fit: the pilot is 21,200 footprints; Greater Kumasi will be hundreds of thousands, but no example question is Kumasi-wide — they are scoped to a district, a sub-metro, a buffer or a street.
- Zero server load per query: a thousand planners running analyses at once cost the server nothing.
- It makes offline use nearly free (D13) and makes a SQL editor safe, because there is no server to protect from user code.
- Reproducibility: the plan plus the snapshot is the whole analysis.

**What it rules out or postpones.**

- Server-side execution for national-scale totals, until the data footprint requires it; the plan format is designed so this can be added later without changing the product.

**How it will be implemented (tools, in plain terms).**

- DuckDB-WASM with its spatial extension in the browser; Turf.js or geos-wasm (browser geometry libraries) for any operation DuckDB lacks; a 'compiler' that turns plans into engine instructions; a 'validator' that checks plans before they run.

**Requirements this decision feeds:** PRD Section 6.1 (FR-1); NFR-2.4; Principle P2.

### D8 — Every answer carries its denominator, its completeness, and the time it is 'as of'

**Status:** Accepted · **Date:** 15–16 September 2026

**The decision.** No count, share, map or download is shown without stating how many buildings it was drawn from, how many of those actually have the relevant attribute recorded, and the date and time of the data snapshot.

**What it means in plain English.**

Colouring Ghana's data is crowdsourced, so many attributes are blank for many buildings. 'No recorded connection to piped water' means the field is empty — not that the building has no water. Reporting '1,900 buildings in poor condition' without saying 'out of 6,200 whose condition is recorded, among 41,000 in the zone' would mislead an official.

The 'as of' time is the moment the snapshot was taken. The product owner asked for feedback of the form 'as of [date, time], [answer]'. It is central for offline users, whose data may be days or weeks old.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Show only the headline number | Present the count and nothing else. | Misleading with incomplete data; unacceptable for public decision-making. |
| Put completeness in a footnote or tooltip | Available, but hidden by default. | Hidden caveats are ignored; the second number is part of the answer, not a caveat. |

**Why we chose this.**

- Honesty about data quality is what makes crowdsourced data usable by government.
- The timestamp makes every result reproducible and every offline pack self-describing.

**Requirements this decision feeds:** PRD FR-5.5, FR-8.2, FR-10.6; Principles P4, P5.

### D9 — The AI assistant: an open-weight model we host; it sees only what it needs; it writes plans, not code

**Status:** Accepted · **Date:** 16 September 2026

**The decision.** The assistant uses an 'open-weight' language model run on infrastructure the project controls. It receives the user's question, the platform's data definitions, and — only after the user explicitly approves — the column names, types, row count and shape type of an uploaded layer. After a query runs, it may receive the resulting numbers (counts, tables) so it can explain and chart them, with all geometry removed. It never receives rows or shapes of uploaded data, individual building records, or contributor identities. Its output is a query plan, which is checked before it runs and shown to the user. A user may optionally point the assistant at a model service of their own choosing, using their own account.

**What it means in plain English.**

A 'language model' is the AI software behind chat assistants. 'Open-weight' means the model's trained parameters are published, so we can run it on our own computer rather than sending data to a company's service. 'Hosting' it means running that computer (it needs a graphics processor, or GPU, to be fast).

'Drawing the result on the map' is not something the model does. The model writes, as part of the plan, an instruction like 'highlight matching buildings and shade electoral areas by count'; the browser draws it from data the model never saw.

'Approval' is a small dialog: 'The assistant will see these column names and types, 340 rows, polygon shapes. Nothing else. Allow?' Once per layer.

A 'validator' checks each plan against the written list of allowed operations and the known layers and attributes. If the model makes a mistake, the plan fails loudly rather than producing a quietly wrong count. Safety comes from the checker, not from the model being clever.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Paid hosted model service (e.g. via an API) | Send questions to a commercial AI provider and pay per use. | Cost grows with every anonymous visitor and is unbounded without caps; the question and metadata leave the project's control; the provider's data policy applies. |
| OpenRouter (a broker for many models) | Let users pick any model through one service; no hosting to manage. | Still paid per use (the provider's price plus a margin). Some 'free' models come with rate limits and terms that may allow logging or training on requests — exactly what a privacy-focused platform must avoid. And plan quality would vary with models we have never tested. Kept as an optional 'bring your own key' path for researchers who accept the trade-off. |
| A small model inside the browser | Run a tiny AI model on the user's device, offline. | Current small models are not reliable enough at writing correct plans. Revisit later. |
| Text-to-SQL | Let the model write database code directly. | Much harder to check; spatial SQL is where models make subtle mistakes (units, projections). Plans are checkable; code is not. |
| A free-form 'agent' with tools | Let the model call many tools and decide for itself. | Less predictable; harder to explain to a public official why an answer is what it is. |

**Why we chose this.**

- Predictable, fixed cost makes it affordable to offer the assistant to anonymous visitors (D10).
- Data stays under project control, consistent with D6.
- Plans plus a validator give a safety property we can test, and let every AI answer be opened in the builder and corrected.

**What it depends on.**

- Choosing a model that reliably produces structured output (a plan in a fixed format), and the hardware to serve it (open decision OD-1).

**What it rules out or postpones.**

- The assistant executing anything itself, or generating code that executes.

**Requirements this decision feeds:** PRD Section 6.4 (FR-4); NFR-3.2.

### D10 — The assistant is available to anonymous visitors, keeps no history, and is rate-limited per session

**Status:** Accepted · **Date:** 16 September 2026

**The decision.** Anyone can use the assistant without an account. The server stores no conversation history; the conversation lives only in the user's browser tab, and the user can download it. Limits on how often the assistant can be used are applied per browser session, not per internet address. Saved chat history for logged-in users is a candidate for Version 2.

**What it means in plain English.**

'Rate limiting' means restricting how many requests one user can make in a period, to keep the service available to all. An 'IP address' is the number that identifies an internet connection; a whole office or training room usually shares one. Limiting by IP would lock out a room of 50 planners after the first few questions, so we limit by a token each browser receives when it loads the page.

Because the model is self-hosted, each question has no per-use fee. But the computer serving it can only handle so many at once, so there is a queue, and the screen shows the user's place in it — with the builder always available as the no-wait alternative.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Require login | Only registered users may use the assistant. | Excludes residents and students; unnecessary when there is no per-use cost. |
| Store conversation history on the server | Keep chats so users can return to them. | Personal data to protect and retain; not needed in Version 1. Offered later for users whose work requires it. |
| Per-IP rate limits | Standard practice for public services. | Breaks the training-room scenario the product owner described. |

**Why we chose this.**

- No per-query cost removes the usual reason to gate an assistant behind accounts.
- Storing nothing is the simplest privacy posture.
- Training rooms are a real deployment scenario in Ghana.

**Requirements this decision feeds:** PRD FR-4.8, Section 6.12 (FR-12); NFR-2.2.

### D11 — Replace the current map technology: MapLibre with vector tiles instead of Leaflet with Mapnik raster tiles

**Status:** Accepted · **Date:** 16 September 2026

**The decision.** The map moves from Leaflet drawing pre-rendered picture tiles (made by a program called Mapnik) to MapLibre GL drawing 'vector tiles'. The base map comes from PMTiles files generated nightly; when online, a live tile service may add the newest edits on top. Query results are drawn in the browser from local data. Mapnik is retired once the new map matches the old one feature for feature.

**What it means in plain English.**

Map 'tiles' are the small squares a web map is assembled from. 'Raster' tiles are pictures — once drawn, they cannot be restyled. 'Vector' tiles carry the shapes themselves, so the browser can colour and highlight them instantly, which is exactly what showing a query result needs.

Mapnik is the software that currently draws the picture tiles on the server; the product owner reports it is slow. Leaflet and MapLibre are the two browser map libraries; MapLibre is built for vector tiles and large numbers of shapes.

'PMTiles' is a way of storing all of an area's tiles in one file that can be read in small pieces without a tile server. It also makes offline maps possible (D13).

The product owner considered using GeoParquet for rendering. GeoParquet is the right format for the analysis data (D12), but it is not a tiling scheme: a visitor panning across all of Ghana cannot be handed the whole country as one file. Tiles serve browsing; GeoParquet serves analysis; for a district-sized area the same GeoParquet file can also be drawn directly.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Keep Leaflet, overlay results as GeoJSON | Minimal change to the existing map. | Leaflet handles tens of thousands of restyled shapes poorly; still dependent on slow Mapnik for the base. |
| Keep Mapnik, just add a cache | Speed up the existing pipeline. | Does not solve client-side restyling or offline; keeps a slow component. |
| Live vector tiles only (Martin or pg_tileserv) | Serve tiles directly from the database on demand. | Needs a connection at all times; no offline. Retained as the optional 'fresh edits' layer on top of PMTiles. |
| GeoParquet only | Render everything from the analysis files. | Not a tiling scheme; cannot support browsing the whole country. |

**Why we chose this.**

- Rendering speed was an explicit pain point.
- Query results must be drawn and restyled instantly in the browser.
- PMTiles are what make offline maps possible.
- This is the part of the work `colouring-core` will find hardest to adopt, and the product owner accepted that trade-off under 'Ghana first, core later' (D15).

**What it depends on.**

- A written parity checklist so that existing behaviour (colour schemes, legends, selecting and editing buildings) is preserved.

**Requirements this decision feeds:** PRD Section 6.9 (FR-9); NFR-1.4, NFR-1.5.

### D12 — Building data is published as one spatially addressable snapshot, plus downloadable area packs

**Status:** Accepted · **Date:** 16 September 2026

**The decision.** The server exports the buildings table as a GeoParquet file sorted so that buildings near each other are stored near each other, in blocks with recorded bounding boxes. The browser reads only the blocks that overlap the area of a query. For offline use, the same data is pre-cut into 'packs' per district, together with tiles and reference layers.

**What it means in plain English.**

'GeoParquet' is a file format for tables of geographic data. It stores data by column, so the browser can fetch only the attributes a question needs, and in blocks ('row groups') that each record the rectangle they cover.

A 'range request' lets the browser ask a web server for just part of a file — 'bytes 4,000,000 to 4,300,000' — which is how it reads only the relevant blocks. A buffer around a market site may need a few hundred kilobytes out of a file that is gigabytes nationally.

The product owner asked what happens when a user pans or zooms to a new area. Browsing is served by tiles (D11) and works everywhere; analysis fetches whatever blocks the query area needs, wherever it is. A drawn buffer that straddles two districts simply reads blocks from both.

A 'pack' is a bundle for one area: tiles, the building data with all attributes, reference layers clipped to the area, the data definitions, and a manifest with the 'as of' time and checksums (fingerprints that prove the files are intact). A district pack should be tens of megabytes, not hundreds.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Fixed per-district files only | One file per district; queries limited to one district. | Queries do not respect district boundaries once users can draw shapes. Kept as the packaging for offline, not the only path. |
| A query service returning results per request | The server assembles data for each query. | Server work per request; poor under concurrency; no offline. |
| Download everything | Each user fetches the whole dataset. | Fine for 21,200 buildings, impossible for Greater Kumasi on a mobile connection. |

**Why we chose this.**

- Tiny transfers per query on poor connections.
- Static files are the most concurrent thing a web server can serve; no per-request computation.
- Packs and the live snapshot are the same bytes, packaged differently — one export pipeline.

**What it depends on.**

- Choice of sort order and block size (open decision OD-6); pack size cap and update strategy (OD-2).

**How it will be implemented (tools, in plain terms).**

- Nightly export from a read replica (a copy of the database used for reading so exports never slow down contributors); static hosting with range-request support, ideally behind a CDN (a network of servers that keeps copies close to users).

**Requirements this decision feeds:** PRD Section 6.8 (FR-8), 6.10 (FR-10); NFR-2.3, NFR-2.5.

### D13 — Offline analysis is a first-class mode; the assistant needs a connection in Version 1

**Status:** Accepted · **Date:** 16 September 2026

**The decision.** The platform is an installable web app (a 'PWA') that can store downloaded area packs on the device. With a pack loaded and no internet, the map, the builder, the SQL editor, every output and every download work. A pack can also be loaded from a file passed by USB stick or over a room's local network. The assistant is disabled offline; plans it wrote while online can still be run.

**What it means in plain English.**

A 'PWA' (Progressive Web App) is a website that installs like an app and keeps working without a connection by storing its files locally. A 'service worker' is the browser component that makes this possible.

The product owner visited planners in about five MMDAs; the main complaint was unreliable or absent internet, even within Kumasi. Offline capability is therefore a requirement, not a nicety.

For a training room of 30–50 planners sharing one connection, the practical answer is to download a pack once and share it as a file. This needs no special software beyond the platform's 'load pack from file' feature.

The 'as of' date of the pack is always visible, and when a connection returns the platform says whether a newer pack exists.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| No offline support | Standard web platform. | Fails the most-cited real-world obstacle. |
| A native mobile/desktop app | Separate installable programs. | Much more to build and maintain; a PWA achieves the goal with one codebase. |
| An 'MMDA box' now | A small local server in each planning office running the model and serving packs. | A real option for Ghana, but a hardware and support commitment; deferred to Version 2 after a pilot. |
| An AI model in the browser for offline assistant | Ship a small model with the app. | Not reliable enough today (see D9). |

**Why we chose this.**

- The browser-first architecture (D7) makes offline nearly free: the engine, plans and rendering are already on the device.
- Packs are plain files with a timestamp, so distribution can be as simple as a USB stick.

**What it rules out or postpones.**

- Offline use of the assistant in Version 1 — accepted explicitly by the product owner.

**Requirements this decision feeds:** PRD Section 6.10 (FR-10), FR-4.9; Principle P7.

### D14 — Offline contribution (editing buildings offline, syncing later) is a separate project

**Status:** Accepted in principle; scoped separately · **Date:** 16 September 2026

**The decision.** Users should eventually be able to edit building information offline and have it uploaded when a connection returns, with a gentle, non-nagging reminder while edits are waiting. This is wanted, but it is not part of the analytics Version 1. It will have its own requirements document.

**What it means in plain English.**

'Syncing' means sending the edits made offline to the server later. The difficulty is not queuing them; it is what to do when someone else changed the same building attribute in the meantime ('conflict resolution'), and how that fits the core platform's edit history and verification workflow.

The intended experience: a quiet badge such as '7 edits waiting to sync', a reminder on each visit, and, on reconnection, the platform flags any edit that clashes with a newer change rather than silently overwriting either.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Include it in analytics Version 1 | Build both together. | It is the single largest item in the whole programme and would delay analytics. It also touches parts of the core platform we are not otherwise changing. |

**Why we chose this.**

- Contribution already requires an account in the core platform, and each edit is a small, self-contained change with a log entry — so the queuing part fits naturally later.
- The conflict semantics deserve their own design conversation.

**Requirements this decision feeds:** PRD Section 10.2.

### D15 — Ghana first, then contribute to the core platform

**Status:** Accepted · **Date:** 16 September 2026

**The decision.** Build and prove the analytical platform on the Colouring Ghana instance. Once it works very well, contribute the portable parts to `colouring-core` so other CCRP countries can use them.

**What it means in plain English.**

'colouring-core' is the shared codebase that every Colouring Cities platform is copied ('forked') from. Contributing back means offering our changes to be merged into that shared codebase.

Portable parts: the plan format and its compiler, the snapshot exporter and format, the pack format and offline layer, the engine integration, and the map migration. Ghana-specific parts: the reference layers, the data definitions, the assistant's prompts and grounding material, and the privacy notice.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Build directly in colouring-core | Develop as a core feature from the start. | Slower; requires consensus with all partners on every choice; the map-stack change would be contentious before it is proven. |
| Never contribute | Keep it Ghana-only. | Contrary to the programme's purpose of shared, interoperable platforms. |

**Why we chose this.**

- Speed and the freedom to be opinionated while proving the idea.
- Separating portable from Ghana-specific code from the start keeps the later contribution feasible.

**Requirements this decision feeds:** PRD Section 8; Principle P8.

### D16 — Handling many users at once: no server work per query, static delivery, and a sized queue for the assistant

**Status:** Accepted · **Date:** 16 September 2026

**The decision.** Queries cost the server nothing because they run in browsers. Data and packs are static files. The only shared bottleneck is the AI model, which is sized and load-tested for the named scenario of 30–50 planners in one training room, with a visible queue and the builder as the no-wait alternative. Exports run from a read replica so they never block contributors.

**What it means in plain English.**

'Concurrency' means many people using the system at the same time. 'Load testing' means simulating that before it happens for real.

In a training room the real bottleneck is often the room's own internet connection, not the project's server: 50 people each downloading a 40 MB pack is 2 GB through one link. Hence packs shared as files (D13) and rate limits per session rather than per shared address (D10).

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Per-query server execution with connection pools | The conventional web-GIS approach. | Every query competes for the database; concurrency becomes a scaling problem instead of a non-problem. |
| Unlimited assistant access | No queue or limits. | A single GPU serves a finite number of requests; without a queue, everyone experiences failures rather than a short wait. |

**Why we chose this.**

- The architecture removes the usual bottleneck by design; what remains can be measured and provisioned.

**What it depends on.**

- Load test before the first training session; hardware chosen to meet the target of 50 concurrent assistant requests completing within 30 seconds at worst.

**Requirements this decision feeds:** PRD Section 7.2 (NFR-2).

### D17 — Questions about recent edits are answered only from an anonymised summary of the edit log

**Status:** Accepted · **Date:** 16 September 2026

**The decision.** The platform's record of who changed what is never exposed for analysis. Instead, the export process reads a summary view that contains, per building and attribute and time period, only counts of additions and edits and the time of the last edit — no contributor names or identifiers. Database permissions enforce that the export can read nothing else.

**What it means in plain English.**

The 'edit log' is the platform's history of contributions. An 'anonymised view' is a derived table with all identifying information removed before anyone can query it.

This is what allows a resident to ask 'how many buildings on my street were edited in the last six months' without anyone being able to learn who edited them.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Expose the raw edit log | Let queries read the full history. | Reveals contributor identities and behaviour; unacceptable. |
| Do not support edit-recency questions | Drop the resident's question. | It is one of the five acceptance questions and a useful measure of platform activity. |

**Why we chose this.**

- Contributor privacy is a hard line; a technically enforced view is stronger than a policy.

**Requirements this decision feeds:** PRD Section 6.13 (FR-13); NFR-3.4, NFR-3.5.

### D18 — Analysis is a third sidebar mode, with the category tiles kept visible

**Status:** Accepted · **Date:** 16 September 2026

**The decision.** Alongside the existing View and Edit modes, the sidebar gains an Analyse mode. The twelve category tiles stay visible above it; the panel beneath them shows Build and SQL tabs, the plan card, and the results summary. Web addresses follow the existing pattern (/analyse/… carries a plan, while /view/… continues to carry the selected building's ID).

**What it means in plain English.**

Today, clicking a category tile swaps the lower part of the sidebar to that category's content. Analyse mode uses the same behaviour, so nothing new appears on screen until a person asks for it.

Keeping the tiles visible means a planner can recolour the map by 'Retrofit & Condition' while a query is open, rather than having to leave the analysis to look at the data.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| A second panel on the right of the map | Categories on the left, analysis on the right, map in between. | Two panels plus results is heavy on a laptop and impossible on a phone, where it would collapse to a bottom sheet anyway. Keeping the tiles above the analysis panel gives most of the benefit. |
| A thirteenth tile called 'Analyse' | Add it to the grid. | The tiles are data categories; analysis is not one. It would misdescribe what it is. |
| A Menu item only | Reach analysis from the hamburger menu. | Cheapest, and least discoverable — a real cost for residents and students. |
| A separate analytics page | Leave the map and go to a new screen. | Breaks the map-centred experience the platform is known for. |

**Why we chose this.**

- It reuses the sidebar's existing mode behaviour and routing conventions.
- It keeps the structured, offline-capable door (the builder) in the most prominent place on the screen.

**Requirements this decision feeds:** PRD FR-14.1.

### D19 — The AI assistant lives in a floating bubble at the bottom-left of the map

**Status:** Accepted · **Date:** 16 September 2026

**The decision.** The assistant is a floating bubble at the bottom-left of the map, below the search box and away from the legend. Clicking it opens a panel that grows upward over the map. When offline, the bubble is greyed out with the message 'needs a connection'. On a phone, it opens as a bottom sheet.

**What it means in plain English.**

A 'bubble' is the small round button many websites use for chat. An 'anchored panel' is the chat window that opens from it and stays attached to it.

Greying the bubble offline is deliberate: the platform must never appear to promise the assistant when only the builder can deliver.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Bottom-right of the map | The conventional position for chat bubbles. | The legend, the attribution notice and the Colouring Ghana badge already occupy that corner; the product owner preferred the left, which also stacks the two text-entry points (search, ask) on the same side. |
| An Ask tab inside the sidebar only | No bubble; the assistant is a tab in Analyse mode. | Loses the ability to ask a question from View mode about what you are looking at without switching modes. |
| A centred overlay | A prominent box in the middle of the screen. | It covers the map, which is the thing the person is asking about. |

**Why we chose this.**

- A bubble lets a resident ask about the building or street they are looking at without leaving View mode.
- It gives the online and offline doors different, honest appearances.

**Requirements this decision feeds:** PRD FR-14.2.

### D20 — The conversation stays where the person typed it; only 'Edit in builder' moves them

**Status:** Accepted · **Date:** 16 September 2026

**The decision.** Everything the assistant produces — the plan card, the Run button, the headline number with completeness and 'as of', and the result cards — appears in the bubble's panel. Running a plan does not move the person into the sidebar. The single hand-off to the sidebar is the plan card's 'Edit in builder' action, which opens Analyse mode with that plan loaded. The sidebar has an 'Ask instead' link that opens the bubble, and no chat of its own.

**What it means in plain English.**

The product owner's objection to an earlier proposal was simple and correct: why type something in one place and have to go somewhere else to press Run? This decision honours it.

There is exactly one chat surface (the bubble) and exactly one structured surface (the sidebar). Neither duplicates the other.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Move the conversation into the sidebar when Run is pressed | Keep all three 'doors' in one sidebar panel for tidiness. | It costs the person their sense of place to buy tidiness for the design. Rejected on the product owner's challenge. |
| Two chats, one in the bubble and one in the sidebar | An Ask tab as well as the bubble. | Nobody should have to wonder which chat is the real one, or whether their conversation followed them. |

**Why we chose this.**

- It matches how people expect chat to behave.
- It maps cleanly onto connectivity: the bubble is the online door, the sidebar is the offline-capable door.
- On a phone it means one sheet whose content swaps, not two competing sheets.

**Requirements this decision feeds:** PRD FR-14.3.

### D21 — The plan card looks the same everywhere and is the hand-off between assistant and builder

**Status:** Accepted · **Date:** 16 September 2026

**The decision.** A plan is shown as a card with a one-line plain-English summary, the steps expanded beneath (collapsible), and the actions Run, Edit in builder, Save and Share. It is rendered identically in the bubble and in the sidebar. A plan built by clicking can be sent to the assistant for an explanation of its result.

**What it means in plain English.**

The summary line is what a resident reads first ('Residential buildings in poor condition inside flood zones, by electoral area'); the steps beneath are the machinery for anyone who wants to check or change it.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Show only the summary, hide the steps | Simpler for residents. | Transparency is the point of plans; hiding the steps by default hides what the AI decided. |
| Show only the steps | Maximum precision. | Unreadable for residents and students at a glance. |

**Why we chose this.**

- One representation means one thing to learn and one thing to test.
- The card is what makes 'edit what the AI proposed' possible.

**Requirements this decision feeds:** PRD FR-14.4; Principle P3.

### D22 — A query result replaces the category colouring on the map

**Status:** Accepted · **Date:** 16 September 2026

**The decision.** When a plan runs, the map enters 'result view': all buildings turn neutral except the matches, which are highlighted, or the boundary areas, which are shaded by the result. The legend in the bottom-right switches to the result. Clicking any category tile restores the category colouring without discarding the plan; a 'Back to result' control re-enters result view. Results are never drawn on top of category colours.

**What it means in plain English.**

'Choropleth' is the term for shading areas (electoral areas, neighbourhoods) by a value, such as a count. Because only one styling is shown at a time, there is never a question of how to overlay a choropleth on building colours.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Overlay results on the category colouring | Outline matches while the underlying colours stay visible. | Lets a GIS user see two things at once, but is harder to read for everyone else, and has no answer for area shading. The product owner chose replacement. |

**Why we chose this.**

- Clarity for the five audiences over density for one.
- A single styling state is simpler to build, test and explain.

**Requirements this decision feeds:** PRD FR-14.5.

### D23 — Clicking a building in result view shows a small popup with the values the plan used

**Status:** Accepted · **Date:** 16 September 2026

**The decision.** In result view, clicking a building opens a small popup on the map listing only the attributes the running plan referred to (for example condition, land use, electoral area), showing 'not recorded' where a value is blank, with an 'Open building' link to the building's full page. The popup's contents are generated from the plan.

**What it means in plain English.**

This keeps the person in their analysis while letting them check individual buildings — and makes data gaps visible one building at a time, consistent with the completeness principle.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Do what a click does today: open the building's details and leave the analysis | No new code. | A resident who clicks a highlighted building would lose their result. |
| Do nothing | Clicks are ignored in result view. | Cheapest, and frustrating for everyone. |

**Why we chose this.**

- The most useful behaviour, and because the popup is generated from the plan it does not need designing per query.

**Requirements this decision feeds:** PRD FR-14.6.

### D24 — Tables and charts are result cards that open full-size in a centred pop-up; there is no results drawer

**Status:** Accepted · **Date:** 16 September 2026

**The decision.** Tables and charts that do not fit the width of the bubble or sidebar are shown as cards — a name, a small preview, the 'as of' stamp, the completeness line, and download formats. Clicking a card opens it full-size in a centred pop-up ('modal') over the map, with download and close; on a phone the pop-up fills the screen. The map itself is never a card.

**What it means in plain English.**

This is the pattern people know from chat assistants, where a generated table or file appears as a card and opens on click. The product owner asked for exactly this.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| A results drawer sliding up over the bottom of the map | A wide strip for tables and charts, collapsible to a thin bar. | More chrome, and a third container to manage on a phone. The card-plus-pop-up pattern needs none of that. |

**Why we chose this.**

- Familiar; one fewer panel; and it makes the downloadable session (D10) trivially the list of cards and their plans.
- The trade-off — the pop-up covers the map — is acceptable because the researcher who needs table and map together has the download.

**Requirements this decision feeds:** PRD FR-14.7.

### D25 — The assistant never assumes a location; it asks, and the answer chips are the consent

**Status:** Accepted · **Date:** 16 September 2026

**The decision.** No information about where the person is looking, or which building they have selected, is sent to the assistant or the server by default. When a question needs a place ('here', 'my street'), the assistant replies with a clarifying question rendered as choices: This view · My location · A district… · Draw an area · A street name…. Picking a choice is what sends the corresponding information — a viewport rectangle for 'This view', a name for a district or street. The assistant's response format therefore has two kinds: a plan, or a clarification.

**What it means in plain English.**

'Consent by action' means there is no separate permission dialog: the person's choice of chip is itself the permission, and the chip says what it will send.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Send the current map view with every question | 'Here' just works. | The server would learn where the person is looking on every question, before any plan is run. |
| Send the selected building | 'This building' just works. | For a resident, the selected building is close to a home address. |
| A default-on 'using current view' chip the person can switch off | Convenient with an opt-out. | Opt-out defaults are rarely noticed; the product owner preferred an explicit question. |

**Why we chose this.**

- The smallest possible disclosure, chosen by the person each time.
- It creates a testable rule: the evaluation set includes questions where the correct answer is a clarification, so a model that guesses a location is marked wrong.

**Requirements this decision feeds:** PRD FR-14.8, FR-4.12.

### D26 — 'My location' is resolved on the device; the person always chooses between a named area and a radius

**Status:** Accepted · **Date:** 16 September 2026

**The decision.** Choosing 'My location' uses the device geolocation feature already built in the development version. The position fix is resolved on the device against the reference layers, and the person is then always shown two options and chooses: the containing named area (street, neighbourhood, electoral area or district), which sends only the area's name; or a radius around the exact point, which sends a small rectangle around the point to fetch nearby buildings and is labelled 'Uses your exact position to fetch nearby buildings'. The assistant never receives coordinates. The accuracy of the fix is shown, and the person confirms the resolved area before the plan runs. Before this is built, the existing geolocation feature must be audited to confirm whether it already sends the fix to the server for any purpose.

**What it means in plain English.**

A device 'fix' is the position reported by the phone or laptop's location service. It is the most sensitive of the location choices because it reveals a home, not a viewpoint.

Resolving it on the device means the platform turns 'latitude/longitude' into 'Ayeduase Road' before anything leaves the browser — and because reference layers are in every pack, this works offline too.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Default to the named area; offer the radius only for distance questions | Simpler; discloses least. | Adds a hidden rule about which questions count as 'distance' questions. The product owner chose to always show both and let the person decide. |
| Send the fix to the server | Simplest to implement. | Contrary to the privacy principle; unnecessary when reference layers are available locally. |

**Why we chose this.**

- Transparency at the moment of choice, with the disclosure stated on the option itself.
- It reuses a feature already built, once its data flow has been confirmed.

**What it depends on.**

- The audit of the existing geolocation feature was completed on 16 September 2026 (PRD FR-14.11): the position fix never leaves the device; it is used only to draw the marker and accuracy circle and is discarded when the map closes. Two indirect exposures were noted and addressed: recentring the map to zoom 19 reveals roughly where the person is (to about 75 metres) to whoever serves the map tiles, so the named-area option does not recentre the map; and clicking a building in View mode sends the clicked point to the server, so in result view clicks are resolved on the device instead.

**Requirements this decision feeds:** PRD FR-14.9, FR-14.11 (audit findings); OD-10 closed.

### D27 — Layers and uploads live in 'Show layer options'; packs in the Menu; status in the header; drawing in the map-corner tools

**Status:** Accepted · **Date:** 16 September 2026

**The decision.** Reference layers (districts, flood zones and so on) and layers the person loads from their own device both appear in the existing 'Show layer options' panel, with the browser-only notice on the upload control. Downloaded packs are managed from the Menu. The online/offline state and the active pack's 'as of' date are shown in the header. Drawing a point, line or area for a query uses a draw tool in the map-corner button stack, started from a builder step or from the 'Draw an area' choice.

**What it means in plain English.**

A flood zone is a layer whether the platform curated it or the person loaded it; putting both in one place means the builder's 'relate to a layer' step offers the same list the map shows.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| A separate 'My data' panel for uploads | Uploads get their own home. | One more place to look; and uploads are layers, so they belong with layers. |
| Pack management inside Analyse mode | Keep offline tools with analysis. | Packs affect the whole view (map and analysis), so they belong with whole-view controls. |

**Why we chose this.**

- Reuses existing panels and conventions; adds no new chrome.

**Requirements this decision feeds:** PRD FR-14.10, FR-6.3, FR-10.3.

### D28 — The map migration is its own project, delivered first, before the analytics work is stacked on it

**Status:** Accepted · **Date:** 16 September 2026

**The decision.** Replacing Leaflet and Mapnik with MapLibre and PMTiles (D11) is delivered as a separate, prerequisite project with its own tracking issue, branch, specification and tickets. It goes into the main codebase first, behind a switch that allows the old and new maps to coexist, and runs in production with the old map available as a fallback until a written parity checklist passes. The analytics work is then rebuilt on top of it. Analytics features that need the new map — result view, drawing results, the building popup in result view, the draw tool, tiles inside packs — wait for it; everything else proceeds in parallel.

**What it means in plain English.**

A 'feature flag' is a switch in the software that turns a capability on or off per environment or per user without changing the code, so the new map can be tested by some people while others keep the old one.

'Parity' means the new map does everything the old one did — category colours, legend, selecting and editing buildings, the location control, layer options — and this is checked against a written list, in production, not assumed.

**What else we considered, and why we did not choose it.**

| Alternative | What it would have meant | Why not |
|---|---|---|
| Keep the migration inside the analytics project | One branch, one release, as first planned. | The migration is valuable on its own (the current map is slow), is the riskiest change for existing users because it touches viewing and editing, and is the part other Colouring Cities partners will examine most closely. Buried in a larger project it would get none of the separate testing, staged release or focused review it needs. |

**Why we chose this.**

- A faster map can reach users months before the analytics does.
- Risk to existing contributors is isolated and released on its own timetable.
- A standalone change is something the shared core codebase can evaluate and adopt.
- Work that does not touch the map — plans, the engine, the builder, data export, reference layers, the assistant — is not delayed.

**What it rules out or postpones.**

- Starting result-view and result-drawing work before the new map has merged.

**Requirements this decision feeds:** PRD Section 6.9 delivery note, FR-9.1, FR-9.5, FR-9.6; Section 13 (E0).

## 8. The five broad approaches considered at the start

Before any questioning began, five coherent ways of building the platform were laid out. This section records them so that anyone reviewing the work can see the full field, not only the winner.

| Approach | In plain English | Outcome |
|---|---|---|
| 1. SQL Playground | Add a query service to the server and a code editor in the browser; the AI helps write code. Quick to build; serves specialists. | Not chosen as the end state. Serves one audience; every query is server load; incompatible with keeping uploaded data in the browser. The code editor survives as one of the three doors (D5). |
| 2. Browser-first analytics | Publish copies of the data; do all analysis in the browser with an embedded database. Cheap to run; handles user files naturally. | Adopted as the way analysis runs (D7), combined with approach 3. |
| 3. Analysis-plan platform | Define a single 'plan' format; offer a click builder, a code editor and an AI assistant that all produce plans. Most work; most durable; portable to other CCRP platforms. | Adopted as the product model (D5). |
| 4. Research workbench | A coding-notebook environment with statistics tools, behind a login, for partner researchers; a lighter tool for the public. | Not chosen for Version 1. Serves one audience; heavy; does not work offline. Statistics deferred (D3). |
| 5. Agentic tool layer | Expose the platform's analysis operations as 'tools' an AI can call, usable from the website and from other programs (desktop AI clients, QGIS). | Deferred. Because plans already define the operations, this becomes a thin addition later. |

## 9. Not yet decided, and deliberately postponed

### 9.1 Open decisions

These must be resolved, and recorded as ADRs, before the milestone they affect. They correspond to OD-1…OD-9 in the PRD.

| Decision to make | Options | Needed before |
|---|---|---|
| Which open-weight AI model, and what computer runs it (OD-1) | A model family and size that reliably produces structured plans; one project-owned GPU machine versus a rented one | Building the assistant (M3) |
| Maximum size of an area pack, and how updates are delivered (OD-2) | A cap per pack; updating only changed blocks versus replacing the whole pack | Building offline packs (M4) |
| What 'neighbourhood' and 'major road' mean, and where the boundaries come from (OD-3) | Ghana Statistical Service units; OpenStreetMap; assembly-supplied data | Data curation (M0) |
| Whether fetching by a file's rough extent is the default, or fetching by a chosen area (OD-4) | Convenience versus the smallest possible disclosure | Uploaded-layer support (M2) |
| Whether live 'fresh edits' tiles are in Version 1 (OD-5) | Martin; pg_tileserv; PMTiles only | Map migration (M1) |
| How the data snapshot is sorted and blocked (OD-6) | Sort-order and block-size choices that trade transfer size against overhead | Snapshot exporter (M1) |
| Granularity of the anonymised edit summary (OD-7) | Per attribute per month versus per edit event | Snapshot exporter (M2) |
| Which browser geometry library covers operations the engine lacks (OD-8) | Turf.js; geos-wasm | Engine integration (M2) |
| Format for downloading a session (plans plus results) (OD-9) | Bundle format and naming | Assistant and outputs (M2) |
| OD-10 — geolocation audit | Closed 16 September 2026: the position fix never leaves the device. See D26 and PRD FR-14.11. | — |

### 9.2 Deliberately postponed (Version 2 candidates)

- **Statistical modelling in the platform** (regression, significance, spatial clustering): needs its own service, its own design and an ethics review of how results are presented.
- **Server-side execution for national totals:** not needed at current data sizes; the plan format allows it later.
- **Chat history and saved plans for logged-in users:** wanted by some users for their work; requires accounts and a retention policy.
- **The 'MMDA box':** a small local server in a planning office that runs the AI model and shares packs over the office network, so the assistant works without internet. A real option for Ghana; pilot with one assembly first.
- **Offline contribution:** editing buildings offline and syncing later, with gentle reminders. Wanted; scoped as its own project (D14).
- **Contribution to colouring-core:** after Version 1 is stable in production and core maintainers have been consulted (D15).

## 10. Glossary

Every technical term used in this document, in alphabetical order. The same glossary is maintained in the code repository (`docs/glossary.md`) and must be kept in step with this one.

| Term | Plain-English meaning |
|---|---|
| ADR (Architecture Decision Record) | A short document that records one decision: the situation, the options considered, the choice made, and why. This document is the plain-English companion to those records. |
| Aggregate / group and count | Totting up buildings by some grouping — by district, by construction material — to get counts, shares or averages. |
| Anchored panel | The chat window that opens from the assistant bubble and stays attached to it, growing upward over the map. |
| Anonymised view | A derived table from which all identifying information has been removed before anyone can query it. |
| API | Application Programming Interface: a defined way for one program to ask another for something over the internet. |
| As of | The date and time of the data snapshot an answer was computed from. Shown on every result. |
| Attribute | A piece of information recorded about a building, such as its number of storeys, construction material or condition. |
| Bottom sheet | On a phone, a panel that slides up from the bottom of the screen; the mobile form of the bubble's panel and the sidebar. |
| Bounding box | The smallest rectangle that contains a set of shapes. |
| Bring your own key (BYOK) | Letting a user connect their own account with an AI provider instead of using the project's model. |
| Browser | The program (Chrome, Safari, Firefox, Edge) on a person's own device in which the platform runs. |
| Bubble (assistant bubble) | The small round button at the bottom-left of the map that opens the AI assistant. |
| Buffer | A zone of a chosen distance around a point, line or shape — for example, everything within 500 metres of a site. |
| Builder | The click-and-choose interface for composing a query plan without writing code. |
| CDN (Content Delivery Network) | A network of servers around the world that keep copies of files close to users so downloads are faster. |
| Checksum | A short fingerprint computed from a file's contents; if the file changes or is corrupted, the fingerprint changes. |
| Chip | A small clickable option (for example 'This view', 'My location') rendered under a clarifying question. |
| Choropleth | Shading areas — electoral areas, neighbourhoods — by a value such as a count. |
| Clarification | The assistant's second kind of answer: a question with a fixed set of options, shown as chips, used when it needs a place, a distance or an attribute value. |
| colouring-core | The shared codebase that every Colouring Cities platform is copied from. |
| Compiler (plan compiler) | The component that turns a query plan into instructions the engine can run. |
| Completeness | For an attribute, how many buildings in scope have a value recorded versus how many are blank. |
| Concurrency | Many people using the system at the same time. |
| Conflict resolution | Deciding what to do when two people have changed the same thing while apart. |
| Consent by action | The person's choice of an option is itself the permission to send what that option says it sends; there is no separate dialog. |
| Cross-tab | A table counting buildings by two attributes at once — for example, storeys against material. |
| Database | Organised storage of data that can be queried. Colouring Ghana uses PostgreSQL with the PostGIS extension for geography. |
| deck.gl | A browser library for drawing very large numbers of shapes quickly on a map. |
| Delta update | Downloading only what has changed since the last download, instead of everything. |
| Denominator | The total an answer is measured against — 'out of how many'. |
| DuckDB-WASM | DuckDB is an analytical database; the WASM version runs inside a web browser. It is the platform's analysis engine. |
| Edit log | The platform's history of who changed what and when. |
| Engine | The software that actually runs a query plan: DuckDB-WASM in the browser. |
| Feature flag | A switch in the software that turns a capability on or off per environment or per user without changing the code. |
| Fix (position fix) | The location reported by a device's location service, with an accuracy estimate. |
| Footprint | The outline of a building as seen from above; the basic shape the platform stores for each building. |
| Fork | A copy of a codebase that is developed separately; Colouring Ghana is a fork of colouring-core. |
| GeoJSON | A common text format for geographic shapes. |
| GeoPackage | A single-file container for geographic data, readable by most GIS software. |
| GeoParquet | A file format for tables of geographic data, stored by column in blocks, so software can read only the parts it needs. |
| GIS | Geographic Information System: software and methods for working with map data. |
| GPU | Graphics Processing Unit: the kind of processor that runs AI models quickly. |
| Grounding | The reference material (definitions, layer lists, metric definitions) an AI assistant is given so its answers are consistent with the platform. |
| Inference server | The program that runs an AI model and answers requests; examples include vLLM. |
| IP address | The number identifying an internet connection; often shared by a whole office. |
| JSON | A simple text format for structured data that both people and programs can read; query plans are written in it. |
| Language model (LLM) | The AI software behind chat assistants. |
| Layer | A set of map shapes with information attached (district outlines, roads, flood zones). |
| Leaflet | The browser map library the platform uses today. |
| Load test | Simulating many simultaneous users before they arrive for real. |
| Local network (LAN) | The network within one building or room, which works without the wider internet. |
| Manifest | A small file inside a pack listing what it contains, its 'as of' time and checksums. |
| MapLibre GL | An open-source browser map library built for vector tiles. |
| Mapnik | The server program that currently draws picture tiles; reported as slow. |
| Martin / pg_tileserv | Programs that produce vector tiles directly from a PostGIS database. |
| MMDA | Metropolitan, Municipal or District Assembly — Ghana's local government units. |
| Modal (pop-up) | A window that opens in the middle of the screen over everything else, used here to show a table or chart at full size. |
| Open-weight model | An AI model whose trained parameters are published, so it can be run on one's own computer. |
| OpenRouter | A commercial service that gives access to many AI models through one account, charging per use. |
| Origin-private file system | Private storage inside the browser for a website's own files; where packs and uploaded layers are kept. |
| Pack | A downloadable bundle for one area — tiles, building data, reference layers, definitions, manifest — for offline use. |
| Parity | The new map doing everything the old one did, checked against a written list. |
| Parity checklist | A written list of everything the old map does, used to confirm the new map does it too. |
| Plan / query plan | The platform's structured description of a question: an ordered list of operations, written in JSON. |
| Plan card | The on-screen form of a plan: a one-line summary, the steps beneath, and the actions Run, Edit in builder, Save, Share. |
| PMTiles | A single file containing all the map tiles for an area, readable in small pieces without a tile server. |
| Popup (map popup) | A small box that opens on the map next to a clicked building, showing the values the plan used. |
| PostGIS | The extension that gives the PostgreSQL database geographic abilities. |
| PRD | Product Requirements Document: the formal statement of what is to be built. |
| Provenance | The recorded origin of a dataset: source, licence, date, processing, limitations. |
| PWA (Progressive Web App) | A website that installs like an app and keeps working without a connection. |
| Range request | Asking a web server for only part of a file. |
| Raster tiles / vector tiles | Raster tiles are pictures; vector tiles carry the shapes themselves and can be restyled instantly. |
| Rate limit | A cap on how many requests one user can make in a period. |
| Read replica | A copy of the database used only for reading, so heavy reads never slow down people writing. |
| Reference layer | A layer the platform provides for everyone, such as district boundaries. |
| Regression / significance test | Statistical methods that estimate whether one thing is related to another beyond chance. Not supported in Version 1. |
| Result card | An inline card for a table or chart, with preview, 'as of' stamp and completeness, that opens full-size in a modal. |
| Result view | The map state after a plan runs: neutral buildings except matches or a choropleth; the legend shows the result. |
| Row group | A block of rows inside a GeoParquet file, with its own recorded bounding box. |
| Schema | The formal description of a data structure — what fields exist and what type each is. |
| Service worker | The browser component that lets a PWA work offline. |
| Session token | A code the browser receives when the page loads, used to identify that session for rate limiting. |
| Shapefile | An older but widespread GIS file format, usually shared as a zip. |
| Sideloading | Installing a file by copying it directly (USB, local network) rather than downloading from the internet. |
| Snapshot | A copy of the data taken at a known, recorded moment. |
| Soak period | A stretch of time a change runs in production, with the old behaviour still available, before it is declared final. |
| Space-filling curve | A way of ordering locations so that things near each other on the map are near each other in a file. |
| Spatial relate / spatial join | Asking which buildings fall inside, touch, or are nearest to some other shapes. |
| SQL / spatial SQL | The standard language for asking questions of databases; spatial SQL adds geographic functions. |
| Structured output | Making an AI model answer in a fixed format (such as a JSON plan) rather than free text. |
| Sync | Sending edits made offline to the server once a connection returns. |
| Tile / tile cache | A small square of map; a cache keeps recently produced tiles so they need not be made again. |
| Turf.js / geos-wasm | Browser libraries for geometry operations. |
| Uploaded layer | Data a user loads from their own device; it stays in the browser. |
| Validator | The component that checks a plan is allowed and well-formed before it runs. |
| Viewport | The part of the map currently visible on screen. |
| WebAssembly (WASM) | Technology that lets full programs run inside a browser at near-native speed. |

## 11. Decision log

| This document | Repository record | Title | Date | Status |
|---|---|---|---|---|
| D1, D2 | ADR-001 | Audiences and outputs | 2026-09-15 | Accepted |
| D3 | ADR-002 | Ten-operation vocabulary; statistics out of scope; honest refusal | 2026-09-15 | Accepted |
| D4 | ADR-003 | Reference geography curated by the platform | 2026-09-15 | Accepted |
| D5 | ADR-004 | One plan format, three front ends | 2026-09-15 | Accepted |
| D6 | ADR-005 | Uploaded layers never leave the browser | 2026-09-15 | Accepted |
| D7 | ADR-006 | Single execution engine in the browser | 2026-09-15 | Accepted |
| D8 | ADR-007 | Denominator, completeness and 'as of' on every answer | 2026-09-15 | Accepted |
| D9 | ADR-008 | Assistant: open-weight, self-hosted, plans only, metadata with approval | 2026-09-16 | Accepted |
| D11, D15 | ADR-009 | Ghana first, core later; MapLibre replaces Leaflet/Mapnik | 2026-09-16 | Accepted |
| D12 | ADR-010 | Spatially addressable snapshot and packs | 2026-09-16 | Accepted |
| D13, D14 | ADR-011 | Offline analysis in V1; offline contribution separate; assistant online-only | 2026-09-16 | Accepted |
| D10 | ADR-012 | Assistant anonymous and stateless; session rate limits | 2026-09-16 | Accepted |
| D17 | ADR-013 | Edit-log analytics through an anonymised view | 2026-09-16 | Accepted |
| D16 | ADR-014 | Concurrency approach | 2026-09-16 | Accepted |
| D18, D19, D20, D21, D27 | ADR-015 | UI: Analyse mode; assistant bubble; conversation stays in place; plan card; placement of layers, packs, status, drawing | 2026-09-16 | Accepted |
| D22, D23, D24 | ADR-016 | UI: result view replaces category colouring; building popup; result cards and modal | 2026-09-16 | Accepted |
| D25, D26 | ADR-017 | Location: clarification chips as consent; 'My location' resolved on device with explicit area/radius choice | 2026-09-16 | Accepted |
| D28 | ADR-018 | Map migration delivered as a separate prerequisite project, merged first behind a flag | 2026-09-16 | Accepted |

**Document history:** 0.1 — 16 September 2026 — first draft compiled from the requirements dialogue. 0.2 — 16 September 2026 — user-interface decisions D18–D27 and OD-10 added. 0.3 — 16 September 2026 — geolocation audit recorded; OD-10 closed. 0.4 — 16 September 2026 — map migration split into a prerequisite project (D28). Reviewers and approvers to be recorded here.
