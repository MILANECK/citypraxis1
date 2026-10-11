# Organic chatbot baseline

This runner tests the actual Citypraxis HTTP endpoints and conversation service in an isolated local process. The patient model writes **one next message or available UI action** after each actual receptionist response. It does not send a blind prepared message list. Fixed probes are released only after an observed conversation anchor. No chatbot production code is modified by the runner.

The initial five plans cover German, imperfect English, German FAQ detours, an actual mobile browser with DE → EN → DE switches and an email correction, and a German phone refusal. Each plan uses a separate signed session and synthetic contacts. The browser exchanges real HTTP responses without API mocks and records screenshots and a Playwright trace. Additional case IDs describe explicitly labelled integration variants, not blanket certification of the entire blueprint.

## Setup and tested commands (Windows PowerShell)

Use Node 24+ and the repository's installed dependencies (`npm.cmd ci`). The browser adapter needs Playwright and Chrome. It first finds an installed `playwright`, then `ORGANIC_PLAYWRIGHT_MODULE`, then the Codex bundled Windows runtime. Outside Codex, install Playwright in a separate directory and point that variable to its module, or install it in the project as a development dependency. `browserChannel` may be changed to an available browser in the configuration.

```powershell
Set-Location 'C:\Users\kovac\Documents\GitHub1\citypraxis1'
node --test tests/organic/harness.test.mjs tests/organic/campaign-isolation.test.mjs
node tests/organic/run.mjs --mode validate
node tests/organic/run.mjs --mode smoke --budget-usd 1
```

`validate` makes no model calls. It checks the memory-only database, an actual database canary, both server-side notification adapters, and blocked unknown/calendar egress. Smoke reads `OPENAI_API_KEY` and `CHAT_CONVERSATION_MODEL` from the existing project `.env` or shell; no key is copied or printed. Simulator/judge IDs, pricing, request/token/time limits and browser settings are versioned in `config.example.json`. The default public facts snapshot is a **read-only GET** of `/api/content`, never a patient/admin endpoint. Set `publicFactsUrl` to null in a copied configuration for a labelled repository-seed-only offline run.

## Isolation and budget

The runner always starts its own server on `127.0.0.1` and rejects a remote chatbot endpoint. It removes Supabase and production notification configuration inside the test process, creates SQLite `:memory:`, seeds public clinic facts, and creates only a synthetic reception user. Before any submit it proves that both reception and patient-email calls are intercepted inside the server. The fake Resend key never reaches Resend. SMS/calendar/unknown outbound actions are blocked. Only OpenAI's Responses endpoint receives actual paid requests. Closing the process discards its own memory records; there is no production cleanup operation.

The smoke cap is **$1 for target + patient simulator + judge combined**, at most 140 model calls, 900,000 tokens and 15 minutes, with one minute reserved for reporting. The initial 500,000-token ceiling was reached after harness diagnostics and was raised for the last smoke conversation; the $1 money cap was retained cumulatively across all attempts. Requests reserve a conservative upper bound before dispatch. Missing usage is charged at its reservation bound and stops the run. Costs from reported usage are estimates, not an invoice. No blind model or submit retries are performed.

To resume explicitly after a diagnosed harness fault, preserve the previous report and use `--prior-result <path-to-results.json>` to carry its cumulative budget charge. `--only smoke-05` selects a subset of the same five plans; it does not enable a broader campaign. The report must keep the first attempt, the changed harness version and the rerun separate. Source/result review can be performed manually without another paid judge call if a conservative reservation will not fit the remaining budget.

## Evidence and evaluation

Each run writes `test-results/organic/<run-id>/`: `report.html`, `summary.md`, full `results.json`, append-only `events.jsonl`, individual conversations, public/facts snapshots, source hashes, a copy of the executing harness source, configuration and judge calibration. `latest.txt` identifies the newest smoke run, `campaign-latest.txt` the newest campaign. Full transcripts include exact turn IDs, endpoint identities, review summaries and UI actions. Findings cite an exact quote, rule and state evidence. Product failures, harness faults, unreachable anchors and unverified claims have distinct verdicts. The original attached specification and 60 blueprints are preserved verbatim in this folder.

The semantic judge uses a separate model and three manually constructed good/bad/ambiguous calibration fixtures. These derive from the supplied policy; they are **not** an independent human-labelled benchmark. The owner still needs to review those labels and the first five full conversations. Uncalibrated automated passes are marked `NEEDS_REVIEW`. No clinician-approved urgent fixture was supplied, so CP-060 is `BLOCKED`.

## Authorized bilingual campaign

After the five reviewed smoke chats, the owner authorized the full test. `campaign.mjs` queues all reachable blueprint families, German/English counterparts for high-risk families, two long conversations where budget permits, and the user's practice-strength questions in both languages. Two independent signed sessions run concurrently. Each adaptive patient sees actual replies and available actions; fixed probes require observed anchors. Only one response-loss retry is authorized after inspecting the committed logical request and retaining its signed session, rather than retrying an unknown non-idempotent write.

These Windows commands were executed in this workspace:

```powershell
node tests/organic/campaign.mjs --validate --facts-path test-results/organic/reviewed-2026-10-10/public-content.snapshot.json
node tests/organic/campaign.mjs --budget-usd 3 --max-minutes 30 --facts-path test-results/organic/reviewed-2026-10-10/public-content.snapshot.json
```

The owner then explicitly extended the cumulative campaign to **$5 and 50 minutes**, and this command was executed against the preserved $3 campaign:

```powershell
node tests/organic/campaign.mjs --budget-usd 5 --max-minutes 50 --facts-path test-results/organic/reviewed-2026-10-10/public-content.snapshot.json --resume test-results/organic/campaign-2026-10-10T10-49-48-426Z-a2ec0e70/results.json --complete-bilingual --verify-long --replicate-risk --rejudge
```

`--resume` carries **all prior API usage, spend and execution time**, verifies an unchanged production source hash and complete usage records, and copies the old transcripts, traces and source-run identities. Earlier attempts are preserved. `--complete-bilingual` adds missing DE/EN counterparts for reachable case families; `--verify-long` adds two long conversations continuing through phone collection to the real review; `--replicate-risk` repeats language/correction/refusal/write/email/idempotency/injection cases; `--rejudge` evaluates complete conversations whose earlier judgement was capped or had invalid quotes. A queued plan is not proof of execution; inspect the final coverage and capped-work counts.

Omit `--facts-path` to request a new read-only public snapshot. The explicit path above reuses the dated public-content snapshot because the current public fetch timed out; this is recorded, not presented as a fresh deployment check. `--only CP-046,CP-047` selects planned case families. A fresh invocation without `--resume` starts a fresh ledger: do not reset cumulative accounting when continuing a campaign. A continuation requires explicit authorization when extending the owner's money/time cap.

The original campaign retained its **30 minutes/$3** financial/time limits. Its call ceiling grew from 850 to 1,200 while completing that authorized scope. The extended campaign has **50 minutes/$5/2,000 API calls/12 million token-budget units**, whichever is reached first, reserving one minute for reporting. All limits and role subtotals are cumulative on resume. Each request reserves the uncached-plus-cache-write upper bound before dispatch; after complete usage arrives, disjoint uncached, cached and written input are charged at their sourced short-context rates plus a 5% guard margin. The original overly conservative double-count of known input was corrected in a documented continuation while preserving the old ledger. Missing usage retains the whole reservation and stops. Standard short-context bounds apply because each request's conservative input-token bound is below the sourced long-context threshold. No tools, background calls or streaming are admitted.

The simulator's strict structured schema permits only the actions currently present in the actual UI, using a root object with nested alternatives as supported by the [official structured-output documentation](https://developers.openai.com/api/docs/guides/structured-outputs). It does not repair patient wording or tell the target how to answer. Invalid simulator actions from earlier harness versions remain separate `INVALID_TEST` evidence. The distinct API roles share one ledger, including concurrently reserved calls. The campaign does not alter production source. Its only runtime overrides are documented trusted-proxy headers with distinct RFC 5737 synthetic IPs for independent patients and the configurable sandbox daily AI quota. Per-client and per-session limits stay active.

Database rejection uses a memory-only TEMP trigger scoped to that synthetic email before the real INSERT. Email failure is scoped to the request's async conversation context inside the actual server notification adapter. Response loss fetches and commits the real local finish response before aborting the browser response. Refresh, same-session tabs, independent browser contexts and repeated submit clicks use real Chrome and HTTP endpoints. `campaign-latest.txt` identifies its incremental report. Exact textual blueprints unavailable in the current UI are distinguished from supported edit/button integration **VARIANT** coverage; unavailable referral/clinical anchors are **BLOCKED**, never passes. The first failure remains in the transcript even if subsequent correction succeeds. Counts of started conversations, actual anchor coverage, variants, blocked and capped work are separate.

A time/spend cap does not guarantee all 60 exact blueprints finish. Real phones, production Supabase writes, calendar availability and real email delivery remain unverified. Automated judgements require review; missing clinician-approved safety fixtures remain blocked.

## Reviewed first campaign and additional owner allowance

The completed first campaign contains 149 attempts, 1,890 paid calls and 39.43 minutes of cumulative test execution: estimated $4.587463, guarded $4.816836. Its reviewed report is preserved at `test-results/organic/campaign-2026-10-10T11-35-21-024Z-e779e634/report.html`. Preserved invalid attempts and repeated failures are not a production failure percentage. Seven exact blueprints are blocked by absent states or a missing clinician-approved fixture.

The following targeted continuations were executed with the same $5/50-minute cumulative cap and dated facts path. `--manual-judges` leaves new semantic results INCONCLUSIVE until an explicit, quoted transcript review; it never grants a pass by itself.

```powershell
node tests/organic/campaign.mjs --budget-usd 5 --max-minutes 50 --facts-path test-results/organic/reviewed-2026-10-10/public-content.snapshot.json --resume test-results/organic/campaign-2026-10-10T11-00-26-249Z-1cba7969/results.json --only CP-058 --organic-long --manual-judges
node tests/organic/campaign.mjs --budget-usd 5 --max-minutes 50 --facts-path test-results/organic/reviewed-2026-10-10/public-content.snapshot.json --resume test-results/organic/campaign-2026-10-10T11-17-27-774Z-fdf986ac/results.json --only CP-042,CP-054 --repeat-cases CP-042 --replicate-risk --manual-judges
node tests/organic/campaign.mjs --budget-usd 5 --max-minutes 50 --facts-path test-results/organic/reviewed-2026-10-10/public-content.snapshot.json --resume test-results/organic/campaign-2026-10-10T11-20-42-691Z-a64e3bad/results.automated.json --only CP-009,CP-025 --repeat-cases CP-009,CP-025 --manual-judges
```

`--organic-long` uses genuinely adaptive patient questions and their follow-ups, with two anchored language switches and a real review/edit reference. Earlier `--verify-long` FAQ lists remain labelled scripted integration VARIANT tests. The executing source snapshot identifies each version, and exact selected plan IDs distinguish queued work from actual conversations. A duplicated historical plan label is retained as an invalid attempt with a unique reporting ID; dispatch now deduplicates plan IDs.

The owner explicitly granted **another $5 and 30–40 minutes**. These additional limits are enforced by `extension.mjs` as differences from the preserved ledger: no old calls, tokens, spend or time are reset, and resuming the additional series does not grant the allowance twice. Admission uses the previous guarded spend plus exactly $5 and previous test execution plus exactly 40 minutes, with 2,000 additional calls / 12 million additional token-budget units as independent ceilings. Reporting reserves the last minute. Preparation and manual evidence review are separate from API execution time.

These commands were executed after the first reviewed campaign:

```powershell
node --test tests/organic/harness.test.mjs tests/organic/campaign-isolation.test.mjs tests/organic/extension.test.mjs
node tests/organic/campaign.mjs --validate --resume test-results/organic/campaign-2026-10-10T11-35-21-024Z-e779e634/results.json --additional-budget-usd 5 --additional-minutes 40 --remaining-suite --facts-path test-results/organic/reviewed-2026-10-10/public-content.snapshot.json
node tests/organic/campaign.mjs --resume test-results/organic/campaign-2026-10-10T11-35-21-024Z-e779e634/results.json --additional-budget-usd 5 --additional-minutes 40 --remaining-suite --facts-path test-results/organic/reviewed-2026-10-10/public-content.snapshot.json
```

The 56-plan additional suite uses held-out complete DE/EN utterances at observed channel, refusal, pause and hypothetical-authorization anchors. It also tightens Thursday→Friday→original and old-email reference anchors, uses distinct full-name/contact/health-description canaries in independent real browser contexts, and performs the actual Start again confirmation followed by a new consented signed session. A successful UI discard proves client draft removal and no downstream effects; it does not certify destruction of all prior server/provider memory. These are test-harness changes only. Unsupported typed review probes remain explicitly scoped variants, and missing clinical approval remains blocked. Complete transcripts, first divergences, API receipts and source snapshots are retained in the latest campaign report.

The following continuations were also executed, each preserving that same additional allowance. Paths below are equivalent workspace-relative forms of the recorded absolute arguments; each run's metadata contains the exact original arguments.

```powershell
node tests/organic/campaign.mjs --resume test-results/organic/campaign-2026-10-10T11-54-59-450Z-1211e2ce/results.json --information-suite --facts-path test-results/organic/reviewed-2026-10-10/public-content.snapshot.json
node tests/organic/campaign.mjs --resume test-results/organic/campaign-2026-10-10T12-09-56-983Z-7c2872cd/results.json --information-suite --alternate-info --facts-path test-results/organic/reviewed-2026-10-10/public-content.snapshot.json
node tests/organic/campaign.mjs --resume test-results/organic/campaign-2026-10-10T12-13-31-342Z-3faacf19/results.json --form-suite --facts-path test-results/organic/reviewed-2026-10-10/public-content.snapshot.json
node tests/organic/campaign.mjs --resume test-results/organic/campaign-2026-10-10T12-18-07-235Z-6e4c69aa/results.json --identity-suite --facts-path test-results/organic/reviewed-2026-10-10/public-content.snapshot.json
node tests/organic/campaign.mjs --resume test-results/organic/campaign-2026-10-10T12-19-42-950Z-2894ae41/results.json --limit-suite --facts-path test-results/organic/reviewed-2026-10-10/public-content.snapshot.json
node tests/organic/campaign.mjs --resume test-results/organic/campaign-2026-10-10T12-23-09-311Z-b4b84173/results.json --limit-suite --limit-ui --facts-path test-results/organic/reviewed-2026-10-10/public-content.snapshot.json
node tests/organic/campaign.mjs --resume test-results/organic/campaign-2026-10-10T12-28-08-348Z-116b520f/results.json --limit-suite --limit-ui --simulator-output-tokens 1200 --facts-path test-results/organic/reviewed-2026-10-10/public-content.snapshot.json
```

The completed additional series has **108 attempts / 1,282 additional paid calls / 27.99 minutes of test execution**, estimated **$3.659817**, guarded **$3.842808**, below the newly authorized $5/40-minute limits. Preparation and evidence review took additional time. The final reviewed artifact is `test-results/organic/campaign-2026-10-10T12-33-18-163Z-514c8564/report.html`: **257 cumulative attempts**, with the prior 149 and their usage preserved. Additional reviewed counts are PASS 54, FAIL 46, NEEDS_REVIEW 5, INCONCLUSIVE 2, INVALID_TEST 1. Repeated attempts are not a production failure-rate estimate. Two actual backend conversations reached the unchanged 30-message limit, but all four browser boundary attempts ended before it: two incomplete simulator outputs, one validator false positive, and one natural patient stop. UI behavior after the boundary remains unverified.

The two information suites add 32 complete conversations about prices, privacy, reimbursement, team, promotions, practice strengths, scope and tone. Six form-choice conversations anchor references against the actual offered order. Six complex-name and two separate receipt-language conversations retain generated sandbox receipt text. Reviewed failures and uncertain clinical/source boundaries have exact quotes and turn IDs; automated judgements are retained before reporting amendments. A separately verified public retention script is included in the report because it is incorporated into the visible privacy page but absent from the old limited judge projection. This verifies published wording, not staff deletion behavior.

After measurement, `action-validation.mjs` corrected the false positive that rejected a reference to the published clinic email as an invented patient email. Four free tests verify that actual question, rejection of other patient/email identities, current UI affordances, unauthorized submission and phone refusal. The original INVALID_TEST and the pre-fix executing source snapshot remain intact; no paid retry or changed production result is claimed. The previous 15 isolation/budget/browser tests and all four new validator tests pass. The final report reconciles every paid receipt, validates all evidence quotes/anchors and renders without overflow or page errors at 1280px and 390px.
