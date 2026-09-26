# Conversational receptionist — current deployment

The public widget now uses `public/chat-conversation.js` and the server-side
`src/chat/conversation.mjs` service. The retired guided widget, extraction endpoints and Mini integration have been removed.

## Render configuration

- `CHAT_AI_ENABLED=true`
- `OPENAI_API_KEY`: the active OpenAI API project key, server-only.
- `CHAT_CONVERSATION_MODEL=gpt-6-luna` (also the default when omitted).
- Existing Resend settings apply to forms and the new chat without changes.

To move billing to the client later, replace `OPENAI_API_KEY` with a key from the client's API project
and redeploy. Configure spending alerts in that project; application rate limits
are not a billing cap.

## Visitor flow and boundaries

The visitor starts with one general processing consent, then chats in German or
English. There is no separate optional OpenAI switch. The consent links to
privacy information, and the visitor can use the ordinary appointment form.
Luna answers administrative questions using published practice information and
extracts explicitly supplied details. Server validation controls contact fields,
missing questions, review and submission. No live appointment calendar is connected.
The visitor reviews and can correct the concern, name, email, phone and preferences.
The final review asks explicitly whether they have been treated at CityPraxis
before and lets them choose their preferred contact method (email, phone or
either). These choices update the stored request directly without another AI turn.
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


## Email delivery

The active Luna chatbot and ordinary booking forms share Resend delivery. Configure `RESEND_API_KEY`, `CHAT_NOTIFY_FROM` and `CHAT_NOTIFY_TO` server-side. `PATIENT_CONFIRMATION_FROM` optionally controls the patient copy sender; use a verified sending domain. Admin keeps notification status and supports retrying failed office notifications. A submitted request is not an appointment confirmation.

The retired guided chat endpoints `/api/chat/interpret`, `/api/chat/contact` and `/api/chat/submit` return 404. `/api/chat/session` remains for Luna. `OPENAI_MODEL` and `CHAT_AI_DAILY_LIMIT` are no longer used. Current Luna submissions have `conversation_version: 2`; retired guided submissions had `version: 1` without that field.
