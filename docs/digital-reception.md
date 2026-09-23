# Citypraxis digital reception

## What is implemented

A small, animated DE/EN widget on public pages prepares administrative requests. It uses a shared deterministic state machine. The visitor checks extracted values and a final summary before submission. Patient/referral status, prior therapists and appointment details are explicitly self-reported. There is no patient lookup, identity verification, calendar access, diagnosis or booking confirmation.

The existing Admin request inbox shows the reviewed fields, original free text, confirmed interpretation provenance and notification status. Existing contact form requests remain compatible. Owners can delete requests; owners and reception staff can manage the inbox. Editors do not receive access.

## Files and architecture

- `public/chat-widget.js`, `public/chat.css`: floating interface, consent, language-specific copy, draft lifecycle, progressive questions, confirmation and retry.
- `public/chat-model.js`: vocabulary, required steps and deterministic summary shared by browser/server.
- `src/chat/service.mjs`: public endpoints, rate limits, receipt validation, persistence orchestration.
- `src/chat/validation.mjs`: technical contact checks, libphonenumber-js/max, limits and canonical intake.
- `src/chat/security.mjs`: signed 30-minute session and interpretation receipts; bounded rate limits.
- `src/chat/interpret.mjs`: deterministic extraction, safety redirects, optional OpenAI Responses integration. **The GPT system prompt is `GPT_SYSTEM_PROMPT` here.**
- `src/chat/store.mjs`: SQLite and Supabase adapters.
- `src/chat/notify.mjs`: optional Resend notification. Email contains a request number and Admin link, not health details.
- `public/admin-chat.js`, existing Admin HTML/JS/CSS: structured handoff, consent/provenance, email retry.
- `src/server.mjs`, `src/supabase-server.mjs`, `src/database.mjs`: route integration and local migration.
- `public/index.html`, `public/app.js`: public widget and factual privacy information.
- `render.yaml`, `package.json`, `package-lock.json`, `.env.example`, `.gitignore`: dependency installation, configuration and secret-file exclusion.

## Database

Run `supabase/migrations/202609230001_digital_reception.sql` in the existing Supabase project. It is additive and idempotent, and has been confirmed run by the site owner. It adds **no tables**. Existing `appointment_requests` gains:

| Column | Purpose |
| --- | --- |
| `intake jsonb` | Validated structured fields, consent version, raw interpretations, visitor confirmation and deterministic summary |
| `submission_key uuid` | Unique signed-session submission key preventing double-click/network retry duplicates |
| `notification_status text` | `not_configured`, `pending`, `sent`, `failed` |

RLS remains enabled; anonymous and ordinary authenticated Supabase clients have no request-table grants. Only the server's service role reads/writes. Staff access is checked by the application's authenticated owner/reception roles. Local SQLite migration 10 adds equivalent fields automatically. Do not rerun the content seed to activate this feature.

## GPT testing now; client's billing later

Create a project API key in the desired OpenAI account. API access uses a server key; the website cannot use a ChatGPT sign-in session. Store these only in the root `.env` locally or Render → web service → Environment for the hosted site:

```dotenv
OPENAI_API_KEY=replace-with-private-project-key
OPENAI_MODEL=gpt-4.1-mini
CHAT_AI_ENABLED=true
CHAT_AI_DAILY_LIMIT=200
```

Restart the local server or save/redeploy Render after a change. Never commit a real key or put it in public JavaScript/Admin content. The user's own configured API key has been successfully tested with a fictional example; the response reported `source: ai` and the expected structured body area. To switch billing later, replace `OPENAI_API_KEY` with the client's project key and restart/redeploy. No database or frontend changes are needed. Configure project-level spending controls in OpenAI too.

GPT is optional and used only after visitor opt-in, for free text that the rules cannot interpret. Each request sends only the current answer with recognized contact details redacted; redaction is best effort, not anonymization. No entire intake, patient records or transcript is sent. `store:false`, a strict JSON schema, server-side validation, fixed UI messages, a 6.5-second timeout and max 500 output tokens are used. Invalid output, refusal, timeout, missing key or exhausted local budget falls back to structured choices. No arbitrary model-generated medical reply is displayed. Summaries are deliberately assembled from visitor-reviewed fields, avoiding generated clinical claims.

The API configuration follows [OpenAI's quickstart](https://developers.openai.com/api/docs/quickstart) and [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

## Optional email

The Admin inbox works without email. To enable notification emails, configure a verified Resend sender and staff destination:

```dotenv
RESEND_API_KEY=private-key
CHAT_NOTIFY_FROM=Citypraxis <verified-sender@your-domain>
CHAT_NOTIFY_TO=staff@your-domain
```

Email is attempted only **after** persistence. Failure does not undo the request. Staff can retry pending/failed notifications. Provider idempotency keys reduce duplicate sends; provider deduplication has a bounded retention period, so a much later retry after an uncertain delivery can still duplicate an email. No automatic background queue is introduced. Delivery has not been tested against a real mailbox because no sender/service is configured.

## Security and operations

- Same-origin mutation checks, 64 KB chat request cap, strict field limits, enums and validation.
- Names/email/phone are plausibility checks only, never ownership verification.
- Signed session keys and signed interpretation receipts; the browser cannot assert an AI source or attach another session's extraction.
- Unique database key makes simultaneous retries idempotent. Changed payloads under an already-used key return a conflict.
- API responses are non-cacheable. No raw intake, tokens or upstream error bodies are logged by chat handlers. Public files contain no API/service keys; dotfiles are rejected.
- Drafts stay in consented tab-scoped sessionStorage for a maximum active 30-minute session, clear on submission/restart/expiry, and are rejected on restore after expiry. A suspended/closed browser's physical storage cleanup is browser-managed. Closing the panel keeps the active draft; closing the tab ends that tab's storage.
- Emergency wording is fixed and editable in Admin → Practice details → Chat emergency notice (DE/EN). Keyword/AI detection is **not a reliable clinical triage system**. Emergency numbers are displayed before starting. No clinical triage claim should be made.
- Render's Cloudflare ingress supplies `CF-Connecting-IP`; it is trusted only when the host sets `RENDER=true`. Other deployments default to socket IP. Configure `TRUST_PROXY_HOPS` only for a verified, fixed trusted proxy chain; never trust arbitrary client-supplied X-Forwarded-For.
- Limits are bounded **per process** and reset on restarts. The current single-instance deployment uses these safeguards. Multiple instances need a shared limiter/budget store before scaling; the local daily cap is not a billing guarantee.
- Optional `CHAT_SESSION_SECRET` can provide a separate stable random signing secret; otherwise the Supabase server key is used. Rotating it expires active drafts.
- Stored requests follow the practice's retention/deletion policy. No silent deletion of existing records is introduced. Owners can delete handled requests in Admin. The practice must approve retention periods and the optional AI processing disclosure before collecting real health data.

## Validation

`node --test tests/*.test.mjs` covers existing features plus new/existing/unsure status and all eight intents, phone/email validation, huge/off-topic inputs, ambiguity, medical/emergency paths, GPT opt-in, malformed model output/timeouts, database failure, notification failure, receipts, duplicates/concurrent retries, session tampering/expiry and protected request access.

`node tests/browser-fixture.mjs` starts disposable in-memory SQLite on port 3001. `node tests/chat-browser.mjs` runs desktop/mobile Chromium flows: extraction confirmation, invalid phone correction, review, refresh, submission, Admin inbox, close/reopen and reduced motion. `PLAYWRIGHT_PATH` can point to a local Playwright install. No production requests are created by these tests.

To interactively test real GPT against disposable storage: `node --env-file=.env tests/browser-fixture.mjs` (stop an existing fixture first). This reads only the configured AI key; the fixture explicitly uses in-memory SQLite and sets its own local origin. API interpretation calls are billed to that key. Synthetic examples only.

## Release verification — 23 September 2026

- All 18 native Node test groups pass, including the existing site tests, SQLite submission and a mocked Supabase route integration.
- Desktop/mobile Chromium flows pass, including expiration of an old draft. Real iOS Safari has not been exercised by these automated checks.
- Existing Supabase accepts read-only schema checks for all three new columns; the public key is denied request-table access.
- The owner saved the API configuration in Render and confirmed deployment. The hosted session endpoint reports AI enabled. A live mobile test returned `source: ai`, interpreted a fictional joint description as `knee`, showed the visitor confirmation step, fit the viewport, and had no page errors.
- The hosted privacy supplement is present. No production appointment request or email was created by the release smoke test.
- Both `.env` and the accidentally named `.env.txt` are ignored by Git; no real credentials are committed.

Remaining operational setup: configure optional email if desired; have the practice approve retention/privacy text and replace the test key with the client's key before handover. Patient-database verification and calendar booking are intentionally future integrations.
