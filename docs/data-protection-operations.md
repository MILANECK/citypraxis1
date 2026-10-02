# Citypraxis: web enquiries and data protection operations

This is an operational inventory for the practice owner and their Austrian data-protection adviser. It describes the application as implemented, rather than declaring the website legally approved. Complete the decisions below before accepting real patient enquiries, then align the published German and English privacy notice with the approved policy.

## Data flow in the current application

| Step | Data and location | Access and onward transfer |
| --- | --- | --- |
| Website visit | Render serves the site and may process connection and security logs. | Render account administrators and the provider under its terms. Confirm the service region and log retention in the live account. |
| Ordinary request form | Name, email, **required phone**, optional concern categories and short text, urgency and contact preferences are saved as an appointment request in Supabase. | Authorized reception/owner staff in Admin. If configured, reviewed request details go via Resend to the reception mailbox and a patient copy may be sent. Mailbox copies are outside the database deletion mechanism. |
| Direct email to Citypraxis | The sender's address, message and any attachments arrive in the reception mailbox. Direct email is not automatically inserted into the website request database. | Reception and anyone with mailbox access or forwarding rules can read it. The manual mailbox deletion step applies even if no Admin record exists. |
| Chat before submission | Consent, messages and draft details remain in browser-tab sessionStorage and server memory for a session of up to 30 minutes. | The current message, up to six recent messages and published practice facts go to the OpenAI Responses API. Recognized emails and phone numbers are masked where possible, but names and volunteered health information can remain. `store:false` is sent; it is **not** a zero-retention guarantee. |
| Chat after submission | Reviewed summary and complete chat transcript are saved in the Supabase appointment-request record. | Authorized reception/owner staff can read them. Resend receives the reviewed request details, not the complete transcript. |
| Chat usage reporting | Conversation markers, model and token counts are stored for usage totals; patient message text is not stored in this usage table. | Authorized Admin users can see aggregated usage and cost reporting. The separate submitted request may still contain the transcript. |
| Contact map | The Google Maps iframe loads only after the visitor selects “Show Google Maps”. | Google can receive connection and device data after that explicit action. |
| Admin and backup | Supabase holds staff profiles, content, requests and audit records. Local SQLite is a development fallback; local backup scripts copy its database and media. | Owner and reception staff can manually delete individual requests in Admin. Database deletion does not retract email, provider logs or existing backups. Confirm Supabase backup plan and independently stored exports. |

No live appointment is booked by the website. The request inbox is not a clinical record and should not be used to collect reports or detailed histories.

Provider defaults are separate from the practice's own deletion policy: OpenAI's API documentation says default abuse-monitoring logs may retain customer content for up to 30 days unless different controls are approved; `store:false` does not change that. Resend says email and log data is retained for 30 days on its standard plans. Supabase backup availability depends on the project's plan. Verify the settings and agreements of the **actual practice accounts** before using these figures in a public retention promise.

## Owner decisions to record

### Publicly verifiable identity clues

The [previous Citypraxis website](https://citypraxis.wien/) publishes the practice address **Stubenbastei 12/11, 1010 Wien**, `info@citypraxis.wien` and **0699 12682157**. It describes physiotherapy, osteopathy, speech therapy and massage, but its available page text does not identify the legal website operator or provide an Impressum or Datenschutz link. The [Physio Austria therapist listing](https://www.physioaustria.at/print/view/pdf/therapist_full_view/embed_1?view_args%5B0%5D=2347) independently associates **Isabella Casny** with Citypraxis and the same contact details. This supports the contact details in the draft notice, but does not establish that she is the sole legal controller of the new website or confirm the asserted MA 15 decision, register details, VAT ID, or company status.

1. **Controller and imprint.** Confirm the legal name, practice address, phone, professional registration, supervisory authority and whether a company-register number or VAT ID applies. The current seeded legal notice names Isabella Casny; this must be verified against the actual operator. Record who is responsible for rights requests at `info@citypraxis.wien`.
2. **Retention across channels.** The owner has chosen manual deletion by the real reception team for appointment requests from the web form, chatbot and direct email. The request inbox and mailbox are used to arrange an appointment. Once reception confirms an appointment and transfers the needed details into the practice's separate scheduling/patient system, staff delete the website request and its chat transcript, if present, and related emails in the practice mailbox manually, even if the appointment itself is months away. If no appointment results, reception reviews outstanding requests at least monthly and deletes them after about one month without further contact or an open follow-up step. Staff must check the separate schedule and any ongoing contact before deleting; an Admin status alone does not prove the handoff is complete. Direct emails may have no Admin record to delete. No automatic deletion of submitted requests or direct emails is active. Provider logs and backups follow their own retention processes.
3. **Providers and regions.** Confirm the production Render and Supabase regions, account owners, active processing agreements and any third-country transfers for Render, Supabase, OpenAI and Resend. Review Google Maps separately. A selected EU database region does not by itself establish EU-only processing by every provider or subprocessor.
4. **Email.** Reception deletes both directly received appointment emails and notification emails generated by the form or chatbot after handling the request. Confirm mailbox access, forwarding, patient-copy setting, deletion from sent and other staff-controlled folders/copies, and whether health-related free text should be omitted from notifications. Deleting an Admin record does not delete sent mail or a copy already delivered to the patient.
5. **Backup and incident handling.** Confirm the Supabase plan and restore capability, whether exports exist, their encryption/access and deletion schedule, who tests restores, and who handles a lost account or data incident. A free Supabase project should not be assumed to have downloadable daily backups.
6. **Legal basis and notice.** Have Austrian counsel or the practice's privacy adviser review the Article 6 basis, explicit consent for optional health data under Article 9, transfers, and whether the chatbot's consent and map behavior match the notice. Approve both German and English wording before publishing.

## Current deletion procedure

Owner or reception staff can delete a form or chat appointment request in Admin → Requests. For an arranged appointment, first confirm that the necessary details are in the separate practice system. For a request without an appointment, check the last meaningful contact during the monthly review and whether any follow-up is still active. Confirm the request ID, then delete the record and check that it is gone from the list. For direct email, there may be no Admin record; carry out the same review and delete the message thread from the reception mailbox. For every channel, separately find and delete related email in the reception mailbox and staff-managed copies; a copy already delivered to the patient cannot be withdrawn. Track whether a backup still contains the record until its normal expiry; do not restore an erased record into active use. The existing Admin audit entry records the staff member, action and request ID without copying health text.

There is **no automatic expiry of submitted appointment requests or direct emails**; the monthly review and deletion are staff responsibilities. Browser/server chat drafts expire after 30 minutes. The published privacy notice describes this manual process, but reception needs an agreed mailbox and backup procedure before it can promise complete deletion from every system.

## Boundary with treatment records

The website request inbox is for contact and scheduling, not the practice's clinical record. Under [§ 34 MTD-Gesetz 2024](https://ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20012653&Paragraf=34), records and supporting documentation of professional treatment by a self-employed MTD professional are kept for ten years, including after the professional activity ends, and then destroyed. The web-inbox deletion rule must not erase any document that the practice has adopted into its treatment documentation. Conversely, that clinical duty should not be used to retain every abandoned website enquiry for ten years. The practice must identify which system is the authoritative treatment record.

## Reference material

- [Austrian WKO: website imprint requirements](https://www.wko.at/internetrecht/website-impressum)
- [EDPB: data minimisation and storage limitation](https://www.edpb.europa.eu/topics/key-gdpr-concepts/basic-principles_en)
- [OpenAI API data controls](https://platform.openai.com/docs/models/default-usage-policies-by-endpoint)
- [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups)
- [Resend security and email retention](https://resend.com/security)
