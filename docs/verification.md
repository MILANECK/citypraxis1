# Local verification

- JavaScript syntax checks passed for server, database, public app and admin app.
- Node integration tests passed: role enforcement, public/private content separation, publish/unpublish, revisions, origin/CSRF protection, login/logout, request validation and status changes, malformed upload rejection, SQLite migration repeatability and persistence.
- Browser checks: homepage rendered at 390px and 1440px; mobile menu opened; symptom selection changed the detail link; service tabs changed panels.
- Admin browser checks used the in-memory test fixture, separate from the working database: owner sign-in, dashboard rendering, opening a page editor, saving a draft, and rendering the content list at 390px.
- Browser appointment submission with fictional contact data displayed the success confirmation in the disposable test environment. A 360px homepage check found no horizontal page overflow. Browser viewport overrides were reset afterward.
- The local npm launcher points to a missing npm-cli.js. Direct Node commands work and are documented in the README.
- Public notification delivery, deployment and production legal content are not configured.

This is focused implementation verification, not a full accessibility audit or penetration test.

## Hero, source content and team update

- Additional tests cover MP4 byte-range parsing and serving, rejected unauthenticated uploads, successful authenticated upload and retrieval, media signature checks, source-text fidelity, historical reimbursement labels and team sample flags.
- Browser verified actual background-video playback and pause; image mode was selected and published through the isolated admin screen and rendered without a video element.
- Browser verified clearing and publishing a team photo in the isolated environment; the resulting card had no photo.
- Source CRAFTA page visually checked with original text and photo in the neutral card design.
- Confirmed 12 rendered team cards. The mobile pricing page and video homepage were checked at 390px; pricing content did not create horizontal page overflow. Five automated test cases passed, including the larger integration flow.

## Readability and photo-card layout — 2026-09-16

- Replaced homepage tabs with four visible therapy cards; added direct Team and Prices navigation, a team preview, and a concise first-appointment/pricing/contact sequence.
- Team cards show full-width square portraits with name, specialization and available contact details below. All twelve records remain in the existing admin collection; longer biographies and qualifications remain stored but are omitted from the compact card.
- Long therapy text uses a continuous reading column. Desktop section navigation and a mobile contents disclosure link to the original sections without rewriting medical content.
- All five automated test cases passed, including source-text preservation and database/authentication checks. Updated public JavaScript passed syntax checks.
- Browser checked desktop homepage/therapy cards/team preview and 390px team/FAQ/treatment views. All twelve team cards rendered, no broken homepage images or horizontal overflow was found in these views. Mobile menu and FAQ expansion worked; treatment section links resolved and the mobile jump was verified. Temporary viewport override was reset.

### Compact profile cards

- Reduced desktop card width from approximately 353px to 174px, retaining the full-photo top and rounded text panel. Homepage now previews six profiles; mobile uses two columns.
- Browser checked desktop and 390px layouts. All twelve team cards rendered, with no horizontal page or text overflow. Public JavaScript syntax check passed.

### Homepage thumbnails and reviews

- Homepage now renders twelve photo-only links to the Team page, with no visible names or contact text. Team directory restored to larger three-column desktop / single-column mobile cards.
- Added reviews collection and admin editor (name, original text, optional stars and source). No real or invented testimonials seeded; empty state is clearly labelled as placeholders.
- Integration tests verify review draft isolation, publishing and unpublishing in an in-memory database. Existing tests and syntax checks passed. Desktop browser verified the thumbnail/review layout; at 390px no horizontal overflow, 75px thumbnails, one-column reviews and 335px full team cards.

### Review styling and admin brand colors

- Review cards now include optional 1–5 star displays, quotation styling, author initials, names and sources. Empty-state stars are outlined and explicitly labelled as preview placeholders.
- Admin reviews editor supports named star choices; Praxisdaten exposes the review section heading and introduction. Admin loads shared brand tokens and uses neutral panels, blue navigation and magenta actions.
- Five tests and JavaScript syntax checks passed. Isolated browser QA created and published a four-star test review, verified four filled stars and one empty star, and visually checked the dashboard palette. Working database was not changed.

## German / English version — 2026-09-16

- Added persistent DE/EN selectors to the website header and admin login/dashboard. Internal links preserve language, draft preview and urgent appointment parameters.
- Added English clinical, process, pricing, FAQ, team-role and practice copy via migration 5. Original German medical text and publication states are preserved. English text is editable in a separate section of every content editor; empty translation fields use German. Names, media and numeric prices remain shared.
- Browser verified: English homepage and full CRAFTA text, 390px mobile hero/header/menu with no horizontal overflow, 1440px desktop clinical page, English admin navigation and bilingual review editor.
- Disposable QA database: published an English FAQ edit, verified it on the English homepage, then switched to German and confirmed the original medical wording remained intact. No QA content was written to the working database.
- Seven Node tests pass, including language persistence/query precedence, navigation parameter preservation, original clinical copy preservation and migration/reopen behavior. Syntax checks pass. npm launcher remains broken on this machine; direct Node commands work.

## Homepage refinement — 2026-09-16

- Replaced homepage portrait thumbnails with the supplied full group photo in a rounded image/text panel. Migration 6 registers the photo in the media library and adds the homepage photo/translated alt-text fields to Admin.
- Removed homepage specialisms panel, first-appointment steps and bottom contact section. Their dedicated pages remain available. Removed extra hero caption/scroll elements, retaining the video playback control.
- Added a translucent white urgent-appointment CTA with pointer-position glow, keyboard focus styling and reduced-motion handling. Footer uses #F6F4F1 with the black wordmark and dark text.
- Browser verified desktop composition, exact footer background, requested removals, image loading and 390px mobile layout without horizontal overflow. Existing seven tests and JS syntax checks pass.

## Admin removal, team sizing and weekly contact details — 2026-09-16

- Added visible per-entry deletion in admin tables and editor headers, with a named HTML confirmation dialog. Core records are labelled Required content; server protection remains enforced.
- Team grid now uses five columns instead of three on desktop (approximately 40% narrower), with adjusted text/padding and responsive 4/3/2/1-column layouts. Browser inspected: 213px cards and no desktop overflow.
- Added seven editable bilingual day fields and migration 7. Applied the user's exact schedule to the working database, preserving all unrelated settings. Saturday footer now uses the new Saturday value.
- Contact/browser verified supplied English hours. External iframe stayed blank. External geocoding request was rejected by automatic approval review; explicit authorization is pending. Added a local vector location sketch clearly marked not to scale plus a directions link. Street intersection reference: https://commons.wikimedia.org/wiki/File:Stubenbastei_10-12.jpg . The sketch is illustrative, not surveyed geography.
- All seven Node tests pass, including new assertions for editor deletion, reception denial, removal from public/draft snapshots, required-record protection and weekly hour values. Final browser retest was limited by a stalled native test confirmation; replaced that implementation with an HTML dialog to avoid blocking the browser.
