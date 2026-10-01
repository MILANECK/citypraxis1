// Shared by the seeded privacy page and the public page's existing-content fallback.
export const retentionDe = `## Aufbewahrung von Termin- und Kontaktanfragen
Diese Regel gilt für organisatorische Termin- und Kontaktanfragen über das Webformular, den digitalen Empfang (Chat) und direkt an Citypraxis gesendete E-Mails. Abgesendete Formular- und Chat-Anfragen werden in der internen Anfragedatenbank gespeichert; bei eingerichtetem E-Mail-Versand erhält der Empfang zusätzlich eine Nachricht. Direkt gesendete E-Mails liegen im Empfangspostfach und werden nicht automatisch in die Anfragedatenbank übernommen.

Sobald ein Termin vereinbart und die dafür benötigten Angaben in das separate Praxissystem übernommen wurden, löscht der Empfang die Website-Anfrage einschließlich eines gespeicherten Chatverlaufs sowie die zugehörigen E-Mails im eigenen Postfach manuell. Das gilt auch, wenn der vereinbarte Termin erst Monate später stattfindet.

Kommt kein Termin zustande, prüft der Empfang offene Anfragen mindestens monatlich. Nach ungefähr einem Monat ohne weiteren Kontakt oder offenen Bearbeitungsschritt werden die Anfrage in der Datenbank und die zugehörigen E-Mails im eigenen Postfach manuell gelöscht. Es gibt keine automatische Löschung abgesendeter Anfragen oder direkt empfangener E-Mails.

Bereits an Sie versendete E-Mail-Kopien können wir nicht aus Ihrem Postfach entfernen. Anbieterprotokolle und Sicherungen folgen eigenen Aufbewahrungsfristen. Angaben, die in die Behandlungsdokumentation übernommen wurden, unterliegen deren gesonderten gesetzlichen Aufbewahrungspflichten.`;

export const retentionEn = `## Retention of appointment and contact requests
This policy covers administrative appointment and contact requests sent through the website form, the digital receptionist (chat), and email sent directly to Citypraxis. Submitted form and chat requests are stored in the internal request database; when email delivery is configured, reception also receives a notification. Direct emails remain in the reception mailbox and are not automatically added to the request database.

Once an appointment has been arranged and the necessary details transferred to the practice's separate system, reception manually deletes the website request, including any stored chat transcript, and the related emails in its own mailbox. This also applies when the arranged appointment is months away.

If no appointment is arranged, reception reviews outstanding requests at least monthly. After about one month without further contact or an open follow-up step, staff manually delete the database request and related emails in the reception mailbox. Submitted requests and direct emails are not deleted automatically.

We cannot remove email copies already delivered to your mailbox. Provider logs and backups have their own retention periods. Information transferred into treatment records is subject to separate statutory retention duties.`;

export const retentionCopy = language => language === 'en' ? retentionEn : retentionDe;

export function replaceLegacyRetention(body, language) {
  const copy = retentionCopy(language);
  if (String(body).includes(copy.split('\n')[0])) return { body, needsAppend: false };
  let replaced = false;
  const text = String(body || '').split('\n\n').map(block => {
    if (!/^(?:Abgesendete Terminanfragen werden|Submitted appointment requests are)/u.test(block)) return block;
    replaced = true;
    const tail = language === 'en' ? 'Statutory retention obligations remain unaffected.' : 'Gesetzliche Aufbewahrungspflichten bleiben unberührt.';
    const index = block.indexOf(tail);
    return index < 0 ? copy : `${copy}\n\n${block.slice(index)}`;
  }).filter(Boolean).join('\n\n')
    .replace('Stand: 22. September 2026', 'Stand: 1. Oktober 2026')
    .replace('Last updated: 22 September 2026', 'Last updated: 1 October 2026');
  return { body: text, needsAppend: !replaced };
}
