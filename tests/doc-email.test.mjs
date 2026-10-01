import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDocEmailHtml, checkDocEmail, cleanSubject, draftSubject, draftHeadline, draftIntro, toAsciiEntities, MAX_EMAIL_HTML_BYTES } from '../shared/docEmail.ts';
import { docLinksHandler, docLinkFileHandler, DEFAULT_DOC_LINK_API_BASE } from '../server/docLinks.ts';
import { createSession, cookieName } from '../server/auth.ts';

const base = { typeId: 'proof', customer: 'roy meyreles', fileName: 'Roy-Meyreles-Proof-of-Insurance.pdf', fileMeta: 'PDF · 185 KB', url: 'https://docs.billlayneinsurance.com/d/abcdef012345', note: '' };

test('the Gold Elite draft passes the v3 gate and carries the essentials', () => {
  const html = buildDocEmailHtml(base);
  assert.deepEqual(checkDocEmail(html), []);
  assert.ok(html.includes('Your proof of insurance is ready'));
  assert.ok(html.includes('Hi Roy, your proof of insurance is attached to this email.'));
  assert.ok(html.includes('Roy-Meyreles-Proof-of-Insurance.pdf'));
  assert.ok(html.includes('href="https://docs.billlayneinsurance.com/d/abcdef012345"'), 'View it online links to the branded page');
  assert.ok(html.includes('PDF &#xB7; 185 KB'), 'non-ASCII is entity-escaped');
  assert.ok(!html.includes('A note from Bill'), 'the note section is removed when there is no note');
  assert.ok(html.includes('Text <a href="sms:+13368279065"'));
  assert.ok(!/[^\x00-\x7F]/.test(html));
  assert.ok(Buffer.byteLength(html) < MAX_EMAIL_HTML_BYTES);
});

test('the invisible line: hidden spacer first, then the 600px image, fluid container', () => {
  const html = buildDocEmailHtml(base);
  const body = html.slice(html.indexOf('<body'));
  const afterTag = body.slice(body.indexOf('>') + 1).trimStart();
  assert.ok(afterTag.startsWith('<div style="display:none;white-space:nowrap;font:15px courier'));
  const afterDiv = afterTag.slice(afterTag.indexOf('</div>') + 6).trimStart();
  assert.ok(afterDiv.startsWith('<img src="data:image/png;base64,'));
  assert.ok(afterDiv.slice(0, 400).includes('width="600"'));
  assert.ok(html.includes('class="email-container" style="max-width:600px;margin:0 auto"'));
  assert.ok(!html.includes('width="600" class="email-container"'));
});

test('notes are escaped and kept; general documents read naturally', () => {
  const html = buildDocEmailHtml({ ...base, note: 'Line one <script>alert(1)</script>\nLine two' });
  assert.deepEqual(checkDocEmail(html), []);
  assert.ok(html.includes('A note from Bill'));
  assert.ok(html.includes('Line one &lt;script&gt;alert(1)&lt;/script&gt;<br>Line two'));
  assert.ok(!html.includes('<script>alert'));
  assert.equal(draftHeadline('general'), 'Your documents are attached');
  assert.equal(draftIntro('general', ''), 'The document you asked about is attached to this email. You can also view it online anytime.');
  assert.equal(draftSubject('proof'), 'your proof of insurance from bill layne insurance');
  assert.equal(draftSubject('general'), 'your documents from bill layne insurance');
  assert.equal(cleanSubject('your \u{1F697} card  is   ready'), 'your card is ready');
  assert.equal(toAsciiEntities('café \u{1F697}'), 'caf&#xE9; &#x1F697;');
});

test('the gate catches every regression it exists for', () => {
  const good = buildDocEmailHtml(base);
  const cases = {
    'spacer image removed': good.replace(/<img src="data:image\/png;base64,[^>]*>/, ''),
    'spacer line removed': good.replace(/<div style="display:none;white-space:nowrap;font:15px courier[^>]*>[^<]*<\/div>/, ''),
    'paired width': good.replace('style="max-width:600px;margin:0 auto"', 'style="width:100%;max-width:600px;margin:0 auto"'),
    'nowrap on content': good.replace('<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:21px', '<div style="white-space:nowrap;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:21px'),
    'placeholder left': good.replace('Your proof of insurance is ready', '{{HEADLINE}}'),
    'raw emoji': good.replace('Document delivery', 'Document delivery \u{1F697}'),
    // The Gold Elite v2 master's known mistakes: texting the office line.
    'one text link to the office': good.replace('sms:+13368279065', 'sms:+13368351993'),
    'master CTA wording': good.replace(/Prefer to text\? <a [^>]*>\(336\) 827-9065<\/a>/, 'Prefer to text? (336) 835-1993'),
    'too big': good.replace('</body>', '<!--' + 'x'.repeat(MAX_EMAIL_HTML_BYTES) + '--></body>'),
  };
  for (const [name, html] of Object.entries(cases)) {
    assert.notDeepEqual(checkDocEmail(html), [], `the gate must flag: ${name}`);
  }
});

// Bill, 2026-10-01: texts go to the agency text line (336) 827-9065; the office
// (336) 835-1993 is for calls only. Checked on what the customer reads, independent of the gate.
test('texts go to (336) 827-9065; the office line (336) 835-1993 is calls only', () => {
  const html = buildDocEmailHtml(base);
  const body = html.slice(html.indexOf('<body'));
  // One entry per visible line or "&middot;"-separated clause, tags stripped.
  const clauses = body.split(/<br\s*\/?>|<\/(?:div|td|p)>|&middot;/i)
    .map(part => part.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  assert.ok(clauses.includes('Call (336) 835-1993'), 'calls go to the office');
  assert.ok(clauses.includes('Text (336) 827-9065'), 'sign-off: Call ... / Text (336) 827-9065');
  assert.ok(clauses.includes('Prefer to text? (336) 827-9065'), 'CTA: Prefer to text? (336) 827-9065');
  for (const clause of clauses.filter(c => /\btext/i.test(c))) {
    assert.doesNotMatch(clause, /835[\s.)-]*1993/, `a "text" line names the office number: ${clause}`);
  }
  const sms = [...html.matchAll(/href="sms:([^"]*)"/g)].map(m => m[1]);
  const tel = [...html.matchAll(/href="tel:([^"]*)"/g)].map(m => m[1]);
  assert.deepEqual(sms, ['+13368279065', '+13368279065'], 'every text link goes to the text line');
  assert.ok(tel.length > 0 && tel.every(n => n === '+13368351993'), 'every call link goes to the office');
});

// ------------------------------------------------------------- server: file proxy

const TOKEN = 'synthetic-doc-link-token-for-tests-only-0123456789abcdef';
const env = { SITE_PASSWORD: 'synthetic-only', SESSION_SECRET: 'synthetic-session-secret-for-test-only-32', DOC_LINK_TOKEN: TOKEN };
const origin = 'https://dashboard.test';
async function ctx({ path = '/api/doc-links/file?id=abcdef012345', method = 'GET', e = env, signedIn = true } = {}) {
  const headers = { origin, ...(signedIn ? { cookie: `${cookieName(e)}=${await createSession(e)}` } : {}) };
  return { env: e, next: async () => new Response(), request: new Request(origin + path, { method, headers }) };
}
function recorder(reply) {
  const calls = [];
  return { calls, fetcher: async (url, init = {}) => { calls.push({ url, init }); return typeof reply === 'function' ? reply() : reply; } };
}

test('file proxy: signed-in only, validated id, fetched as staff so it never counts as a customer open', async () => {
  const pdf = new Uint8Array([37, 80, 68, 70]);
  const ok = recorder(new Response(pdf, { headers: { 'content-type': 'application/pdf', 'content-length': '4' } }));
  const response = await docLinkFileHandler(await ctx(), ok.fetcher);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), pdf);
  assert.equal(ok.calls[0].url, `${DEFAULT_DOC_LINK_API_BASE}/d/abcdef012345/open?ref=staff`);

  const none = recorder(new Response('x'));
  assert.equal((await docLinkFileHandler(await ctx({ signedIn: false }), none.fetcher)).status, 401);
  assert.equal((await docLinkFileHandler(await ctx({ path: '/api/doc-links/file?id=../etc' }), none.fetcher)).status, 400);
  assert.equal((await docLinkFileHandler(await ctx({ method: 'POST' }), none.fetcher)).status, 405);
  assert.equal(none.calls.length, 0);

  assert.equal((await docLinkFileHandler(await ctx(), recorder(new Response('gone', { status: 404 })).fetcher)).status, 404);
  assert.equal((await docLinkFileHandler(await ctx(), recorder(new Response('x', { headers: { 'content-length': String(40 * 1024 * 1024) } })).fetcher)).status, 413);
  assert.equal((await docLinkFileHandler(await ctx(), async () => { throw new Error('down'); })).status, 502);
});

test('the library tells each dashboard whether Gmail drafts are available', async () => {
  const list = () => recorder(new Response(JSON.stringify({ items: [], cursor: null }), { headers: { 'content-type': 'application/json' } })).fetcher;
  const mine = await docLinksHandler(await ctx({ path: '/api/doc-links' }), list());
  assert.equal((await mine.json()).canGmailDraft, true);
  const staffEnv = { ...env, APP_ID: 'agency-staff-dashboard' };
  const staff = await docLinksHandler(await ctx({ path: '/api/doc-links', e: staffEnv }), list());
  assert.equal((await staff.json()).canGmailDraft, false);
});
