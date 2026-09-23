# Conversational receptionist — current deployment

The public widget now uses `public/chat-conversation.js` and the server-side
`src/chat/conversation.mjs` service. The guided widget and routes below remain
for compatibility; their optional-AI controls do not describe the new interface.

## Render configuration

- `CHAT_AI_ENABLED=true`
- `OPENAI_API_KEY`: the active OpenAI API project key, server-only.
- `CHAT_CONVERSATION_MODEL=gpt-6-luna` (also the default when omitted).
- `CHAT_AI_DAILY_LIMIT=200` (default, per running process; resets on restart).
- Existing Resend settings apply to forms and the new chat without changes.

Changing `OPENAI_MODEL` only affects the legacy interpreter. To move billing to
the client later, replace `OPENAI_API_KEY` with a key from the client's API project
and redeploy. Configure spending alerts in that project; application rate limits
are not a billing cap.

## Visitor flow and boundaries

The visitor starts with one general processing consent, then chats in German or
English. There is no separate optional OpenAI switch. The introduction names
OpenAI and links to privacy information and the ordinary appointment form.
Luna answers administrative questions using published practice information and
extracts explicitly supplied details. Server validation controls contact fields,
missing questions, review and submission. No live appointment calendar is connected.
The visitor reviews and can correct the concern, name, email, phone and preferences.
Only an explicit final send stores the request and emails the secretary. An email
failure keeps the request available in Admin for retry. Email identifies Chatbot
as its source; Admin also shows the submitted conversation.

The limit is 16 attempted messages per 30-minute session. Review remains sendable
at the limit, with the ordinary form available as fallback. Corrections consume
remaining turns. Requests cannot be submitted until all required fields exist.
Session locks and idempotent submission protect against duplicate sends.

### Conversational tone and published knowledge

Replies acknowledge new concerns and thank visitors for information. They answer
mixed administrative questions before asking for the next missing detail. The
model receives published service descriptions, specialties, team profiles,
prices, FAQs, information/privacy pages and practice settings, using the chosen
language. Only published content is supplied; Admin edits become available after
publication and the existing content cache refresh. Missing facts are not invented.

Mentioning a symptom does not authorize intake: the assistant invites a first
appointment request, records an explicit yes and respects a no/not yet. It refers
to a specialist from **our team** in a published focus area, without recommending
or selecting a named person for the visitor. A dedicated therapist is assigned
**after the first appointment**. Individual profiles can be described when asked.
No diagnosis, treatment recommendations, calendar availability or booking promises.

The whole reply, including the follow-up question, is capped at 700 characters.
A generous output token bound is separate from this visible character cap. The
client reveals only new replies word by word, finishing within 2.2 seconds;
reduced-motion preferences show the complete reply immediately. Screen readers
receive a complete response rather than announcements for every word. Emergency
messages appear immediately. This is a display effect, not model token streaming.

## Data lifecycle

A consented draft is stored in tab sessionStorage and server process memory for
up to 30 minutes. Restarting the server may end an unfinished session. The client
clears expired drafts when active and will not restore an expired session. Only
a confirmed summary and transcript are persisted in Supabase. Email contains the
reviewed details, not the full transcript. No new SQL migration is required.

The current message and up to six recent messages are supplied to OpenAI with
published practice facts. Recognized email addresses and phone numbers are masked
before transmission, but names and voluntary health text can remain. This is not
anonymization. Responses API uses `store:false`; provider retention rules still
apply. The site's digital reception privacy section describes this processing.

## Verification

Run `npm test`, `npm run check` and `node tests/conversation-browser.mjs` against
the disposable browser fixture. The browser test mocks AI and submission so it
does not create patient records or send emails. Real API smoke tests use clearly
synthetic data only. Never log keys or real visitor messages.

---

## Earlier guided reception implementation and email setup

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
- `src/chat/notify.mjs`: optional Resend delivery for all request sources, with the submitted details, source label and Admin link.
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

## Request emails (forms and chatbot)

First-appointment forms, requests from therapist profiles and the chatbot use the same email delivery. The subject and email body identify the source. Emails contain the submitted contact information, all selected concerns, the optional Other concern text, availability and, for profile requests, the published therapist's name. The patient email becomes Reply-To. Both HTML and plain-text versions are sent.

The Admin inbox works without email. Configure these private environment variables locally in `.env` and in Render → citypraxis-wien → Environment:

```dotenv
RESEND_API_KEY=private-key
CHAT_NOTIFY_FROM=Citypraxis <verified-sender@your-domain>
CHAT_NOTIFY_TO=staff@your-domain
```

Despite their legacy `CHAT_` names, both sender and recipient settings apply to **all three** sources. To change the inbox later, change `CHAT_NOTIFY_TO` and redeploy; no code or database change is required. Never put the API key in Admin content or a public JavaScript file.

For this testing phase, use:

```dotenv
CHAT_NOTIFY_FROM=Citypraxis <onboarding@resend.dev>
CHAT_NOTIFY_TO=kovac.design@gmail.com
```

Resend's default testing sender only delivers to the email address used for the Resend account. Register with the test recipient above, or verify a sending domain and use an address on that domain. See [Resend's testing-domain restriction](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain). After adding the API key and both variables to Render, use **Save, rebuild, and deploy**. Check one synthetic request from each source and its Admin delivery status. `sent` means the provider accepted the message; inbox/spam placement still needs checking.

Email is attempted only **after** persistence. Failure does not undo the request. Staff can send requests originally saved without email configuration and retry pending/failed notifications in Admin. Provider idempotency keys reduce duplicate sends; provider deduplication has a bounded retention period, so a much later retry after an uncertain delivery can still duplicate an email. No automatic background queue is introduced. The provider request timeout is six seconds.

The general appointment form does not select a therapist. An explicit request from a therapist profile shows that person's photo/name as a fixed preference. The secretary arranges dates and assignment by phone or email; the site does not reserve calendar slots. Multiple concerns are checked independently, including Admin-added categories. Full answers are stored in the existing `intake` column, while the old `preference` column holds a short preview for compatibility. The existing digital reception migration is sufficient; no additional SQL or reseeding is needed.

Consent and the privacy supplement describe forwarding the submitted details, including voluntarily supplied health information, through Resend to the reception inbox.

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

`tests/appointment-mail.test.mjs` verifies multiselect storage, Admin-edited options, escaping, all three email sources, duplicates, failed delivery and manual retries with a mocked provider. `QA_PORT=3005 node tests/browser-fixture.mjs` and `node tests/appointment-browser.mjs` cover the form in German/English, static profile selection, mobile layout, the Other field and reduced motion. Use the PowerShell equivalent `$env:QA_PORT='3005'` when starting the fixture on Windows. These test scripts do not load `.env`; do not supply real email credentials to disposable fixtures unless intentionally sending test mail.

To interactively test real GPT against disposable storage: `node --env-file=.env tests/browser-fixture.mjs` (stop an existing fixture first). The fixture explicitly uses in-memory SQLite and sets its own local origin. This loads all configured provider keys: AI interpretation calls are billed to that key and submitted requests can send real notification emails when Resend is configured. Synthetic examples only.

## Release verification — 23 September 2026

- All 18 native Node test groups pass, including the existing site tests, SQLite submission and a mocked Supabase route integration.
- Desktop/mobile Chromium flows pass, including expiration of an old draft. Real iOS Safari has not been exercised by these automated checks.
- Existing Supabase accepts read-only schema checks for all three new columns; the public key is denied request-table access.
- The owner saved the API configuration in Render and confirmed deployment. The hosted session endpoint reports AI enabled. A live mobile test returned `source: ai`, interpreted a fictional joint description as `knee`, showed the visitor confirmation step, fit the viewport, and had no page errors.
- The hosted privacy supplement is present. No production appointment request or email was created by the release smoke test.
- Both `.env` and the accidentally named `.env.txt` are ignored by Git; no real credentials are committed.

## Email update verification — 23 September 2026

- All 21 native test groups pass. Desktop/mobile form and chat checks pass in German and English, including the form source, multiple concerns and the Admin handoff.
- Real Resend delivery was exercised with three synthetic requests in disposable local storage, one per source. Resend accepted all three messages for `kovac.design@gmail.com`.
- Live Render delivery additionally requires the three email environment variables above. Local `.env` changes do not update Render.

Before handover, replace test provider keys and the testing mailbox with the client's configuration. Patient-database verification and calendar booking are future integrations.
