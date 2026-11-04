import test from 'node:test';
import assert from 'node:assert/strict';
import { QUOTE_FIELDS, normalizeResearch, newQuoteDraft, restoreQuoteDraft, quoteGaps, propertyConflicts, buildHomeQuoteReport, safePropertyUrl, answerWarnings } from '../shared/homeQuote.ts';
import { homeQuoteHandler, HOME_PROPERTY_ENDPOINT } from '../server/homeQuote.ts';
import { createSession, cookieName } from '../server/auth.ts';

const address = '123 Example St, Elkin, NC 28621';
const fixture = { formattedAddress: address, results: [{
  id: 'synthetic-1', officialAddress: '123 EXAMPLE ST', county: 'Surry', parcelId: 'TEST-ONLY',
  yearBuilt: 1990, heatedArea: 1600, fullBaths: 2, halfBaths: 0, totalValue: 200000,
  hasCountyRecord: true, recordAddressDiffers: false, matchMethod: 'address',
  ownerName: 'Must never be copied', dob: 'Private field', roofAge: 'Invented',
  links: { taxCard: 'https://county.example/card/TEST-ONLY', gis: 'javascript:alert(1)', deed: 'https://user:password@example.com/' },
}] };
const env = { SITE_PASSWORD: 'synthetic-only', SESSION_SECRET: 'synthetic-session-secret-for-test-only-32' };
const origin = 'https://dashboard.test';
async function context(body = { address }, extraHeaders = {}) {
  return { env, next: async () => new Response(), request: new Request(origin + '/api/home-quote', {
    method: 'POST', headers: { origin, 'content-type': 'application/json', cookie: `${cookieName(env)}=${await createSession(env)}`, ...extraHeaders }, body: JSON.stringify(body),
  }) };
}
function draftWithProperty() {
  const draft = newQuoteDraft(address);
  draft.research = normalizeResearch(fixture, address);
  draft.selectedId = draft.research.results[0].id;
  return draft;
}

test('public property normalization is allowlisted, preserves zero and strips unsafe links', () => {
  const result = normalizeResearch(fixture, address);
  assert.equal(result.results[0].facts.halfBaths, '0');
  assert.equal(result.results[0].facts.roofAge, undefined);
  assert.equal(result.results[0].ownerName, undefined);
  assert.equal(result.results[0].links.gis, undefined);
  assert.equal(result.results[0].links.deed, undefined);
  assert.equal(safePropertyUrl('data:text/html,<script>'), '');
  assert.throws(() => normalizeResearch({ html: 'unexpected' }, address));
});
test('missing public data and unknown answers stay unresolved; assessments never prefill coverage', () => {
  const draft = draftWithProperty();
  draft.answers = { claims: 'Needs verification', name: 'Synthetic Prospect' };
  const gaps = quoteGaps(draft);
  assert.ok(gaps.includes('Property / parcel match needs verification'));
  assert.ok(gaps.includes('Roof age / replacement year'));
  assert.ok(gaps.includes('Any prior claims or losses?'));
  assert.ok(gaps.includes('Current dwelling coverage (Coverage A)'));
  assert.equal(draft.answers.coverageA, undefined);
  draft.answers.policyStatus = 'No current policy';
  assert.equal(quoteGaps(draft).includes('Current dwelling coverage (Coverage A)'), false);
  assert.match(buildHomeQuoteReport(draft), /Not applicable - prospect reports no current policy/);
  draft.confirmed = true;
  assert.equal(quoteGaps(draft).includes('Property / parcel match needs verification'), false);
});
test('geocode-only result cannot be treated as a verified parcel; positive claims require details', () => {
  const draft = draftWithProperty();
  draft.research.results[0].hasCountyRecord = false;
  draft.confirmed = true;
  draft.answers.claims = 'Yes';
  assert.ok(quoteGaps(draft).includes('Property / parcel match needs verification'));
  assert.ok(quoteGaps(draft).includes('Claim details'));
});
test('prospect values never overwrite public facts and numeric conflicts are visible', () => {
  const draft = draftWithProperty();
  draft.answers = { yearBuilt: '1989', heatedArea: '1,600' };
  assert.equal(propertyConflicts(draft).length, 1);
  assert.equal(draft.research.results[0].facts.yearBuilt, '1990');
  assert.match(buildHomeQuoteReport(draft), /public record 1990; prospect 1989/);
});
test('HTML export escapes every user value, retains full indexed interview and marks missing values', () => {
  const draft = draftWithProperty();
  draft.answers = { name: '<script>alert(1)</script>', notes: 'Line 1\nLine 2' };
  draft.research.results[0].officialAddress = '<img src=x onerror=alert(1)>';
  const html = buildHomeQuoteReport(draft);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<img src=x'));
  assert.match(html, /Not shown/);
  for (const section of ['review', 'property', 'applicant', 'home', 'systems', 'coverage', 'risk', 'sources']) assert.ok(html.includes(`id="${section}"`));
  assert.match(html, /not replacement cost/);
  assert.match(html, /not independently parsed or verified/);
});
test('editable draft roundtrip retains answers and facts but requires match reconfirmation', () => {
  const draft = draftWithProperty();
  draft.answers = { name: 'Synthetic Prospect', occupancy: 'Primary residence', arbitrary: 'Do not restore' };
  draft.confirmed = true;
  const restored = restoreQuoteDraft(JSON.parse(JSON.stringify(draft)));
  assert.equal(restored.confirmed, false);
  assert.equal(restored.answers.name, 'Synthetic Prospect');
  assert.equal(restored.answers.arbitrary, undefined);
  assert.equal(restored.research.results[0].facts.yearBuilt, '1990');
  assert.equal(restored.research.results[0].id, restored.selectedId);
  assert.equal(restored.research.retrievedAt, draft.research.retrievedAt);
  assert.throws(() => restoreQuoteDraft({ version: 7, address }));
  const wrongAddress = restoreQuoteDraft({ ...draft, address: '456 Other St, Elkin NC' });
  assert.equal(wrongAddress.research, null);
});
test('date validation catches future DOB, impossible dates and invalid emails', () => {
  assert.equal(answerWarnings({ dob: '2026-02-30', email: 'bad' }).length, 2);
  assert.equal(answerWarnings({ dob: '2099-01-01' }).length, 1);
  assert.equal(answerWarnings({ dob: '1980-02-20', email: 'test@example.com' }).length, 0);
});
test('all interview answers may be blank when saving, restoring and creating a report', () => {
  const draft = newQuoteDraft(address);
  draft.answers = Object.fromEntries(QUOTE_FIELDS.map(field => [field.key, '']));
  assert.deepEqual(answerWarnings(draft.answers), []);
  const restored = restoreQuoteDraft(JSON.parse(JSON.stringify(draft)));
  assert.deepEqual(restored.answers, {});
  const html = buildHomeQuoteReport(restored);
  assert.match(html, /All interview questions are optional; unanswered items do not block this report/);
  assert.match(html, /Follow-Up Notes/);
  for (const field of QUOTE_FIELDS) assert.equal(draft.answers[field.key], '');
  assert.match(html, /Current dwelling coverage \(Coverage A\)<\/dt><dd class="missing">Not shown/);
  assert.match(html, /Renewal \/ expiration date<\/dt><dd class="missing">Not shown/);
});
test('an insured prospect can export without dwelling amount or renewal and keep existing answers', () => {
  const draft = newQuoteDraft(address);
  draft.answers = { policyStatus: 'Currently insured', coApplicant: 'Synthetic Additional Insured' };
  const restored = restoreQuoteDraft(JSON.parse(JSON.stringify(draft)));
  const html = buildHomeQuoteReport(restored);
  assert.deepEqual(restored.answers, draft.answers);
  assert.match(html, /Currently insured/);
  assert.match(html, /Synthetic Additional Insured/);
  assert.match(html, /Current dwelling coverage \(Coverage A\)<\/dt><dd class="missing">Not shown/);
  assert.match(html, /Renewal \/ expiration date<\/dt><dd class="missing">Not shown/);
  assert.doesNotMatch(html, /Not applicable - prospect reports no current policy/);
});
test('public research fills the matching Home and Roof report rows without filling prospect answers', () => {
  const draft = draftWithProperty();
  Object.assign(draft.research.results[0].facts, { exteriorWall: 'Brick veneer', foundation: 'Crawlspace', stories: '2', roofCover: 'Shingle', roofStructure: 'Gable', heatingType: 'Heat pump' });
  const html = buildHomeQuoteReport(draft);
  const home = html.split('<section id="home">')[1].split('</section>')[0];
  const systems = html.split('<section id="systems">')[1].split('</section>')[0];
  for (const fact of ['1990', '1600', 'Exterior wall: Brick veneer', 'Foundation: Crawlspace', 'Stories: 2', 'Full baths: 2', 'Half baths: 0']) assert.ok(home.includes(fact), fact);
  for (const fact of ['Roof covering: Shingle', 'Roof structure: Gable', 'Heating: Heat pump']) assert.ok(systems.includes(fact), fact);
  assert.match(home, /Public record \(property match unconfirmed\)/);
  assert.match(home, /prospect confirmation not entered/);
  assert.match(systems, /Roof age \/ replacement year<\/dt><dd class="missing">Not shown/);
  assert.deepEqual(draft.answers, {});
  assert.match(html, /Current dwelling coverage \(Coverage A\)<\/dt><dd class="missing">Not shown/);
});
test('report keeps both sources when prospect answers conflict and follows the selected parcel', () => {
  const draft = draftWithProperty();
  draft.answers = { yearBuilt: '1989', heatedArea: '1,700', construction: '<img src=x onerror=alert(1)>' };
  draft.research.results[0].facts.exteriorWall = '<script>never run</script>';
  draft.confirmed = true;
  const html = buildHomeQuoteReport(draft);
  const home = html.split('<section id="home">')[1].split('</section>')[0];
  for (const fact of ['1989', '1990', '1,700', '1600', 'Prospect / staff entry', 'Public record (property match checked)']) assert.ok(home.includes(fact), fact);
  assert.match(home, /&lt;img/);
  assert.match(home, /&lt;script&gt;/);
  assert.doesNotMatch(home, /<script>|<img/);
  assert.match(html, /public record 1990; prospect 1989/);
  draft.research.results.push({ ...draft.research.results[0], id: 'other-parcel', facts: { yearBuilt: '2015' } });
  draft.selectedId = 'other-parcel';
  draft.confirmed = false;
  const otherHome = buildHomeQuoteReport(draft).split('<section id="home">')[1].split('</section>')[0];
  assert.match(otherHome, /2015/);
  assert.doesNotMatch(otherHome, /1990|1600|property match checked/);
  assert.equal(draft.answers.yearBuilt, '1989');
});
test('research endpoint requires signed session and same origin', async () => {
  const noSession = await context();
  noSession.request.headers.delete('cookie');
  assert.equal((await homeQuoteHandler(noSession)).status, 401);
  assert.equal((await homeQuoteHandler(await context(undefined, { origin: 'https://other.test' }))).status, 403);
});
test('research endpoint accepts only address, never sends interview answers upstream', async () => {
  assert.equal((await homeQuoteHandler(await context({ address, dob: '1980-01-01' }))).status, 400);
  assert.equal((await homeQuoteHandler(await context({ address: 'oops' }))).status, 400);
  let captured;
  const response = await homeQuoteHandler(await context(), async (url, options) => {
    captured = { url, body: JSON.parse(options.body), headers: options.headers };
    return Response.json(fixture);
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(captured.url, HOME_PROPERTY_ENDPOINT);
  assert.deepEqual(captured.body, { address });
  assert.equal(captured.headers.cookie, undefined);
  assert.equal((await response.json()).results.length, 1);
});
test('upstream errors are recoverable and do not leak provider details', async () => {
  for (const fetcher of [async () => new Response('sensitive provider detail', { status: 524 }), async () => Response.json({ wrong: true }), async () => { throw new Error('sensitive'); }]) {
    const response = await homeQuoteHandler(await context(), fetcher);
    assert.equal(response.status, 502);
    assert.ok(!(await response.text()).includes('sensitive'));
  }
  const empty = await homeQuoteHandler(await context(), async () => Response.json({ formattedAddress: address, results: [] }));
  assert.equal((await empty.json()).results.length, 0);
});
