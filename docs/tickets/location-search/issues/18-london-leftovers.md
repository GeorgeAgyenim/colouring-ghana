# Pages still name London and its partners

Status: done
Type: task
Blocked by: none
Feature doc: none
Requirements: none recorded on this branch
Branch: `fix/location-search-18-london-leftovers` off `feature/location-search`
Source: product owner's request, 19 November 2026

## Problem

Parts of the site that every visitor sees are still the London project's:

- **Log-in and sign-up pages** (`app/src/frontend/components/supporter-logos.tsx`): "Lead Organisation and
  Project Partners" lists CASA, UCL, Historic England, Ordnance Survey and the Mayor of London. Colouring
  Ghana is managed by Kwame Nkrumah University of Science and Technology (`institution` in
  `app/src/cc-config.json`).
- **Link previews** (`app/src/frontendRoute.tsx`): a shared link shows "…collecting information on every
  building in London… at The Bartlett Centre for Advanced Spatial Analysis, University College London", the
  address `https://colouring.london` and London's logo.
- **Web manifest** (`app/public/site.webmanifest`): a phone that adds the site to its home screen names it
  "Colouring London".

## What to build

- Log-in and sign-up: the same partners the welcome page already shows (`pages/welcome.tsx`, chosen by the
  Ghana team): KNUST as the lead organisation, the Colouring Cities Research Programme, and Loughborough
  University, with their logos and links. One component, used by both pages.
- Link previews: description from the welcome page's own words and the city config (city name,
  institution); `og:url` the site's public address; `og:image` an absolute address of an image this site
  serves. The public address is `https://ngci.encs.concordia.ca/colouringghana` (from the project's notes);
  add it to `app/src/cc-config.json` as `siteUrl` and build the two absolute addresses from it. Check the
  image is large enough for previews (most services want at least 200×200).
- Manifest: "Colouring Ghana".

Not in this issue: the privacy policy and the contact page (they name who is responsible for the data and
whom to contact, which needs the product owner's answer), map layers and data-field help texts that mention
London data, and the password-reset sender address (`no-reply@colouring.london`, which depends on the mail
server the site is hosted with). List any other visitor-facing London text found, with file and line.

## Acceptance criteria

- [x] Test: the log-in and sign-up pages show KNUST, Colouring Cities and Loughborough, and nothing from London.
- [x] Test: the page the server sends has `og:url` `https://ngci.encs.concordia.ca/colouringghana`, an
      absolute `og:image` under that address, and a description without "London", "Bartlett" or "UCL".
- [x] The manifest's `name` and `short_name` are "Colouring Ghana".
- [x] In the running app: the log-in page shows the three partners' logos, all loading.
- [x] `npm test` and `npm run typecheck` pass.

## Comments

**19 November 2026, closed.** Implemented in the commit that sets this status.

- Log-in and sign-up: KNUST, the Colouring Cities Research Programme and Loughborough University, with their
  logos and links, from the one component both pages use. Logos scale down instead of overflowing a phone.
- Link previews: `og:url` https://ngci.encs.concordia.ca/colouringghana (new `siteUrl` in
  `app/src/cc-config.json`), `og:image` that address plus `/images/logo-cc.jpg` (2125×634), and a description
  from the welcome page's words and the config. Values from the config are now HTML-escaped in the page shell.
- Manifest: "Colouring Ghana".
- Tests: `components/__tests__/supporter-logos.test.tsx`, `src/__tests__/link-preview.test.tsx` (the real
  page route), `src/__tests__/web-manifest.test.ts`. They failed before (14 of 15; the title was already right).
- Whole suite: 300 tests pass (285 before). `npm run typecheck` passes. No new lint errors.
- Running app: the log-in page shows the three logos, all loading, linking to their sites; the page's
  preview tags and the manifest are as above.
- Limits: the preview image is wide (about 3.4:1) and services that crop to 1.91:1 may cut it; a 1200×630
  Ghana image would be better. The Loughborough logo (139×50) is shown enlarged. The site address is from the
  project's notes and was not checked live.
- Other London text found, not changed here: privacy policy and contact page (issue 20); the historic map
  layers (London 1890s tiles) and the age map's note on London street data; data-field help texts (Ordnance
  Survey TOID and UPRN, Historic England, GLA zone descriptions, a London wiki link); the planning section
  (Planning London Datahub, GLA and Historic England data and contacts); `public/openapi.yml` ("Colouring London
  API", server colouring.london); the composite partners image on the welcome page, kept on purpose.
