# Scripts, styles, icons and images carry the base path

Status: spec-complete
Type: task
Blocked by: none
Feature doc: none; decision record docs/decisions/0003 (local)
Requirements: none recorded on this branch
Branch: `fix/location-search-11-asset-base-path` off `feature/location-search`
Source: found while building issues 02 to 04, 19 November 2026; facts checked in the code the same day

## Problem

When the site is served from a sub-path (`SUBDIRECTORY`, for example `/colouringghana`), links and API
calls carry it, but the files the page loads do not:

- The script and stylesheet addresses start at the site root (`/static/js/…`, `/static/css/…`), and so do
  the parts of the app loaded later (the map). They come from the build's public path, which defaults to
  `/`; nothing in the repository sets it.
- `app/src/frontendRoute.tsx` links the web manifest and the icon with addresses relative to the page
  (`site.webmanifest`, `icon-192x192.png`). On any deeper page, such as `/view/age-history/123`, they point
  at a file that does not exist; this is wrong with or without a sub-path. There is no icon link for the
  browser tab, so browsers ask for `/favicon.ico` at the site root.
- Eleven images are written as `images/…` (`pages/welcome.tsx`, `pages/contact.tsx`,
  `components/supporter-logos.tsx`). They work only while the page's address happens to sit at the right
  depth, and break at `/colouringghana` without a final slash.
- `app/public/site.webmanifest` has `"start_url": "/"`, the site root.

How the partners' proxy treats `/static` and `/images` at the root cannot be seen from the repository. An
address that carries the sub-path works under any proxy that serves the sub-path at all.

## What to build

- Build: in `app/razzle.config.js`, for production builds, set the public path to `SUBDIRECTORY` plus `/`,
  so one setting drives everything. The development server is unchanged.
- Page shell: prefix the manifest and icon links with `SUBDIRECTORY`, as the font addresses already are,
  and add an icon link for the browser tab.
- Images: prefix the eleven `images/…` addresses the same way.
- Manifest: `"start_url": "./"`, which is relative to the manifest and right in both cases.

Not in scope: the preview image address in the page shell, which points at `colouring.london` (a content
question for the product owner).

## Acceptance criteria

- [ ] Built with `SUBDIRECTORY=/colouringghana`: every address in `build/assets.json` starts with
      `/colouringghana/static/`; the built script loads its later parts from `/colouringghana/`; the page
      the built server sends has the script, stylesheet, manifest, icon and font addresses all starting
      with `/colouringghana/`.
- [ ] Built with `SUBDIRECTORY` unset: script and stylesheet addresses are unchanged from today
      (`/static/…`); manifest, icons and images start with `/`.
- [ ] Test: the welcome, contact, log-in and sign-up pages render their images with the base path when it
      is set, and from `/` when it is not.
- [ ] In the running app (development server, site at the root): images show on `/`, `/contact.html`,
      `/login.html` and `/sign-up.html`; on a building page the manifest and icon requests succeed.
- [ ] `npm test` and `npm run typecheck` pass.
