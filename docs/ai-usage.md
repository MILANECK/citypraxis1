# AI Chatbot Usage

The admin card uses the OpenAI Costs API for the configured project and `CHAT_CONVERSATION_MODEL`. It no longer displays the local token-price estimate. OpenAI's Costs endpoint returns organization spend grouped by project and line item; the server filters to `OPENAI_PROJECT_ID`, then sums only the configured model for the current UTC month. Recent usage may take time to appear in OpenAI's report. This is reported API cost, not the prepaid account balance, and the website budget is only a visual comparison, not a spending cap.

## Server configuration

Set these variables on the server (Render for the hosted site):

- `OPENAI_ADMIN_KEY`: an OpenAI organization admin key used only by the server-side costs request. Treat it as a sensitive organization-level secret. Never put it in frontend code, committed environment files, or chat.
- `OPENAI_PROJECT_ID`: the project ID (`proj_…`) that the chatbot's `OPENAI_API_KEY` belongs to.
- `OPENAI_MONTHLY_BUDGET_USD`: an optional comparison budget you choose. It is hidden when unset; there is no default budget.

Use a project dedicated to the chatbot for clean attribution. The line-item filter excludes other models, but other usage of the same model in that project will also be included. OpenAI requires an admin key for the organization Costs endpoint; the dashboard card calls that endpoint only from the authenticated server. If the admin key or project ID is not configured, the card shows that actual costs are unavailable instead of falling back to an estimate or displaying a false `$0`.

Apply `supabase/migrations/202609260001_ai_usage.sql` in Supabase if it has not already been applied. Supabase (or local SQLite) continues to store conversation markers and token counts without patient message content; chat totals come from those conversation markers. Cost amounts are fetched from OpenAI and are not inferred from local token rates.

## Changing the OpenAI account later

When CityPraxis has its own OpenAI account, change the server's `OPENAI_API_KEY`, `OPENAI_ADMIN_KEY`, and `OPENAI_PROJECT_ID` to credentials and project from that account, then redeploy. OpenAI's organizations report separately; previous-account costs stay in the previous account and are not combined automatically.
