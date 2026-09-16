# Citypraxis Wien — redesign and implementation blueprint

Status: design specification; the application and database are not implemented yet.
Workspace: `C:\Users\kovac\Documents\GitHub1\citypraxis1`.
Language: German public website and administration. Work stays local.

## 1. Business understanding and structural audit

The brief positions Citypraxis as an interdisciplinary private practice for complex head, jaw and related complaints, alongside general orthopaedic rehabilitation. The design should make specialist expertise approachable, with a clear next step for visitors in pain.

Source reviewed on 15 September 2026: https://citypraxis.wien/. Its navigation mixes introductory sections, appointment preparation, disciplines and individual methods; CMD appears twice. The homepage combines extensive treatment explanations with practical information. Booking currently points to email. These observations concern the retrieved content structure, not a measured usability study or visual browser audit.

### Proposed changes and expected benefits

| Current structural issue | Redesign | Expected benefit |
| --- | --- | --- |
| Methods and symptoms compete in navigation | Separate Schwerpunkte from Leistungen | Visitors can start with familiar complaint names |
| Preparation details are spread across sections | One Ablauf & Wahltherapie destination | Fewer steps to understand the first visit |
| Long explanations dominate the journey | Short introductions with optional method accordions | Easier scanning without losing depth |
| Multiple introductory anchors | One focused homepage and an Über uns section | Clearer hierarchy |
| Email-based first contact | Consistent appointment-request entry point | Clear expectations about requesting versus confirming a slot |

These are design hypotheses, not claims of a measured conversion increase. Evaluate appointment-request completion and mobile navigation usability after implementation.

### New sitemap

```text
/
├── schwerpunkte/
│   ├── kiefer/
│   ├── kopfschmerzen/
│   ├── tinnitus/
│   ├── schwindel/
│   └── unfall-operation/
├── leistungen/
│   ├── physiotherapie/       # CRAFTA, CMD, FDM, FM, manual therapy
│   ├── osteopathie/
│   ├── logopaedie/
│   ├── heilmassage/
│   └── rueckenfit/
├── ablauf-wahltherapie/      # four steps, costs, prescription, FAQs
├── ueber-uns/               # philosophy, team, practice
│   └── team/[slug]/
├── kontakt/                 # location, access, hours, phone/email
├── termin/                  # first appointment or acute request
├── impressum/
├── datenschutz/
└── admin/                   # authenticated; excluded from public navigation
```

Header: Schwerpunkte · Leistungen · Ablauf & Wahltherapie · Über uns · **Ersttermin buchen**. Secondary action: **Akuttermin?**. Contact remains accessible from the header utility area and footer.

Persona A: homepage → symptom → relevant care/team → appointment request, with a direct acute contact shortcut.
Persona B: Ablauf & Wahltherapie → preparation/costs/FAQs → first appointment. Method-specific visitors can enter through service pages.

Every symptom page uses the same structure: recognisable complaints, how the practice approaches assessment, relevant disciplines, qualified practitioners, practical next step. The selector is navigation, not automated diagnosis.

## 2. Homepage wireframe

### A. Sticky header

Wordmark left, four navigation groups, primary appointment button right. Compact enough to preserve reading space. Anchor targets have a scroll offset. Mobile navigation is specified below.

### B. Hero — expertise with a human face

Desktop: approximately 55% copy / 45% warm practice photograph, with generous whitespace and one softly rounded image. Mobile: copy, actions, then image.

- Eyebrow: `Physiotherapie · Osteopathie · Logopädie · Heilmassage`
- H1: `Wo andere aufhören, fangen wir erst an.`
- Supporting copy: `Spezialisierte Therapie für Kiefer, Kopf und Bewegungsapparat. Gemeinsam finden wir den nächsten Schritt für Sie – in unserer Praxis in 1010 Wien.`
- Primary: `Ersttermin buchen` → appointment request.
- Secondary: `Akuttermin anfragen` → acute contact instructions.
- Compact trust row: team size, CRAFTA expertise, Vienna location. The brief requests 12 specialists and a certification badge; verify current roster and individual certification before using a practice-wide “certified” claim.
- No fabricated availability indicator. A pulse is allowed only for a current, staff-managed availability message.

### C. Interactive symptom grid

Heading: `Was führt Sie zu uns?`
Five rounded choices: Kiefer · Kopf & Migräne · Tinnitus · Schwindel · Unfall & OP.

Selecting a choice reveals a short explanation and a link to its dedicated page. The selected button exposes `aria-pressed`; the result region updates politely for assistive technology. First choice can be selected by default. Include a general-services link for visitors whose complaint is not listed.

Desktop: five columns. Tablet: three. Small screens: two, with no horizontal carousel or hidden options.

### D. Wahltherapie in four steps

Heading: `Ihr Weg zur ersten Behandlung`.

1. **Verordnung klären** — `Klären Sie vor dem ersten Termin, welche ärztliche Verordnung Sie für Ihre Behandlung benötigen.`
2. **Behandlung** — `Wir besprechen Ihre Beschwerden und planen die nächsten Schritte gemeinsam.`
3. **Bezahlung** — `Sie erhalten eine Rechnung für Ihre Behandlung. Hinweise zur Zahlung finden Sie vor Ihrem Termin.`
4. **Rückerstattung prüfen** — `Ob und in welcher Höhe eine Erstattung möglich ist, hängt von Behandlung und Versicherung ab.`

Link: `Ablauf, Kosten & häufige Fragen`. Show the confirmed cash-payment policy beside the payment step and in the footer. Do not promise a fixed refund or copy dated insurance approval rules without current verification.

Desktop: four numbered cards connected by a quiet line. Mobile: vertical ordered list. Meaning must not depend on the connector.

### E. Discipline overview

Heading: `Mehrere Fachrichtungen. Ein gemeinsamer Blick.`
Tabs: Physiotherapie, Osteopathie, Logopädie, Heilmassage. Each panel contains a brief explanation, relevant complaints, one method accordion where appropriate, and a service-page link. Rückenfit gets a smaller link within the Physiotherapie panel.

Tabs support arrow keys, Home/End, focus and selected state. On small screens use a wrapping two-by-two tab arrangement. Method accordions use native details/summary where possible.

### F. Team and trust

Show real practitioners, roles and verified qualifications, with links to profiles. Explain interdisciplinary collaboration in plain language. Present the 6.5-year osteopathy study pathway as a qualification of the relevant practitioners once verified; do not imply every team member holds that degree.

Use a real team/practice photograph when supplied. Stock photography can illustrate care but must not be labelled as an actual team member or the actual practice. Reviews require a genuine source and permission where applicable; no invented ratings or testimonials.

### G. Contact and footer

Location, phone, email, opening hours including Saturday, directions/map link, payment note, legal links and final appointment action. The current site lists Stubenbastei 12/11, 1010 Wien, info@citypraxis.wien, 0699 12682157, Saturday 08:30–12:30 and cash payment. Confirm these operational details before launch.

A map link works immediately; an embedded map can load on demand. Keep contact details selectable and phone/email links actionable.

## 3. Visual system and interaction specifications

- Visual thesis: a calm specialist practice with dark slate typography, mint surfaces, restrained sage accents and warm human photography.
- Canvas: `#F7FAF8`; surface: `#FFFFFF`; soft mint: `#EAF2EE`.
- Primary text: `#18332F`; secondary text: `#4C625D`; action: `#285C50`; action text: white.
- Headings: Plus Jakarta Sans; body: Inter; self-host font files during implementation, with system-sans fallbacks.
- Body: 16–18px, line-height 1.6; mobile H1 approximately 38px, desktop approximately 64px using fluid sizing.
- Content width: 1200px; horizontal gutters: 20px mobile / 40px desktop.
- Cards: 20px radius; controls: 12px or pill; subtle borders and shadows.
- Hover: lift 4px over 180ms only on hover-capable devices. Visible keyboard focus must be equally clear.
- Respect prefers-reduced-motion; disable lifts, pulses and smooth scrolling under it.
- Glass effects are limited to the header and must retain readable contrast without backdrop-filter support.
- Verify contrast, 200% text zoom, keyboard operation and narrow-screen overflow during the build.

### Mobile layout

The mobile version shares the same content and backend as desktop. At narrow widths, replace desktop links with an accessible menu button, show a single-column hero and vertical process, and keep appointment access visible. If a bottom booking bar is used, reserve its height plus the device safe area so it cannot obscure content or form actions.

Use at least 44px interaction targets. No hover-only explanations. Keep forms single-column, use appropriate autocomplete/input types and associate validation messages with fields. Test at 360px, 390px, 768px and 1440px, plus keyboard and text zoom.

### Component code specifications

The following dependency-free HTML/CSS/JS snippets specify the three requested patterns. They are reference code, not a running application.

```html
<a class="rounded-card" href="/schwerpunkte/kiefer/">
  <span class="eyebrow">Schwerpunkt</span>
  <h3>Kieferbeschwerden</h3>
  <p>Erfahren Sie mehr über unseren Ansatz bei Beschwerden im Kieferbereich.</p>
  <span>Mehr erfahren →</span>
</a>

<button id="menu-toggle" aria-expanded="false" aria-controls="mobile-nav">
  Menü
</button>
<nav id="mobile-nav" aria-label="Mobile Hauptnavigation" hidden>
  <a href="/schwerpunkte/">Schwerpunkte</a>
  <a href="/leistungen/">Leistungen</a>
  <a href="/ablauf-wahltherapie/">Ablauf & Wahltherapie</a>
  <a href="/ueber-uns/">Über uns</a>
  <a href="/termin/">Ersttermin buchen</a>
</nav>

<section aria-labelledby="process-title">
  <h2 id="process-title">Ihr Weg zur ersten Behandlung</h2>
  <ol class="process">
    <li><h3>Verordnung klären</h3><p>Klären Sie die benötigte Verordnung vor Ihrem Termin.</p></li>
    <li><h3>Behandlung</h3><p>Wir planen die nächsten Schritte gemeinsam.</p></li>
    <li><h3>Bezahlung</h3><p>Sie erhalten eine Rechnung für Ihre Behandlung.</p></li>
    <li><h3>Rückerstattung prüfen</h3><p>Die mögliche Erstattung hängt von Behandlung und Versicherung ab.</p></li>
  </ol>
</section>
```

```css
.rounded-card {
  display: block; padding: 1.5rem; border-radius: 20px;
  border: 1px solid #ccdcd4; background: #fff; color: #18332f;
  text-decoration: none; transition: transform 180ms, box-shadow 180ms;
}
@media (hover: hover) {
  .rounded-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px #18332f12; }
}
:where(a, button, summary):focus-visible { outline: 3px solid #285c50; outline-offset: 4px; }
.process { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; padding-left: 1.5rem; }
.process li { padding: 1rem; background: #eaf2ee; border-radius: 20px; }
#mobile-nav[hidden] { display: none; }
#mobile-nav a { display: block; padding: 0.8rem 1rem; }
@media (max-width: 767px) { .process { grid-template-columns: 1fr; } }
@media (min-width: 768px) { #menu-toggle, #mobile-nav { display: none; } }
@media (prefers-reduced-motion: reduce) {
  .rounded-card { transition: none; }
  .rounded-card:hover { transform: none; }
}
```

```js
const toggle = document.querySelector('#menu-toggle');
const nav = document.querySelector('#mobile-nav');
function setMenu(open) {
  toggle.setAttribute('aria-expanded', String(open));
  nav.hidden = !open;
}
toggle.addEventListener('click', () => setMenu(nav.hidden));
nav.addEventListener('click', (event) => {
  if (event.target.closest('a')) setMenu(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !nav.hidden) {
    setMenu(false);
    toggle.focus();
  }
});
matchMedia('(min-width: 768px)').addEventListener('change', () => setMenu(false));
```

This is an in-flow disclosure menu, so it does not trap focus. A future modal/drawer replacement must implement dialog semantics and focus management.

## 4. Full admin console — planned scope

| Area | Staff capabilities |
| --- | --- |
| Overview | New requests, content drafts, current acute-contact message |
| Pages | Edit homepage, symptoms, services, workflow and FAQs; preview, publish and restore revisions |
| Team | Manage biographies, qualifications, disciplines, photos and ordering |
| Practice settings | Contact details, hours, payment information and appointment instructions |
| Prices | Manage services, durations, prices and effective dates |
| Media | Upload permitted image types, add alt text and manage references |
| Appointment requests | Review requests, assign staff, update status and record contact outcome |
| Users and roles | Owner manages access; editors manage content; reception handles requests |
| Activity | Review important content and administrative changes |

The initial booking flow is an appointment request, not a guaranteed calendar reservation. Public confirmation must say the practice will confirm the appointment. A real-time calendar needs staff schedules, duration rules, conflicts and cancellation handling; that is a separate extension if desired.

## 5. Database and server architecture

Use a relational database behind a server API. Keep the database provider decision open until implementation setup; preserve a portable schema and migrations. The browser must never receive administrative database credentials. Public reads expose published content only, and all privileged writes require server-side authorization.

```text
users ──< user_roles >── roles
pages ──< page_revisions
symptoms >──< symptom_services >── services
team_members >──< team_services >── services
services ──< prices
media_assets ← page/team media references
practice_settings + opening_hours + faqs
appointment_requests ──< request_events
users ──< audit_events
```

Core fields:

- `pages`: id, unique slug, title, structured content, draft/published status, published_at, updated_at.
- `page_revisions`: page_id, content snapshot, editor_id, created_at.
- `symptoms`, `services`: id, unique slug, title, introduction, content, sort_order, publication status.
- `team_members`: id, slug, name, role, biography, qualifications, media_id, publication status.
- `prices`: service_id, duration_minutes, amount_cents, currency, valid_from, valid_until.
- `media_assets`: id, storage_key, MIME type, size, alt_text, uploader_id.
- `opening_hours`: weekday, opens_at, closes_at, appointment_only, exception_date where applicable.
- `appointment_requests`: id, name, contact method/details, preferred time, acute flag, status, assignee_id, created_at.
- `request_events`: request_id, actor_id, previous_status, new_status, timestamp.
- `audit_events`: actor_id, action, entity type/id, timestamp; avoid copying private request content into logs.

Request forms should collect only the contact details and scheduling information needed to arrange a visit. Clinical records, diagnosis documents and patient uploads are outside this website CMS scope.

Implementation must include migrations and seed content, authenticated staff sessions, role checks, validated inputs, login/request rate limiting, CSRF protection where cookie sessions are used, safe media handling, backup/restore instructions and a defined retention policy for appointment requests. Draft changes must not become public until published.

## 6. Build sequence and acceptance

1. This brief: audit, sitemap, wireframe and component specifications.
2. Build the German public website locally with responsive desktop/mobile layouts and usable navigation, selector, tabs, accordions and contact actions.
3. Add the database, migrations, authenticated admin console and persistent content editing.
4. Connect appointment requests and verify staff access, status changes and error states.
5. Verify responsive layouts, accessibility, publishing behavior, persistence after restart and unauthorized-access rejection. Document exact local setup commands once the stack exists.

Outstanding factual inputs for launch: actual team roster/photos and qualifications, current prices, confirmed opening hours/payment policy, final legal content and insurance wording. These do not block the design; mark unverified content in the working dataset rather than inventing facts.
