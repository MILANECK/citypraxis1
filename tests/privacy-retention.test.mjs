import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../src/seed.mjs';
import { retentionDe, retentionEn, replaceLegacyRetention } from '../public/privacy-retention.js';

test('published privacy copy covers form, chat and direct email in both languages', () => {
  const page = seed.pages.find(item => item.id === 'datenschutz');
  assert.ok(page.body.includes(retentionDe));
  assert.ok(page.bodyEn.includes(retentionEn));
  for (const [body, language] of [[page.body, 'de'], [page.bodyEn, 'en']]) {
    assert.equal(replaceLegacyRetention(body, language).needsAppend, false);
  }
});

test('older published privacy copy receives the current policy without contradictory retention text', () => {
  const german = '## Speicherung und Empfänger\n\nAbgesendete Terminanfragen werden derzeit nicht automatisch nach einer festen Frist gelöscht. Die Praxis kann sie im internen Verwaltungsbereich einzeln löschen. Gesetzliche Aufbewahrungspflichten bleiben unberührt. Administrationskonten bleiben gespeichert.\n\n## Ihre Rechte\n\nStand: 22. September 2026';
  const english = '## Storage and recipients\n\nSubmitted appointment requests are currently not deleted automatically after a fixed period. The practice can delete individual requests. Statutory retention obligations remain unaffected. Administrative accounts remain stored.\n\n## Your rights\n\nLast updated: 22 September 2026';
  for (const [body, language] of [[german, 'de'], [english, 'en']]) {
    const result = replaceLegacyRetention(body, language);
    assert.equal(result.needsAppend, false);
    assert.match(result.body, /Aufbewahrung von Termin- und Kontaktanfragen|Retention of appointment and contact requests/u);
    assert.doesNotMatch(result.body, /currently not deleted automatically|derzeit nicht automatisch/u);
    assert.match(result.body, /Statutory retention obligations|Gesetzliche Aufbewahrungspflichten/u);
    assert.match(result.body, /Your rights|Ihre Rechte/u);
    assert.match(result.body, /1\. Oktober 2026|1 October 2026/u);
  }
});

test('custom published privacy copy keeps its text and receives a separate policy section', () => {
  const custom = '## Practice-specific note\nThis text was approved in the editor.';
  const result = replaceLegacyRetention(custom, 'en');
  assert.equal(result.body, custom);
  assert.equal(result.needsAppend, true);
});
