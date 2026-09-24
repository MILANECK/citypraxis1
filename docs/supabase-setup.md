# Supabase setup for Citypraxis

The current application uses SQLite and a custom local password/session system. Connecting GitHub to Supabase does not switch those systems automatically. The application code must be migrated after the project is configured.

## 1. Create or select the Supabase project

In Supabase, open the project connected to the Citypraxis GitHub repository. Record the project region. For a Vienna healthcare practice, choose an EU region and complete the practice's privacy/legal review before accepting real appointment data.

## 2. Create the database schema

In the Supabase dashboard, open **SQL Editor → New query**.

Open `supabase/migrations/202609160001_initial_citypraxis.sql` from this repository, paste the complete file into the query, then choose **Run**.

If the initial schema was applied before the service-role grants were added, also run `supabase/migrations/202609160002_service_role_grants.sql`. It gives the trusted Node backend access to the tables while leaving anonymous browser access blocked.

The query creates:

- bilingual CMS content with separate draft and published JSON;
- revision history;
- staff roles (`owner`, `editor`, `reception`);
- appointment requests;
- audit history;
- media metadata;
- a public `website-media` Storage bucket.

All tables have Row Level Security enabled. No browser table policies are created because the current design keeps database writes behind the Node server.

### Import the current website content

After the schema query succeeds, generate a fresh seed from the local SQLite site:

```text
npm run supabase:seed
```

If the Windows `npm` launcher is unavailable, run the equivalent command:

```text
node scripts/export-supabase-seed.mjs
```

Open `supabase/seed.sql`, copy the whole file into a **new** SQL Editor query, and choose **Run**. This imports the bilingual pages, services, prices, reviews, team entries and media references. It deliberately excludes administrators, passwords, sessions, appointment requests and audit records.

The current `/assets/...` images and videos remain normal files in the repository. New images uploaded after the application migration will be stored in Supabase Storage.

## 3. Create the first admin in Supabase Auth

Open **Authentication → Users → Add user → Create new user**.

Enter the owner's real email and a unique password. Enable **Auto Confirm User** only if the email address has already been verified by the practice owner.

After creation, copy the user's UUID from the Users table. Return to **SQL Editor**, replace the three placeholders below, and run it:

```sql
insert into public.staff_profiles (id, email, name, role)
values (
  'PASTE_AUTH_USER_UUID_HERE',
  'owner@example.com',
  'Owner name',
  'owner'
);
```

Do not create a password column. Password hashes and password-reset flows belong to Supabase Auth.

## 4. Copy the API settings

Open **Project Settings → API Keys** (the wording can also appear as **API**).

Copy:

- Project URL → `SUPABASE_URL`
- Publishable key → `SUPABASE_PUBLISHABLE_KEY`
- Secret key → `SUPABASE_SECRET_KEY`

If the project shows legacy keys, `anon` corresponds to the publishable key and `service_role` corresponds to the server secret.

The publishable key may be used by a browser. The secret/service-role key must exist only on the Node server. Never paste it into `public/*.js`, GitHub source files, screenshots, or chat messages.

For local work, copy `.env.example` to `.env` and replace the placeholders. `.env` is already ignored by Git.

## 5. Configure Auth URLs

Open **Authentication → URL Configuration**.

During local development set:

- Site URL: `http://127.0.0.1:3000`
- Redirect URL: `http://127.0.0.1:3000/admin`
- Redirect URL: `http://127.0.0.1:3000/admin/reset-password`

When the production domain exists, replace the Site URL with the HTTPS domain and add equivalent production redirect URLs.

Open **Authentication → Providers → Email**. Leave public user signup disabled for this staff-only admin. Staff accounts should be invited/created by an owner.

For production password resets, configure custom SMTP under **Authentication → Email/SMTP**. Supabase's default email service is intended for initial testing and is rate-limited.

## 6. Configure Storage

Open **Storage** and confirm that `website-media` exists and is public. The SQL already applies a 60 MB limit and accepts PNG, JPEG, WebP and MP4.

Public means published website images can be viewed without signing in. It does not allow browser uploads because no upload policy exists. The Node server will upload using the secret key after verifying the admin session and role.

## 7. Configure the deployment host

GitHub Pages cannot run `src/server.mjs`; it only serves static files. Deploy this repository to a host that runs Node.js, such as Render, Railway, Fly.io, or an equivalent service.

In that host's environment-variable settings, add:

```text
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_STORAGE_BUCKET=website-media
APP_ORIGIN=https://YOUR_FINAL_DOMAIN
NODE_VERSION=24
```

Set the start command to:

```text
node src/server.mjs
```

Do not put these values in GitHub source files. If a deployment platform reads GitHub Actions secrets, create secrets with these exact names under **GitHub repository → Settings → Secrets and variables → Actions**.

## 8. Application connection status

When all three Supabase variables are present, `src/server.mjs` now switches automatically to Supabase. The connected backend provides:

1. Supabase Auth for login, logout, staff creation, access control and password changes;
2. Postgres storage for published content, drafts, revisions, appointment requests and audit history;
3. role checks through `staff_profiles` with HttpOnly authentication cookies;
4. uploads to the `website-media` Storage bucket;
5. the existing validation, rate limiting, draft/publish rules and protected core records.

Without those variables, the local SQLite backend remains available for isolated development and regression tests.

### Admin Overview capacity meter

Run `supabase/migrations/202609240001_capacity_metrics.sql` once in the project's Supabase **SQL Editor**. It adds a read-only, service-role-only function that reports the current database size and the sum of uploaded file sizes. Admin → Overview then shows separate bars against the Free plan's 500 MB database and 1 GB Storage allowances. The local SQLite preview and any Supabase project without this migration show “Live usage unavailable” instead of an estimated value.

Do not send medical reports, diagnoses or other clinical records through the appointment form. This database is for website content and appointment-contact requests, not patient records.

## 9. Safe handoff information

To perform the code migration, only these non-secret facts need to be shared in conversation:

- whether the Supabase SQL completed successfully;
- the Supabase project URL;
- the chosen deployment host and final domain.

Enter secret values directly into `.env` and the host's environment-variable UI. Do not paste the secret key or admin password into chat.
