import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, cookieName } from '../server/auth.ts';
import { autoDeclarationHandler } from '../server/autoDeclaration.ts';
import { normalizeDeclaration, mergeDeclaration } from '../shared/autoDeclaration.ts';
import { newAutoQuoteDraft } from '../shared/autoQuote.ts';

const env = { APP_ID: 'agency-staff-dashboard', SITE_PASSWORD: 'test-password', SESSION_SECRET: 'only-synthetic-test-secret-32-characters', GEMINI_API_KEY: 'secret-test-key', GEMINI_MODEL: 'test-model' };
const base = 'https://dashboard.test';
const png = Buffer.from('\x89PNG\r\n\x1a\nSYNTHETIC', 'latin1').toString('base64');
async function context(body, { signed = true, origin = base, method = 'POST' } = {}) {
  const headers = { origin, 'content-type': 'application/json', ...(signed ? { cookie: `${cookieName(env)}=${await createSession(env)}` } : {}) };
  return { env, next: async () => new Response(), request: new Request(base + '/api/auto-declaration', { method, headers, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) }) };
}
const extracted = {
  documentType: 'current',
  answers: { name: 'Avery Example', carrier: 'Example Mutual', currentBi: '100/300', expirationDate: '2027-05-01', effectiveDate: '2027-05-01', consumerConsent: 'Confirmed', policyStatus: 'Currently insured', ssn: 'sensitive-never-retained', medPay: '$1,000' },
  drivers: [{ name: 'Avery Example', status: 'Rated', incidents: 'None reported', dlNumber: 'do-not-retain' }, { name: 'Morgan Example', status: 'Excluded' }],
  vehicles: [{ vin: '1HGCM82633A004352', year: '2003', make: 'Honda', model: 'Accord', collision: '$500' }],
};
test('only supported evidence survives; sensitive, inferred and malformed fields are ignored', () => {
  const data = normalizeDeclaration({ ...extracted, answers: { ...extracted.answers, dob: '2027-99-99', zip: 'ABCDE' }, vehicles: [{ vin: '4321', year: '2003', make: 'Honda', model: 'Accord' }] });
  assert.deepEqual(Object.keys(data.answers).sort(), ['carrier', 'currentBi', 'expirationDate', 'medPay', 'name']);
  assert.equal(data.drivers[0].incidents, undefined); assert.equal(data.drivers[0].dlNumber, undefined);
  assert.equal(data.drivers[1].status, 'Excluded'); assert.equal(data.vehicles[0].vin, undefined);
});
test('renewal dates and carrier do not become facts about the current policy', () => {
  const d = normalizeDeclaration({ ...extracted, documentType: 'renewal' });
  assert.equal(d.answers.carrier, undefined);
  assert.equal(d.answers.currentBi, undefined);
  assert.equal(d.answers.expirationDate, undefined);
});
test('only empty answers and matching items are filled; conflicts are retained', () => {
  const draft = newAutoQuoteDraft('Avery Example');
  draft.answers.carrier = 'Kept Carrier';
  draft.drivers = [{ name: 'Avery Example', status: 'Other insurance' }];
  draft.vehicles = [{ vin: '1HGCM82633A004352', year: '2003', make: 'Honda', model: 'Accord', collision: '$1,000' }];
  const result = mergeDeclaration(draft, normalizeDeclaration(extracted));
  assert.equal(result.draft.answers.carrier, 'Kept Carrier');
  assert.equal(result.draft.answers.currentBi, '100/300');
  assert.equal(result.draft.drivers[0].status, 'Other insurance');
  assert.equal(result.draft.drivers[1].status, 'Excluded');
  assert.equal(result.draft.vehicles.length, 1);
  assert.equal(result.draft.vehicles[0].collision, '$1,000');
  assert.ok(result.skipped >= 3);
  assert.equal(draft.answers.currentBi, undefined, 'original is not mutated');
});
test('a different or unidentifiable prospect cannot be merged into an existing draft', () => {
  assert.throws(() => mergeDeclaration(newAutoQuoteDraft('Other Person'), normalizeDeclaration(extracted)), /different insured/);
  assert.throws(() => mergeDeclaration(newAutoQuoteDraft('Avery Example'), normalizeDeclaration({ vehicles: extracted.vehicles })), /named insured/);
  const draft = newAutoQuoteDraft('Avery Example'); draft.vehicles = [{ year: '2022', make: 'Toyota', model: 'Camry' }];
  const result = mergeDeclaration(draft, normalizeDeclaration({ answers: { name: 'Avery Example' }, vehicles: [{ year: '2019', make: 'Ford', model: 'F150' }] }));
  assert.equal(result.draft.vehicles.length, 1); assert.equal(result.skipped, 1);
});
test('a fresh quote can import several distinct vehicles without a full VIN', () => {
  const data = normalizeDeclaration({ answers: { name: 'Avery Example' }, vehicles: [
    { year: '2003', make: 'Honda', model: 'Accord', vin: '1HGCM82633A004352' },
    { year: '2018', make: 'Ford', model: 'Escape', collision: '$500' },
  ] });
  const result = mergeDeclaration(newAutoQuoteDraft(), data);
  assert.equal(result.draft.vehicles.length, 2);
  assert.equal(result.draft.vehicles[1].model, 'Escape');
  assert.equal(result.draft.vehicles[1].collision, '$500');
});
test('reader requires a staff session, same origin and an actual supported file', async () => {
  const never = () => { throw Error('must not call provider'); };
  assert.equal((await autoDeclarationHandler(await context({ mimeType: 'image/png', data: png }, { signed: false }), never)).status, 401);
  assert.equal((await autoDeclarationHandler(await context({ mimeType: 'image/png', data: png }, { origin: 'https://other.test' }), never)).status, 403);
  assert.equal((await autoDeclarationHandler(await context({ mimeType: 'image/png', data: png, customer: 'unexpected' }), never)).status, 400);
  assert.equal((await autoDeclarationHandler(await context({ mimeType: 'application/pdf', data: png }), never)).status, 400);
});
test('reader transcribes a photo and returns a sanitized result', async () => {
  const providerBodies = [];
  const fetcher = async (_url, init) => {
    const providerBody = JSON.parse(init.body); providerBodies.push(providerBody);
    if (providerBodies.length === 1) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Named insured: Avery Example' }] }, finishReason: 'STOP' }] }), { status: 200 });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(extracted) }] }, finishReason: 'STOP' }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const res = await autoDeclarationHandler(await context({ mimeType: 'image/png', data: png }), fetcher);
  assert.equal(res.status, 200); assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(providerBodies[0].contents[0].parts[1].inlineData.data, png);
  assert.match(providerBodies[1].contents[0].parts[1].text, /Named insured: Avery Example/);
  const value = await res.json(); assert.equal(value.answers.name, 'Avery Example');
  assert.equal(value.answers.consumerConsent, undefined); assert.equal(value.drivers[0].dlNumber, undefined);
  assert.doesNotMatch(JSON.stringify(value), /secret-test-key|sensitive-never-retained/);
});
test('truncated or unreadable provider replies never change the draft', async () => {
  const truncated = async () => new Response(JSON.stringify({ candidates: [{ finishReason: 'MAX_TOKENS' }] }), { status: 200 });
  assert.equal((await autoDeclarationHandler(await context({ mimeType: 'image/png', data: png }), truncated)).status, 422);
  const bad = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }), { status: 200 });
  assert.equal((await autoDeclarationHandler(await context({ mimeType: 'image/png', data: png }), bad)).status, 422);
});
test('unprinted driver statuses, policy limits and VINs are not accepted from the model', async () => {
  const fetcher = async (_url, init) => {
    const body = JSON.parse(init.body), schema = body.generationConfig.responseSchema;
    let text = 'Renewal Declarations\nNamed insured: Avery Example\nDriver: Avery Example\nBodily Injury: $100,000/$300,000\nVehicle: 2003 Honda Accord';
    if (schema?.properties?.answers) text = JSON.stringify({ documentType: 'current', answers: { name: 'Avery Example', liability: '100/300 & 100 PD', currentBi: '100/300', expirationDate: '2027-10-01', carrier: 'Example Mutual' } });
    else if (schema?.properties?.drivers) text = JSON.stringify({ drivers: [{ name: 'Avery Example', status: 'Rated' }, { name: 'Imaginary Driver', status: 'Rated' }] });
    else if (schema?.properties?.vehicles) text = JSON.stringify({ vehicles: [{ year: '2003', make: 'Honda', model: 'Accord', vin: '1HGCM82633A004352' }] });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] }), { status: 200 });
  };
  const res = await autoDeclarationHandler(await context({ mimeType: 'image/png', data: png }), fetcher);
  const data = await res.json();
  assert.equal(data.documentType, 'renewal');
  assert.equal(data.answers.liability, undefined);
  assert.equal(data.answers.currentBi, undefined);
  assert.equal(data.answers.expirationDate, undefined);
  assert.equal(data.answers.carrier, undefined);
  assert.equal(data.drivers.length, 1);
  assert.equal(data.drivers[0].status, undefined);
  assert.equal(data.vehicles[0].vin, undefined);
});
test('explicit vehicle rows are preserved when structured extraction omits them', async () => {
  const fetcher = async (_url, init) => {
    const body = JSON.parse(init.body), schema = body.generationConfig.responseSchema;
    let text = 'Named insured: Avery Example\nVehicle 1: 2003 Honda Accord\nVIN: 1HGCM82633A004352\nVehicle 1 Collision deductible: $1,000\nVehicle 2: 2018 Ford Escape\nVehicle 2 Collision deductible: $500';
    if (schema?.properties?.answers) text = JSON.stringify({ documentType: 'unknown', answers: { name: 'Avery Example' } });
    else if (schema?.properties?.drivers) text = JSON.stringify({ drivers: [] });
    else if (schema?.properties?.vehicles) text = JSON.stringify({ vehicles: [] });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] }), { status: 200 });
  };
  const res = await autoDeclarationHandler(await context({ mimeType: 'image/png', data: png }), fetcher);
  const data = await res.json();
  assert.equal(data.vehicles.length, 2);
  assert.equal(data.vehicles[0].vin, '1HGCM82633A004352');
  assert.equal(data.vehicles[0].collision, '$1,000');
  assert.equal(data.vehicles[1].model, 'Escape');
  assert.equal(data.vehicles[1].collision, '$500');
});

test('multi-page table recovers each individual driver, vehicle and deductible', async () => {
  const transcription = `LETTER OF COVERAGE
Named insured: Avery Example, Morgan Example
Driver 1: Avery Example | Rated Driver
Driver 2: Morgan Example | Rated Driver
Driver 3: Taylor Example | Rated Driver
Vehicle 1: 2003 | Honda | Accord | VIN: 1HGCM82633A004352
Other Than Collision: $100
Vehicle 2: 2018 | Ford | Escape | VIN: 1FTFW1EF1EFA00001
Other Than Collision: $500
Collision: $1,000
Vehicle 3: 2019 | Toyota | Camry | VIN: 2C3CDXBG0JH100000
Other Than Collision: $500
Page 2
Collision: $1,000
Vehicle 4: 2020 | Honda | Civic | VIN: 5YJ3E1EA7KF317000
Other Than Collision: $100`;
  const fetcher = async (_url, init) => {
    const schema = JSON.parse(init.body).generationConfig.responseSchema;
    let value = transcription;
    if (schema?.properties?.answers) value = JSON.stringify({ documentType: 'unknown', namedInsureds: ['Avery Example', 'Morgan Example'], answers: { name: 'Avery Example, Morgan Example' } });
    else if (schema?.properties?.drivers) value = JSON.stringify({ drivers: [{ name: 'Avery Example, Morgan Example' }] });
    else if (schema?.properties?.vehicles) value = JSON.stringify({ vehicles: [{ year: '2003', make: 'Honda', model: 'Accord', vin: '1HGCM82633A004352' }] });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: value }] }, finishReason: 'STOP' }] }));
  };
  const res = await autoDeclarationHandler(await context({ mimeType: 'image/png', data: png }), fetcher);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.answers.name, 'Avery Example');
  assert.equal(data.answers.additionalNamedInsured, 'Morgan Example');
  assert.deepEqual(data.drivers.map(d => d.name), ['Avery Example', 'Morgan Example', 'Taylor Example']);
  assert.equal(data.vehicles.length, 4);
  assert.deepEqual(data.vehicles.map(v => v.comprehensive), ['$100', '$500', '$500', '$100']);
  assert.deepEqual(data.vehicles.map(v => v.collision || ''), ['', '$1,000', '$1,000', '']);
  const merged = mergeDeclaration(newAutoQuoteDraft(), data).draft;
  assert.equal(merged.vehicles.length, 4);
  assert.equal(merged.drivers.length, 3);
  assert.equal(merged.answers.additionalNamedInsured, 'Morgan Example');
});

test('a single last-name-first insured is not split into two people', async () => {
  const fetcher = async (_url, init) => {
    const schema = JSON.parse(init.body).generationConfig.responseSchema;
    let value = 'Named insured: Example, Avery';
    if (schema?.properties?.answers) value = JSON.stringify({ answers: { name: 'Example, Avery' }, namedInsureds: ['Example, Avery'] });
    else if (schema?.properties?.drivers) value = JSON.stringify({ drivers: [] });
    else if (schema?.properties?.vehicles) value = JSON.stringify({ vehicles: [] });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: value }] } }] }));
  };
  const data = await (await autoDeclarationHandler(await context({ mimeType: 'image/png', data: png }), fetcher)).json();
  assert.equal(data.answers.name, 'Example, Avery');
  assert.equal(data.answers.additionalNamedInsured, undefined);
});
