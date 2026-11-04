import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, cookieName } from '../server/auth.ts';
import { homeDeclarationHandler } from '../server/homeDeclaration.ts';
import { normalizeHomeDeclaration, mergeHomeDeclaration } from '../shared/homeDeclaration.ts';
import { buildHomeQuoteReport, newQuoteDraft, quoteGaps, restoreQuoteDraft } from '../shared/homeQuote.ts';

const address = '123 Fictional Lane, Elkin, NC 28621';
const env = { APP_ID: 'agency-staff-dashboard', SITE_PASSWORD: 'test-password', SESSION_SECRET: 'only-synthetic-test-secret-32-characters', GEMINI_API_KEY: 'secret-test-key', GEMINI_MODEL: 'test-model' };
const origin = 'https://dashboard.test';
const png = Buffer.from('\x89PNG\r\n\x1a\nSYNTHETIC', 'latin1').toString('base64');
async function context(body, { signed = true, requestOrigin = origin, method = 'POST' } = {}) {
  const headers = { origin: requestOrigin, 'content-type': 'application/json', ...(signed ? { cookie: `${cookieName(env)}=${await createSession(env)}` } : {}) };
  return { env, next: async () => new Response(), request: new Request(origin + '/api/home-declaration', { method, headers, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) }) };
}
const extracted = { documentType: 'current', riskAddress: address, answers: { name: 'Avery Example', occupancy: 'Primary residence', homeType: 'Site-built single family', yearBuilt: '2002', heatedArea: '3644', coverageA: '$350,000', deductible: '$1,000', deductibles: 'All-peril $1,000; wind/hail 2% of Coverage A', roofAge: '2018', claims: 'No', policyStatus: 'Currently insured', effectiveDate: '2027-01-01', ssn: 'never-retain' } };
test('only allowed printed fields survive and renewal is not treated as the expiring policy', () => {
  const result = normalizeHomeDeclaration({ ...extracted, documentType: 'renewal', answers: { ...extracted.answers, carrier: 'Example Mutual', renewalDate: '2027-12-01' } });
  assert.equal(result.answers.name, 'Avery Example');
  for (const key of ['coverageA', 'carrier', 'renewalDate', 'policyStatus', 'claims', 'effectiveDate', 'ssn']) assert.equal(result.answers[key], undefined, key);
  assert.match(result.answers.deductibles, /2% of Coverage A/);
});
test('starting from a document preserves its identity, marks sources, and requests property research', () => {
  const result = mergeHomeDeclaration(newQuoteDraft(), normalizeHomeDeclaration(extracted), address);
  assert.equal(result.needsResearch, true); assert.equal(result.draft.address, address);
  assert.equal(result.draft.answers.coverageA, '$350,000');
  assert.equal(result.draft.documentValues.coverageA, '$350,000');
  assert.ok(quoteGaps(result.draft).some(gap => /Policy document details need verification/.test(gap)));
  const restored = restoreQuoteDraft(JSON.parse(JSON.stringify(result.draft)));
  assert.equal(restored.documentValues.coverageA, '$350,000');
  assert.match(buildHomeQuoteReport(restored), /Policy document \(unverified\)/);
  restored.answers.coverageA = '$400,000';
  assert.doesNotMatch(buildHomeQuoteReport(restored), /\$400,000<\/div><div class="source">Policy document/);
});
test('existing answers and public property research survive, with conflicts reported', () => {
  const draft = newQuoteDraft(address); draft.answers = { name: 'Avery Example', yearBuilt: '1999' };
  draft.research = { address, formattedAddress: address, retrievedAt: '2026-01-01', note: '', results: [] }; draft.confirmed = true;
  const result = mergeHomeDeclaration(draft, normalizeHomeDeclaration(extracted), address);
  assert.equal(result.needsResearch, false); assert.equal(result.draft.answers.yearBuilt, '1999');
  assert.equal(result.draft.research, draft.research); assert.equal(result.draft.confirmed, true); assert.ok(result.skipped);
  assert.equal(draft.answers.heatedArea, undefined);
});
test('a different home or named insured never replaces an existing draft', () => {
  const draft = newQuoteDraft(address); draft.answers.name = 'Avery Example';
  assert.throws(() => mergeHomeDeclaration(draft, normalizeHomeDeclaration(extracted), '999 Different Road, Elkin, NC 28621'), /does not match/);
  assert.throws(() => mergeHomeDeclaration(draft, normalizeHomeDeclaration({ ...extracted, answers: { name: 'Different Person' } }), address), /named insured differs/i);
  assert.throws(() => mergeHomeDeclaration(draft, normalizeHomeDeclaration({ answers: { yearBuilt: '2002' } }), address), /named insured was not found/i);
  assert.throws(() => mergeHomeDeclaration(newQuoteDraft(), normalizeHomeDeclaration(extracted), ''), /full property address/);
});
test('reader requires staff sign-in, same origin, and a valid file', async () => {
  const never = () => { throw Error('must not call provider'); };
  assert.equal((await homeDeclarationHandler(await context({ mimeType: 'image/png', data: png }, { signed: false }), never)).status, 401);
  assert.equal((await homeDeclarationHandler(await context({ mimeType: 'image/png', data: png }, { requestOrigin: 'https://other.test' }), never)).status, 403);
  assert.equal((await homeDeclarationHandler(await context({ mimeType: 'image/png', data: png, extra: 'not allowed' }), never)).status, 400);
  assert.equal((await homeDeclarationHandler(await context({ mimeType: 'application/pdf', data: png }), never)).status, 400);
});
test('reader keeps mailing and risk addresses distinct and refuses unsupported roof age and dwelling limit', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    const text = calls === 1 ? `Named insured: Avery Example\nMailing address: ${address}\nYear built: 2002\nTax assessed value: $350,000` : JSON.stringify(extracted);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] }), { status: 200 });
  };
  const res = await homeDeclarationHandler(await context({ mimeType: 'image/png', data: png }), fetcher);
  const result = await res.json();
  assert.equal(res.status, 200); assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(result.riskAddress, ''); assert.equal(result.answers.roofAge, undefined); assert.equal(result.answers.coverageA, undefined);
  assert.equal(result.answers.occupancy, undefined); assert.equal(result.answers.homeType, undefined);
  assert.equal(result.answers.claims, undefined); assert.equal(result.answers.effectiveDate, undefined);
  assert.doesNotMatch(JSON.stringify(result), /secret-test-key|never-retain/);
});
test('an explicitly labeled property address and dwelling limit are accepted', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    const text = calls === 1 ? `Named insured: Avery Example\nProperty address: ${address}\nCoverage A Dwelling: $350,000\nRoof replacement year: 2018` : JSON.stringify(extracted);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] }), { status: 200 });
  };
  const res = await homeDeclarationHandler(await context({ mimeType: 'image/png', data: png }), fetcher);
  const result = await res.json();
  assert.equal(result.riskAddress, address); assert.equal(result.answers.coverageA, '$350,000'); assert.equal(result.answers.roofAge, '2018');
});
test('failed or truncated reads leave the existing interview untouched', async () => {
  const fail = async () => new Response(JSON.stringify({ candidates: [{ finishReason: 'MAX_TOKENS' }] }), { status: 200 });
  assert.equal((await homeDeclarationHandler(await context({ mimeType: 'image/png', data: png }), fail)).status, 422);
});
