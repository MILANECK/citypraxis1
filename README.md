# Citypraxis Wien

Local German/English redesign using the supplied cyan/magenta logos. Responsive public website, SQLite content database, and authenticated administration. Requires **Node.js 24 or newer**; no external packages or database service are needed.

## Run locally

```powershell
cd C:\Users\kovac\Documents\GitHub1\citypraxis1
node src/server.mjs
```

Open http://127.0.0.1:3000. For automatic server restart during development, use `node --watch src/server.mjs` instead. Standard npm aliases are also provided, but this machine currently has a broken npm launcher; the direct Node commands work without npm.

In a second terminal, create your owner account:

```powershell
node scripts/create-admin.mjs
```

Enter your email, name and a unique password of at least 12 characters. Password input is visible in this local CLI. No default account or password is shipped. Open http://127.0.0.1:3000/admin to log in.

## Included

- Public homepage, symptom and service pages, Wahltherapie process, FAQ, practice information, contact and appointment request form.
- Responsive mobile layouts, keyboard-accessible menu, visible therapy overview, symptom links and native accordions.
- Owner/editor/reception authorization enforced by the server. Hashed passwords, expiring HttpOnly sessions, origin and CSRF checks, rate-limited login and request endpoints.
- Admin content CRUD, draft/publish/unpublish, authenticated draft previews, revision recovery, ordering, team entries, tariffs, contact data and opening hours.
- Fullscreen photo/video hero with admin media selection, upload, desktop/mobile crop, overlay and height settings; silent playback with pause and poster fallback.
- Media uploads (PNG/JPEG/WebP up to 10 MB; MP4/H.264 up to 60 MB), descriptions and library selection. Video streaming supports byte-range playback.
- Original clinical text restored on eight service/method pages; separate practice-price and dated reimbursement views.
- Twelve editable team cards with full-width portraits and compact name, specialization and contact details: one supplied identity and eleven explicitly fictional profiles. Photos can be uploaded, selected, cleared or replaced in Admin → Team. Biographies and qualifications remain stored in Admin but are omitted from these compact cards.
- Reviews can be added, edited, ordered, drafted and published in Admin → Bewertungen. Until real feedback is published, the homepage shows clearly labelled layout placeholders. The homepage uses the supplied group portrait; individual cards with contact details appear on the Team page. Replace the group portrait in Admin → Pages → home (or Hero image & video), using the Homepage group photo field.
- Clear homepage sequence: fullscreen hero, quick links, therapies, group portrait, reviews and prices/FAQ. The detailed first-visit process, specialisms and contact information remain on their dedicated pages. Long clinical pages preserve their original wording with larger text and section navigation.
- Appointment inbox, assignment and status tracking; owner-only deletion.
- Staff account creation and activation/deactivation, password changes, and administrative activity log.

## Contact and administration

- Contact displays all seven days using the hours supplied by the practice. Edit German/English day fields under Admin → Practice details.
- Team cards use a compact five-column desktop grid with responsive smaller layouts.
- Removable content entries have a Delete button in the list and editor header, with a confirmation dialog. The homepage, About page and practice settings are required records and stay protected.
- The contact panel includes a locally served light location sketch (labelled not to scale) and an external directions link. An accurate geocoded map remains pending approval of the external address lookup.

## Languages

Use **DE / EN** in the public header or the admin header/login page. The choice is remembered in this browser; explicit links such as `/?lang=en` and `/admin?lang=en` override the saved preference. Internal links retain the language, including draft preview and urgent appointment parameters.

Every content editor includes an **English translation** section below the German originals. Translate and save/publish the fields there. Names, photos, prices and contact details are shared. Blank English fields fall back to German. Publishing applies the complete bilingual record; German and English drafts are not published separately. Existing reviews are not automatically translated: enter an approved English version in the review editor.

Migration 5 adds English clinical copy from `src/english-content.mjs` without changing German text, existing English fields or publication state. Further edits belong in Admin. The UI dictionary is `public/ui-translations.js`.

## Data

`data/citypraxis.sqlite` is created and seeded on first startup. Database migration version 1 is recorded in the `migrations` table. Public endpoints return only published content. The flexible `content` table stores structured JSON per collection with published and draft snapshots; users, sessions, requests, media and audit records use separate relational tables.

Uploaded images are in `public/uploads/`. Both uploads and runtime data are ignored by Git. Seed content is in `src/seed.mjs`; edits to the seed file do not overwrite an existing database. Use administration to change an initialized site.

Optional environment variables: `PORT` (default 3000), `DB_PATH` (default `data/citypraxis.sqlite`), `APP_ORIGIN` (exact browser origin for a future HTTPS reverse proxy). The server binds to `127.0.0.1` by default.

## Verify

```powershell
node --check src/server.mjs
node --check public/app.js
node --check public/admin.js
node --test tests/*.test.mjs
```

Integration tests cover role access, origin/CSRF rejection, session logout, draft isolation, publishing, revisions, request validation, status handling, upload rejection and persistence after reopening SQLite. Tests use a temporary database and do not modify the working database.

## Backup and restore

```powershell
node scripts/backup.mjs
```

Creates a consistent SQLite snapshot and a copy of uploaded media in `backups/<timestamp>/`. Store backups outside the machine as appropriate. For a coordinated database/media backup, stop writes while backing up.

To restore: stop the server; preserve the existing data folder; replace the database with the backup's `citypraxis.sqlite`; restore the matching uploads folder; remove only stale SQLite `-wal`/`-shm` sidecar files belonging to the replaced database, if present; restart the server. Test restores before relying on backups.

## Before public launch

This deliverable runs locally and has not been deployed. Use test contact data during review. Requests are persisted but **no emails are sent** and time slots are not reserved. Staff must review and confirm requests. Configure actual notification delivery before relying on the inbox operationally.

The final real team roster, current tariffs, legal documents and a practice-approved retention policy remain outstanding. Team sample identities and portraits are clearly labelled. Anna Katharina Plank's information is from the user-supplied card; its email differs from the printed name and should be confirmed. Impressum and Datenschutz remain drafts. Original clinical descriptions and training claims have been restored; insurance information is labelled as carried over from the earlier website. The reimbursement table retains its original April 2023 date; it is not presented as current 2026 pricing. No review ratings are fabricated.

For a public service, complete the legal/privacy content, hosting and HTTPS setup, email notifications, backup scheduling, retention and operational review. This is a website CMS and scheduling-request inbox, not a clinical-record system. Keep patient diagnoses/documents out of it.

## Assets

The three supplied logo files were copied unchanged to `public/assets/`. The treatment photograph is sourced from the existing Citypraxis website; see `docs/asset-sources.md`. No third-party font requests are made; local Inter and Plus Jakarta Sans are used when installed, with Arial fallback.

Design blueprint: `docs/redesign-brief.md`.

Source coverage, brand values and hero/team changes: `docs/content-migration.md`.

Supabase database, Auth, Storage and deployment setup: `docs/supabase-setup.md`.
