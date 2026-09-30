import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatChatMessage} from '../public/chat-links.js';

test('published price links become safe, clickable links',()=>{
  assert.equal(formatChatMessage('Details at /preise?lang=en.'),'Details at <a href="/preise?lang=en" target="_blank" rel="noopener noreferrer">/preise?lang=en</a>.');
  assert.equal(formatChatMessage('See [prices](https://www.citypraxis.wien/preise?lang=en).'),'See <a href="/preise?lang=en" target="_blank" rel="noopener noreferrer">prices</a>.');
  assert.equal(formatChatMessage('For more details, see [Physiotherapy](/leistungen/physiotherapie?lang=en) on our website.'),'For more details, see <a href="/leistungen/physiotherapie?lang=en" target="_blank" rel="noopener noreferrer">Physiotherapy</a> on our website.');
  assert.equal(formatChatMessage('https://citypraxis-wien.onrender.com/preise'),'<a href="/preise" target="_blank" rel="noopener noreferrer">https://citypraxis-wien.onrender.com/preise</a>');
});

test('chat link rendering escapes text and rejects outside URLs',()=>{
  assert.equal(formatChatMessage('<img src=x onerror=alert(1)> /preise'), '&lt;img src=x onerror=alert(1)&gt; <a href="/preise" target="_blank" rel="noopener noreferrer">/preise</a>');
  assert.equal(formatChatMessage('[click](javascript:alert(1))'), '[click](javascript:alert(1))');
  assert.equal(formatChatMessage('https://evil.example/preise'), 'https://evil.example/preise');
});

test('section and detail links follow a new deployment domain automatically',()=>{
  const origin='https://new-practice.example';
  for(const path of ['/kontakt?lang=en#oeffnungszeiten','/leistungen/physiotherapie?lang=de','/schwerpunkte/kopfschmerzen?lang=en','/team/isabella-casny?lang=en','/ueber-uns?lang=de#team','/termin?lang=en#booking-form']){
    assert.equal(formatChatMessage(`[More](${path})`,origin),`<a href="${path}" target="_blank" rel="noopener noreferrer">More</a>`);
    assert.equal(formatChatMessage(`[More](${origin}${path})`,origin),`<a href="${path}" target="_blank" rel="noopener noreferrer">More</a>`);
  }
  assert.equal(formatChatMessage('/leistungen/physiotherapie?lang=en',origin),'<a href="/leistungen/physiotherapie?lang=en" target="_blank" rel="noopener noreferrer">/leistungen/physiotherapie?lang=en</a>');
});

test('unsupported routes and disguised external links stay non-clickable',()=>{
  for(const url of ['/admin','/preise-invented','/leistungen/test/extra','//evil.example/preise','https://evil.example/leistungen/test','https://citypraxis.wien@evil.example/preise','https://new-practice.example.evil.test/preise']){
    assert.doesNotMatch(formatChatMessage(`[More](${url})`,'https://new-practice.example'),/<a /);
  }
});
