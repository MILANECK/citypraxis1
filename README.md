# Citypraxis Wien

Local German-language redesign using the supplied cyan/magenta logos. Responsive public website, SQLite content database, and authenticated administration. Requires **Node.js 24 or newer**; no external packages or database service are needed.

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
- Responsive mobile layouts, keyboard-accessible menu, symptom selector, therapy tabs and native accordions.
- Owner/editor/reception authorization enforced by the server. Hashed passwords, expiring HttpOnly sessions, origin and CSRF checks, rate-limited login and request endpoints.
- Admin content CRUD, draft/publish/unpublish, authenticated draft previews, revision recovery, ordering, team entries, tariffs, contact data and opening hours.
- Media uploads (PNG/JPEG/WebP, maximum 2.5 MB), alternative text and image paths.
- Appointment inbox, assignment and status tracking; owner-only deletion.
- Staff account creation and activation/deactivation, password changes, and administrative activity log.

## Data

`data/citypraxis.sqlite` is created and seeded on first startup. Database migration version 1 is recorded in the `migrations` table. Public endpoints return only published content. The flexible `content` table stores structured JSON per collection with published and draft snapshots; users, sessions, requests, media and audit records use separate relational tables.

Uploaded images are in `public/uploads/`. Both uploads and runtime data are ignored by Git. Seed content is in `src/seed.mjs`; edits to the seed file do not overwrite an existing database. Use administration to change an initialized site.

Optional environment variables: `PORT` (default 3000), `DB_PATH` (default `data/citypraxis.sqlite`), `APP_ORIGIN` (exact browser origin for a future HTTPS reverse proxy). The server binds to `127.0.0.1` by default.

## Verify

```powershell
node --check src/server.mjs
node --check public/app.js
node --check public/admin.js
node --test tests/server.test.mjs
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

The full team roster, individually verified qualifications, current tariffs, final legal documents and a practice-approved retention policy are outstanding. Impressum and Datenschutz seed records are drafts, with clear placeholder notices on public routes. Check all clinical and insurance wording with the practice before publication. No review ratings or invented practitioners are used. The fixed claim “12 specialists” and a universal certification claim are intentionally not published without current verification.

For a public service, complete the legal/privacy content, hosting and HTTPS setup, email notifications, backup scheduling, retention and operational review. This is a website CMS and scheduling-request inbox, not a clinical-record system. Keep patient diagnoses/documents out of it.

## Assets

The three supplied logo files were copied unchanged to `public/assets/`. The treatment photograph is sourced from the existing Citypraxis website; see `docs/asset-sources.md`. No third-party font requests are made; local Inter and Plus Jakarta Sans are used when installed, with Arial fallback.

Design blueprint: `docs/redesign-brief.md`.
