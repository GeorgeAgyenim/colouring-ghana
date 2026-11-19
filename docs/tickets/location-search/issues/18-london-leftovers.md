# Pages still name London and its partners

Status: spec-complete
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

- [ ] Test: the log-in and sign-up pages show KNUST, Colouring Cities and Loughborough, and nothing from London.
- [ ] Test: the page the server sends has `og:url` `https://ngci.encs.concordia.ca/colouringghana`, an
      absolute `og:image` under that address, and a description without "London", "Bartlett" or "UCL".
- [ ] The manifest's `name` and `short_name` are "Colouring Ghana".
- [ ] In the running app: the log-in page shows the three partners' logos, all loading.
- [ ] `npm test` and `npm run typecheck` pass.
