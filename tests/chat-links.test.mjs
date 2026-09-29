import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatChatMessage} from '../public/chat-links.js';

test('published price links become safe, clickable links',()=>{
  assert.equal(formatChatMessage('Details at /preise?lang=en.'),'Details at <a href="/preise?lang=en">/preise?lang=en</a>.');
  assert.equal(formatChatMessage('See [prices](https://www.citypraxis.wien/preise?lang=en).'),'See <a href="/preise?lang=en">prices</a>.');
  assert.equal(formatChatMessage('https://citypraxis-wien.onrender.com/preise'),'<a href="/preise">https://citypraxis-wien.onrender.com/preise</a>');
});

test('chat link rendering escapes text and rejects outside URLs',()=>{
  assert.equal(formatChatMessage('<img src=x onerror=alert(1)> /preise'), '&lt;img src=x onerror=alert(1)&gt; <a href="/preise">/preise</a>');
  assert.equal(formatChatMessage('[click](javascript:alert(1))'), '[click](javascript:alert(1))');
  assert.equal(formatChatMessage('https://evil.example/preise'), 'https://evil.example/preise');
});
