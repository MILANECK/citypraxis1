# Referral policy confirmed on 11 October 2026

Isa's confirmation was supplied directly by the user:

- Physiotherapy, osteopathy and speech and language therapy require a medical referral/prescription (Verordnung, Zuweisung or Überweisung).
- Therapeutic massage does not require a referral. A patient may nevertheless have one.
- Patients should bring their referral to their first appointment at the practice.
- The chat explains the rule and links to the first-visit or relevant treatment page. It does not collect referral documents or add a referral-status intake question.

`src/referral-policy.mjs` supplies the approved facts and focused German/English administrative answers. Broader or mixed questions remain with normal conversation interpretation and receive the same policy facts. Insurance reimbursement and insurer approval remain separate questions; this policy does not establish those rules or prescribe a number of sessions.

`src/referral-content.mjs` replaces the old referral section and adds the treatment-specific information without changing unrelated clinical descriptions, prices, media or reimbursement terms. SQLite migration 14 applies once. `node scripts/update-referral-policy.mjs` prepares a scoped Supabase preview; `--apply` publishes the same changes with a backup, revisions, a concurrency check and read-back verification. Draft and published records are transformed separately; an unpublished record stays unpublished.

The historical organic report is retained. CP-001, CP-019 and CP-057 still need adapted patient-led referral scenarios; no referral-status question should be introduced to satisfy their original setup. Owner policy uncertainty is resolved; this alone does not turn previously blocked tests into completed passes.
