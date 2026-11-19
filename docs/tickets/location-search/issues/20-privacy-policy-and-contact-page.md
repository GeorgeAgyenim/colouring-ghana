# The privacy policy and contact page name the London project

Status: spec-complete
Type: task
Blocked by: none
Feature doc: none
Requirements: none recorded on this branch
Branch: `fix/location-search-20-privacy-and-contact` off `feature/location-search`
Source: product owner's decision, 19 November 2026: "KNUST" is responsible for the data; "The Geomatic
Engineering Department is responsible"; contact email confirmed by the product owner the same day:
geomaticeng@knust.edu.gh.

## Problem

`app/src/frontend/pages/privacy-policy.tsx` says the project is run at The Alan Turing Institute, gives
Turing's data protection officer (email and London address) for complaints, points to the UK Information
Commissioner's Office and the General Data Protection Regulation, names Mailgun as the email service, links a
colouring-london GitHub issue, and its "How do we store your data?" section prints the config placeholder
`{Privacy statement goes here}`. `app/src/frontend/pages/contact.tsx` says the site is developed by a team at
The Alan Turing Institute, sends press enquiries to Turing's press office, and asks map users to credit
Ordnance Survey, which provides no data here. Password-reset emails are sent from `no-reply@colouring.london`
(`app/src/api/services/passwordReset.ts`), a London address the hosting mail server is unlikely to be allowed
to send for.

## What to build

Privacy policy (keep its structure and everything that is still true of this code; change only what is London's):
- Who is responsible: the Department of Geomatic Engineering, Kwame Nkrumah University of Science and
  Technology (KNUST), Kumasi, Ghana. Remove the CASA/UCL/Turing history and the UK registration sentence.
- Law and regulator: Ghana's Data Protection Act, 2012 (Act 843), and the Data Protection Commission, Ghana
  (link to its website), in place of the GDPR and the UK Information Commissioner's Office. Keep the list of
  rights, introduced as rights under data protection law, without naming the GDPR.
- Contact: the department, by email (geomaticeng@knust.edu.gh, as a `mailto:` link) and with a link to its
  website (https://geomatics.knust.edu.gh/).
- Email: "an email delivery service" instead of Mailgun (the code sends through whichever mail server is
  configured).
- Storage: replace the placeholder with where the data is: in a database on a server at Concordia University,
  Montréal, Canada, which hosts the site (`ngci.encs.concordia.ca`), with access limited to the project team.
  Put this in `privacyStatement` in `app/src/cc-config.json`, which the page already prints.
- Security and ethics: link the Colouring Cities code repository's issues (`githubURL` in the config) rather
  than a colouring-london issue; contact the department, not Turing.
- "Last updated": 19 November 2026, saying the policy was adapted for Colouring Ghana.

Contact page: who runs the site (the department at KNUST, as part of the Colouring Cities Research
Programme), where to send comments (the existing GitHub discussions link) and enquiries (the department's
website), no Turing press office, and the map credit given for this site's real sources: Colouring Cities
contributors and OpenStreetMap contributors (as `baseAttribution` in the config already says).

Password reset: the sender address comes from a new environment variable `MAIL_FROM`; when it is not set,
the mail server account (`MAIL_SERVER_USER`) is used. Document `MAIL_FROM` where the other `MAIL_SERVER_*`
variables are documented.

## Acceptance criteria

- [ ] Test: the privacy policy and contact page, as the server sends them, contain none of "Turing", "UCL",
      "CASA", "London", "Information Commissioner", "Mailgun", "Ordnance Survey", "Privacy statement goes here";
      they name the Department of Geomatic Engineering and KNUST, link https://geomatics.knust.edu.gh/, and give
      `mailto:geomaticeng@knust.edu.gh`.
- [ ] Test: a password-reset email is sent from `MAIL_FROM` when set, and from `MAIL_SERVER_USER` when not.
- [ ] `npm test` and `npm run typecheck` pass.
