# Local verification

- JavaScript syntax checks passed for server, database, public app and admin app.
- Node integration tests passed: role enforcement, public/private content separation, publish/unpublish, revisions, origin/CSRF protection, login/logout, request validation and status changes, malformed upload rejection, SQLite migration repeatability and persistence.
- Browser checks: homepage rendered at 390px and 1440px; mobile menu opened; symptom selection changed the detail link; service tabs changed panels.
- Admin browser checks used the in-memory test fixture, separate from the working database: owner sign-in, dashboard rendering, opening a page editor, saving a draft, and rendering the content list at 390px.
- Browser appointment submission with fictional contact data displayed the success confirmation in the disposable test environment. A 360px homepage check found no horizontal page overflow. Browser viewport overrides were reset afterward.
- The local npm launcher points to a missing npm-cli.js. Direct Node commands work and are documented in the README.
- Public notification delivery, deployment and production legal content are not configured.

This is focused implementation verification, not a full accessibility audit or penetration test.
