# AI Chatbot Usage

The existing admin overview shows estimated website chatbot spending, not the OpenAI prepaid balance. It does not enforce a spending cap.

## Deployment

Apply `supabase/migrations/202609260001_ai_usage.sql` in the Supabase SQL Editor before deploying. Set `OPENAI_MONTHLY_BUDGET_USD=20` in the Render service environment (or the local server environment). Restart/redeploy after changing it. Omission defaults to $20; zero is supported. An invalid value is shown as unavailable, not silently replaced.

## Storage and calculation

`public.chat_ai_usage` stores anonymous conversation-start markers and OpenAI response usage: timestamp, conversation UUID, response identifier, model, input/cached/output/total tokens and estimated USD cost. It contains no patient text or contact data. RLS and grants restrict access to the server service role. The admin endpoint returns aggregates only. Local SQLite uses an equivalent table.

Chats count unique existing session IDs with a message, including scripted chats. Merely opening the widget does not count. Duplicate event IDs are ignored. Costs use the actual response model and usage, with the requested model as fallback. Output tokens already include reasoning tokens. Cached input is charged at its discounted rate. Historical event costs remain unchanged if prices change later.

Standard USD rates per million tokens (verified September 26, 2026):

| Model | Input | Cached input | Output |
| --- | ---: | ---: | ---: |
| gpt-6-luna | 0.10 | 0.01 | 0.50 |

Sources: [OpenAI pricing](https://developers.openai.com/api/docs/pricing), [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna).

Cost = ((input − cached input) × input rate + cached input × cached rate + output × output rate) / 1,000,000. Update the server-side rate table in `src/chat/usage.mjs` when changing models/pricing. Unknown models, nonstandard tiers and inputs over the conservative 128,000-token supported range are flagged as unpriced, rather than treated as free. The current short text chatbot uses no paid tools. Estimates exclude taxes, credits and other applications on the same OpenAI account.

The calendar month is UTC, from its first instant inclusive to the next month exclusive. Remaining = max(0, budget − estimated cost). Tracking begins when deployed; no historical usage is inferred from transcripts. Database logging is asynchronous and bounded to 2.5 seconds. Failures never block chatbot replies; the dashboard warns about observed logging failures for the current server process. Failed writes are not retrospectively recovered. If the database/RPC is unavailable, no misleading $0 balance is shown.
