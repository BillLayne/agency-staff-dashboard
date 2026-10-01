import test from 'node:test';
import assert from 'node:assert/strict';
import { docLinksHandler, docLinkViewsHandler, DEFAULT_DOC_LINK_API_BASE } from '../server/docLinks.ts';
import { createSession, cookieName } from '../server/auth.ts';
import {
  previewTypeForFileName, previewHeadline, guessDocType, suggestFileName, finalizeFileName, validateDocFile,
  buildCustomerMessage, emailSubject, gmailComposeUrl, isSafeDocLinkUrl, normalizeDocLinkItem, normalizeViewStats,
  describeReceipt, firstNameOf, matchesDocQuery, staffTestUrl, MAX_DOC_BYTES, previewLinkTitle, sourceLabel, TEXT_PREVIEW_IMAGE,
} from '../shared/docLinks.ts';

// Synthetic values only -- never real credentials.
const TOKEN = 'synthetic-doc-link-token-for-tests-only-0123456789abcdef';
const env = { SITE_PASSWORD: 'synthetic-only', SESSION_SECRET: 'synthetic-session-secret-for-test-only-32', DOC_LINK_TOKEN: TOKEN };
const origin = 'https://dashboard.test';
const good = { shortId: 'abcdef012345', url: 'https://docs.billlayneinsurance.com/d/abcdef012345', fileName: 'Roy-Meyreles-Proof-of-Insurance.pdf', contentType: 'application/pdf', createdAt: '2026-10-01T12:00:00.000Z', source: 'command-center', customer: 'Roy Meyreles', size: 1234 };

async function cookie(e = env) { return `${cookieName(e)}=${await createSession(e)}`; }
async function ctx({ method = 'GET', path = '/api/doc-links', body, headers = {}, e = env, signedIn = true } = {}) {
  const h = { origin, ...(signedIn ? { cookie: await cookie(e) } : {}), ...headers };
  return { env: e, next: async () => new Response(), request: new Request(origin + path, { method, headers: h, ...(body ? { body } : {}) }) };
}
function pdfForm(name = 'scan0034.pdf', bytes = 2048, extra = {}) {
  const form = new FormData();
  form.append('file', new File([new Uint8Array(bytes)], name, { type: name.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream' }));
  for (const [key, value] of Object.entries(extra)) form.append(key, value);
  return form;
}
function recorder(reply) {
  const calls = [];
  const fetcher = async (url, init = {}) => { calls.push({ url, init }); return typeof reply === 'function' ? reply(url, init) : reply; };
  return { calls, fetcher };
}
const jsonResponse = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });

// --- access control -------------------------------------------------------

test('requires a signed dashboard session', async () => {
  const { calls, fetcher } = recorder(jsonResponse({ items: [] }));
  const response = await docLinksHandler(await ctx({ signedIn: false }), fetcher);
  assert.equal(response.status, 401);
  assert.equal(calls.length, 0, 'never contacts the document service without a session');
});

test('rejects cross-site uploads even with a valid session', async () => {
  const { calls, fetcher } = recorder(jsonResponse({}));
  const response = await docLinksHandler(await ctx({ method: 'POST', body: pdfForm(), headers: { origin: 'https://evil.test' } }), fetcher);
  assert.equal(response.status, 403);
  assert.equal(calls.length, 0);
});

test('fails closed when the scoped token is missing, short, or the base URL is not https', async () => {
  for (const e of [{ ...env, DOC_LINK_TOKEN: '' }, { ...env, DOC_LINK_TOKEN: 'short' }, { ...env, DOC_LINK_API_BASE: 'http://insecure.test' }]) {
    const { calls, fetcher } = recorder(jsonResponse({ items: [] }));
    const response = await docLinksHandler(await ctx({ e }), fetcher);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'DOC_LINKS_NOT_CONFIGURED');
    assert.equal(calls.length, 0);
  }
});

// --- library listing ------------------------------------------------------

test('lists the library server-to-server with the token, and only returns well-formed agency links', async () => {
  const hostile = [
    good,
    { ...good, shortId: 'bbbbbbbbbbbb', url: 'javascript:alert(1)' },
    { ...good, shortId: 'cccccccccccc', url: 'https://docs.billlayneinsurance.com.evil.test/d/cccccccccccc' },
    { ...good, shortId: 'dddddddddddd', url: 'https://docs.billlayneinsurance.com/d/eeeeeeeeeeee' },
    { ...good, shortId: 'NOT-HEX' },
    'not an object',
  ];
  const { calls, fetcher } = recorder(jsonResponse({ items: hostile, cursor: 'next-page_cursor==' }));
  const response = await docLinksHandler(await ctx(), fetcher);
  assert.equal(response.status, 200);
  const text = await response.text();
  assert.ok(!text.includes(TOKEN), 'the token must never reach the browser');
  const body = JSON.parse(text);
  assert.deepEqual(body.items.map(item => item.shortId), ['abcdef012345']);
  assert.equal(body.cursor, 'next-page_cursor==');
  assert.equal(calls[0].url, `${DEFAULT_DOC_LINK_API_BASE}/api/doc-links`);
  assert.equal(new Headers(calls[0].init.headers).get('authorization'), `Bearer ${TOKEN}`);
});

test('forwards a valid cursor and rejects a malformed one', async () => {
  const { calls, fetcher } = recorder(jsonResponse({ items: [], cursor: null }));
  assert.equal((await docLinksHandler(await ctx({ path: '/api/doc-links?cursor=abc%3D%3D' }), fetcher)).status, 200);
  assert.equal(calls[0].url, `${DEFAULT_DOC_LINK_API_BASE}/api/doc-links?cursor=abc%3D%3D`);
  assert.equal((await docLinksHandler(await ctx({ path: '/api/doc-links?cursor=%3Cscript%3E' }), fetcher)).status, 400);
});

// --- uploads --------------------------------------------------------------

test('creates a link, forwarding only the file and the customer label', async () => {
  const { calls, fetcher } = recorder(jsonResponse(good, 201));
  const response = await docLinksHandler(await ctx({ method: 'POST', body: pdfForm('Roy-Meyreles-Proof-of-Insurance.pdf', 4096, { customer: '  Roy   Meyreles ', smuggled: 'x', secret: 'y' }) }), fetcher);
  assert.equal(response.status, 201);
  assert.equal((await response.json()).item.url, good.url);
  const sent = calls[0].init.body;
  assert.ok(sent instanceof FormData);
  assert.deepEqual([...sent.keys()].sort(), ['customer', 'file', 'source']);
  assert.equal(sent.get('source'), 'command-center', 'the source is set by the server, not the browser');
  assert.equal(sent.get('customer'), 'Roy Meyreles');
  assert.equal(sent.get('file').name, 'Roy-Meyreles-Proof-of-Insurance.pdf');
  assert.equal(calls[0].url, `${DEFAULT_DOC_LINK_API_BASE}/api/doc-links`);
});

test('rejects bad uploads before contacting the document service', async () => {
  const cases = [
    { body: pdfForm('IMG_0042.HEIC'), status: 400 },
    { body: pdfForm('payload.exe'), status: 400 },
    { body: pdfForm('empty.pdf', 0), status: 400 },
    { body: pdfForm(), headers: { 'content-length': String(MAX_DOC_BYTES + 512 * 1024) }, status: 413 },
    { body: 'plain text', headers: { 'content-type': 'text/plain' }, status: 415 },
  ];
  for (const item of cases) {
    const { calls, fetcher } = recorder(jsonResponse(good, 201));
    const response = await docLinksHandler(await ctx({ method: 'POST', body: item.body, headers: item.headers || {} }), fetcher);
    assert.equal(response.status, item.status);
    assert.equal(calls.length, 0);
  }
  const noFile = new FormData(); noFile.append('customer', 'Nobody');
  assert.equal((await docLinksHandler(await ctx({ method: 'POST', body: noFile }), recorder(jsonResponse(good)).fetcher)).status, 400);
});

test('maps upstream failures to safe messages', async () => {
  const run = async (reply) => docLinksHandler(await ctx({ method: 'POST', body: pdfForm() }), recorder(reply).fetcher);
  const auth = await run(jsonResponse({ error: 'Unauthorized' }, 401));
  assert.equal(auth.status, 502); assert.equal((await auth.json()).code, 'DOC_LINKS_AUTH');
  const validation = await run(jsonResponse({ error: 'Files must be between 1 byte and 15 MB' }, 400));
  assert.equal(validation.status, 400); assert.equal((await validation.json()).error, 'Files must be between 1 byte and 15 MB');
  const crash = await run(new Response('<html>stack trace with secrets</html>', { status: 500 }));
  assert.equal(crash.status, 502); assert.ok(!(await crash.text()).includes('stack trace'));
  const garbage = await run(jsonResponse({ shortId: 'abcdef012345', url: 'https://phish.test/d/abcdef012345' }, 201));
  assert.equal(garbage.status, 502);
  const thrown = await docLinksHandler(await ctx({ method: 'POST', body: pdfForm() }), async () => { throw new Error('network'); });
  assert.equal(thrown.status, 502);
  assert.equal((await docLinksHandler(await ctx({ method: 'DELETE' }), recorder(jsonResponse({})).fetcher)).status, 405);
});

// --- receipts -------------------------------------------------------------

test('receipts: ids are validated, deduplicated, capped, and stats normalized', async () => {
  const ids = ['abcdef012345', 'ABCDEF012345', 'bad', ...Array.from({ length: 60 }, (_, i) => i.toString(16).padStart(12, '0'))];
  const { calls, fetcher } = recorder(jsonResponse({ views: { abcdef012345: { count: 3, lastViewedAt: '2026-10-01T12:00:00.000Z', openedCount: 1, lastOpenedAt: '2026-10-01T12:05:00.000Z', injected: '<script>' }, '000000000000': { count: 'lots' } } }));
  const response = await docLinkViewsHandler(await ctx({ path: `/api/doc-links/views?ids=${ids.join(',')}` }), fetcher);
  assert.equal(response.status, 200);
  const forwarded = new URL(calls[0].url).searchParams.get('ids').split(',');
  assert.equal(forwarded.length, 40);
  assert.equal(new Set(forwarded).size, 40);
  assert.ok(!forwarded.includes('bad'));
  const body = await response.json();
  assert.equal(body.views.abcdef012345.count, 3);
  assert.equal(body.views.abcdef012345.injected, undefined);
  assert.equal(body.views['000000000000'], undefined, 'junk stats are dropped, not shown as viewed');
  assert.equal((await docLinkViewsHandler(await ctx({ method: 'POST', path: '/api/doc-links/views', body: 'x' }), fetcher)).status, 405);
  assert.equal((await docLinkViewsHandler(await ctx({ path: '/api/doc-links/views?ids=' }), fetcher)).status, 200);
});

// --- shared helpers -------------------------------------------------------

test('headline detection mirrors the preview page keyword rules', () => {
  assert.equal(previewHeadline('ROY-MEYRELES-COMBINED-PROOF-OF-INSURANCE.pdf'), 'Your proof of insurance is ready');
  assert.equal(previewTypeForFileName('Paul-Sealy-ID-Cards.pdf'), 'insurance card');
  assert.equal(previewTypeForFileName('hamlin-updated-correct-horse-trailer-quote.pdf'), 'insurance quote');
  assert.equal(previewTypeForFileName('scan0034.pdf'), 'insurance document');
  // Order matters exactly as in the worker: a quote for a customer named Bill is still a quote.
  assert.equal(previewTypeForFileName('Bill-Smith-Insurance-Quote.pdf'), 'insurance quote');
  assert.equal(guessDocType('JACOB-ROQUE-PROOF-OF-INSURANCE.pdf'), 'proof');
  assert.equal(guessDocType('photo.jpg'), 'general');
});

test('customer-facing file names carry the type keyword and keep the extension', () => {
  assert.equal(suggestFileName('scan0034.pdf', 'Roy Meyreles', 'proof'), 'Roy-Meyreles-Proof-of-Insurance.pdf');
  assert.equal(suggestFileName('scan0034.pdf', 'roy meyreles', 'proof'), 'Roy-Meyreles-Proof-of-Insurance.pdf', 'lowercase typing is tidied');
  assert.equal(suggestFileName('scan0034.pdf', 'DeShawn MCDONALD', 'quote'), 'DeShawn-Mcdonald-Insurance-Quote.pdf');
  assert.equal(previewHeadline(suggestFileName('scan0034.pdf', 'Roy Meyreles', 'proof')), 'Your proof of insurance is ready');
  assert.equal(suggestFileName('IMG_2231.JPG', '', 'id-card'), 'Insurance-Card.jpg');
  assert.equal(suggestFileName('JACOB-ROQUE-PROOF-OF-INSURANCE.pdf', '', 'proof'), 'JACOB-ROQUE-PROOF-OF-INSURANCE.pdf', 'an already-descriptive name is kept');
  assert.equal(suggestFileName('Wendy Oquinn Added Sloan.pdf', '', 'general'), 'Wendy-Oquinn-Added-Sloan.pdf');
  for (const type of ['id-card', 'digital-id', 'proof', 'quote', 'receipt', 'billing', 'no-loss', 'cancellation']) {
    const name = suggestFileName('scan.pdf', 'Pat Doe', type);
    assert.notEqual(previewTypeForFileName(name), 'insurance document', `${type} must produce a typed headline`);
  }
  const long = suggestFileName('x.pdf', 'A'.repeat(200), 'quote');
  assert.ok(long.length <= 90 && long.endsWith('.pdf'));
  assert.equal(finalizeFileName('My edited name', '.pdf'), 'My-edited-name.pdf');
  assert.equal(finalizeFileName('already.pdf', '.pdf'), 'already.pdf');
  assert.equal(finalizeFileName('', '.pdf'), 'Document.pdf');
});

test('file validation, messages and links', () => {
  assert.equal(validateDocFile({ name: 'a.pdf', size: 10 }), '');
  assert.match(validateDocFile({ name: 'IMG.heic', size: 10 }), /HEIC/);
  assert.match(validateDocFile({ name: 'big.pdf', size: MAX_DOC_BYTES + 1 }), /15 MB/);
  assert.equal(firstNameOf('ROY MEYRELES'), 'Roy');
  assert.equal(firstNameOf('JC Smith'), 'JC');
  assert.equal(firstNameOf(''), '');
  const message = buildCustomerMessage('proof', 'roy meyreles', good.url);
  assert.ok(message.startsWith('Hi Roy, your proof of insurance is ready.'));
  assert.ok(message.includes(good.url) && message.includes('(336) 835-1993'));
  assert.ok(buildCustomerMessage('general', '', good.url).startsWith('Hi, the document you asked about is ready.'));
  assert.equal(emailSubject('quote'), 'Your insurance quote from Bill Layne Insurance');
  const gmail = new URL(gmailComposeUrl('Subject & more', 'Line 1\nLine 2'));
  assert.equal(gmail.hostname, 'mail.google.com');
  assert.equal(gmail.searchParams.get('authuser'), 'Bill@billlayneinsurance.com');
  assert.equal(gmail.searchParams.get('su'), 'Subject & more');
  assert.equal(gmail.searchParams.get('body'), 'Line 1\nLine 2');
  assert.equal(staffTestUrl(good.url), good.url + '?ref=staff');
  assert.ok(isSafeDocLinkUrl(good.url));
  for (const bad of ['http://docs.billlayneinsurance.com/d/abcdef012345', 'https://docs.billlayneinsurance.com/d/abcdef01234', 'https://evil.test/d/abcdef012345', 'https://docs.billlayneinsurance.com/d/abcdef012345?x=1']) {
    assert.equal(isSafeDocLinkUrl(bad), false, bad);
  }
});

test('receipts read Saved > Opened > Viewed > Not viewed, like the SMS thread', () => {
  assert.equal(describeReceipt(null).tone, 'none');
  assert.equal(describeReceipt(normalizeViewStats({ count: 2, lastViewedAt: '2026-10-01T12:00:00Z' })).tone, 'viewed');
  assert.match(describeReceipt(normalizeViewStats({ count: 2, lastViewedAt: '2026-10-01T12:00:00Z' })).label, /Viewed 2×/);
  assert.equal(describeReceipt(normalizeViewStats({ count: 2, openedCount: 1, lastOpenedAt: '2026-10-01T12:00:00Z' })).tone, 'opened');
  assert.equal(describeReceipt(normalizeViewStats({ count: 2, openedCount: 1, downloadedCount: 1, lastDownloadedAt: '2026-10-01T12:00:00Z' })).tone, 'saved');
  assert.equal(normalizeViewStats({ count: 0 }), null);
  const item = normalizeDocLinkItem(good);
  assert.ok(matchesDocQuery(item, 'meyreles proof'));
  assert.ok(matchesDocQuery(item, 'ROY'));
  assert.ok(!matchesDocQuery(item, 'quote'));
});

test('the staff dashboard tags its links as staff-dashboard; a smuggled source is ignored', async () => {
  const staffEnv = { ...env, APP_ID: 'agency-staff-dashboard' };
  const { calls, fetcher } = recorder(jsonResponse({ ...good, source: 'staff-dashboard' }, 201));
  const response = await docLinksHandler(await ctx({ method: 'POST', e: staffEnv, body: pdfForm('scan.pdf', 2048, { source: 'command-center' }) }), fetcher);
  assert.equal(response.status, 201);
  assert.equal(calls[0].init.body.getAll('source').length, 1);
  assert.equal(calls[0].init.body.get('source'), 'staff-dashboard');
  assert.equal((await response.json()).item.source, 'staff-dashboard');
});

test('library sources and the text-message preview', () => {
  assert.equal(normalizeDocLinkItem({ ...good, source: 'staff-dashboard' }).source, 'staff-dashboard');
  assert.equal(normalizeDocLinkItem({ ...good, source: 'evil' }).source, 'sms');
  assert.equal(sourceLabel('staff-dashboard'), 'Staff Dashboard');
  assert.equal(sourceLabel('command-center'), 'Command Center');
  assert.equal(previewLinkTitle('Roy-Meyreles-Proof-of-Insurance.pdf'), 'Your proof of insurance is ready | Bill Layne Insurance');
  assert.equal(TEXT_PREVIEW_IMAGE, '/doc-link-text-preview.jpg');
});
