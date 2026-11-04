import test from 'node:test';
import assert from 'node:assert/strict';
import {
  POLICY_FIELDS, DRIVER_FIELDS, VEHICLE_FIELDS, MAX_DRIVERS, newAutoQuoteDraft, restoreAutoQuoteDraft, draftHasContent,
  looksLikeProspectName, autoQuoteGaps, autoAnswerWarnings, vehicleConflicts, buildAutoQuoteReport, buildAutoQuotePacket,
  packetBlockers, packetFileName, packetPrompt, splitName, decodeFromSummary, NATIONAL_GENERAL_PROMPT, quoteSkillPrompt,
} from '../shared/autoQuote.ts';
import { summarizeVehicle } from '../shared/vin.ts';

// Synthetic data only. 1HGCM82633A004352 is NHTSA's own sample VIN (2003 Honda Accord).
const VIN = '1HGCM82633A004352';
const decode = (vin = VIN, raw = {}) => decodeFromSummary(summarizeVehicle(vin, { ModelYear: '2003', Make: 'HONDA', Model: 'Accord', Trim: 'EX-V6', BodyClass: 'Sedan/Saloon', ErrorCode: '0', ...raw }), new Date('2026-10-27T12:00:00Z'));
const today = new Date('2026-10-27T12:00:00Z');
function sampleDraft() {
  const draft = newAutoQuoteDraft('Robin Testcase');
  draft.answers = { ...draft.answers, dob: '1985-04-15', phone: '336-835-1993', street: '101 N Bridge St', city: 'Elkin', zip: '28621', effectiveDate: '2026-11-01',
    liability: '100/300 & 50 PD', medPay: '$1,000', carriers: 'Progressive, National General', policyStatus: 'Currently insured', carrier: 'Farm Bureau', yearsWithCarrier: '4', currentBi: '100/300', expirationDate: '2026-11-01', lapse: 'No', claims: 'No' };
  draft.drivers = [{ name: 'Robin Testcase', dob: '1985-04-15', relationship: 'Named Insured', incidents: 'None reported' }];
  draft.vehicles = [{ vin: VIN, usage: 'Commute < 10 mi', ownership: 'Financed', lienholder: 'Synthetic Credit Union', comprehensive: '$500', collision: '$500', towing: 'Yes', rental: '$50 / $1,500' }];
  draft.decodes[VIN] = decode();
  return draft;
}

test('new drafts start with one empty driver and vehicle card and count as empty until something is entered', () => {
  const draft = newAutoQuoteDraft();
  assert.equal(draft.drivers.length, 1);
  assert.equal(draft.vehicles.length, 1);
  assert.equal(draftHasContent(draft), false);
  assert.equal(draftHasContent(newAutoQuoteDraft('Robin Testcase')), true);
  draft.vehicles[0].vin = VIN;
  assert.equal(draftHasContent(draft), true);
  assert.equal(looksLikeProspectName('Robin Testcase'), true);
  assert.equal(looksLikeProspectName("O'Neil, Dana-Lee"), true);
  assert.equal(looksLikeProspectName('336-835-1993'), false);
  assert.equal(looksLikeProspectName(VIN), false);
  assert.equal(looksLikeProspectName('R'), false);
});
test('driver, vehicle and policy keys never collide', () => {
  const keys = POLICY_FIELDS.map(field => field.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const fields of [DRIVER_FIELDS, VEHICLE_FIELDS]) assert.equal(new Set(fields.map(field => field.key)).size, fields.length);
});
test('editable draft roundtrip allow-lists answers, caps cards and keeps decodes only for VINs still on the draft', () => {
  const draft = sampleDraft();
  draft.answers.arbitrary = 'Do not restore';
  draft.answers.maritalStatus = 'Invented option';
  draft.answers.carriers = 'Progressive, Not A Carrier';
  draft.vehicles.push({ vin: '5YJ3E1EA6PF000000' });
  draft.decodes['5YJ3E1EA6PF000000'] = decode('5YJ3E1EA6PF000000');
  draft.decodes.JUNK = { vin: 'junk', year: '1999' };
  for (let i = 0; i < MAX_DRIVERS + 3; i += 1) draft.drivers.push({ name: `Extra ${i}` });
  const restored = restoreAutoQuoteDraft(JSON.parse(JSON.stringify(draft)));
  assert.equal(restored.answers.name, 'Robin Testcase');
  assert.equal(restored.answers.arbitrary, undefined);
  assert.equal(restored.answers.maritalStatus, undefined);
  assert.equal(restored.answers.carriers, 'Progressive');
  assert.equal(restored.drivers.length, MAX_DRIVERS);
  assert.equal(restored.vehicles[0].vin, VIN);
  assert.equal(restored.decodes[VIN].headline, '2003 Honda Accord EX-V6');
  assert.equal(restored.decodes.JUNK, undefined);
  assert.equal(restored.decodes[VIN].retrievedAt, draft.decodes[VIN].retrievedAt);
  const withoutVehicle = restoreAutoQuoteDraft({ ...JSON.parse(JSON.stringify(draft)), vehicles: [] });
  assert.deepEqual(withoutVehicle.decodes, {});
  assert.deepEqual(withoutVehicle.vehicles, [{}]);
  assert.throws(() => restoreAutoQuoteDraft({ version: 1, address: '123 Example St', answers: {} }), /not a supported auto quote draft/);
  assert.throws(() => restoreAutoQuoteDraft({ version: 2, drivers: [], vehicles: [] }));
});
test('gaps name the missing critical answers, drivers and vehicles; a prospect without a policy skips prior-carrier items', () => {
  const blank = newAutoQuoteDraft();
  const gaps = autoQuoteGaps(blank);
  for (const item of ['Named insured (full name)', 'Requested effective date', 'Liability (bodily injury / property damage)', 'Phone or email', 'At least one driver', 'At least one vehicle', 'Current / prior carrier']) assert.ok(gaps.includes(item), item);
  blank.answers.policyStatus = 'No current policy';
  assert.equal(autoQuoteGaps(blank).includes('Current / prior carrier'), false);
  assert.equal(autoQuoteGaps(blank).includes('Years with that carrier'), false);
  const draft = sampleDraft();
  draft.answers.effectiveDate = '2099-12-31';
  assert.deepEqual(autoQuoteGaps(draft), []);
  draft.drivers.push({ name: 'Dana Testcase', incidents: 'Yes - see details' });
  draft.vehicles.push({ usage: 'Pleasure' });
  draft.vehicles[0].vin = '';
  draft.vehicles[0].year = '';
  draft.answers.claims = 'Yes';
  draft.answers.lapse = 'Yes';
  const later = autoQuoteGaps(draft);
  for (const item of ['Driver 2 (Dana Testcase): Date of birth', 'Driver 2 (Dana Testcase): Relationship to named insured', 'Driver 2 (Dana Testcase): incident details', 'Vehicle 1: VIN or year / make / model', 'Vehicle 2: Ownership', 'Claim details', 'Lapse / cancellation details']) assert.ok(later.includes(item), item);
  draft.vehicles[1].vin = '5YJ3E1EA6PF000000';
  assert.ok(autoQuoteGaps(draft).some(item => item.startsWith('Vehicle 2') && item.includes('VIN not decoded')));
});
test('warnings catch impossible dates, future birthdays, backdated effective dates, bad VINs, emails and ZIPs', () => {
  const draft = newAutoQuoteDraft();
  draft.answers = { dob: '2026-02-30', effectiveDate: '2026-10-01', email: 'bad', zip: '2862' };
  draft.drivers = [{ name: 'Kid', dob: '2099-01-01' }];
  draft.vehicles = [{ vin: 'ABC' }, { vin: '1HGCM82633A004353' }, { vin: VIN, garagingZip: '123' }];
  const warnings = autoAnswerWarnings(draft, today);
  assert.ok(warnings.includes('Date of birth: enter a valid date.'));
  assert.ok(warnings.includes('Requested effective date is in the past. Never backdate.'));
  assert.ok(warnings.includes('Email: verify the email address.'));
  assert.ok(warnings.includes('ZIP: enter a 5-digit ZIP code.'));
  assert.ok(warnings.includes('Driver 1 (Kid): date of birth cannot be in the future.'));
  assert.ok(warnings.some(item => item.startsWith('Vehicle 1:') && item.includes('17 characters')));
  assert.ok(warnings.some(item => item.startsWith('Vehicle 2:') && item.includes('check digit')));
  assert.ok(warnings.some(item => item.startsWith('Vehicle 3:') && item.includes('garaging ZIP')));
  assert.deepEqual(autoAnswerWarnings(sampleDraft(), today), []);
});
test('decode conflicts surface only when the prospect disagrees with NHTSA', () => {
  const draft = sampleDraft();
  draft.vehicles[0] = { ...draft.vehicles[0], year: '2003', make: 'Honda', model: 'Accord' };
  assert.deepEqual(vehicleConflicts(draft), []);
  draft.vehicles[0].model = 'Accord EX-V6';
  assert.deepEqual(vehicleConflicts(draft), []);
  draft.vehicles[0].year = '2004';
  assert.equal(vehicleConflicts(draft).length, 1);
  assert.match(vehicleConflicts(draft)[0], /NHTSA decode 2003 Honda Accord EX-V6; entered 2004 Honda Accord EX-V6/);
  draft.vehicles[0] = { ...draft.vehicles[0], year: '2003', model: 'Civic' };
  assert.equal(vehicleConflicts(draft).length, 1);
  assert.equal(draft.decodes[VIN].model, 'Accord');
});
test('HTML report escapes every value, keeps all seven sections and labels NHTSA facts separately from prospect answers', () => {
  const draft = sampleDraft();
  draft.answers.name = '<script>alert(1)</script>';
  draft.drivers[0].name = '<b>Robin</b>';
  draft.drivers[0].incidentDetails = 'Line 1\nLine 2';
  draft.decodes[VIN].headline = '<img src=x onerror=alert(1)>';
  const html = buildAutoQuoteReport(draft, today);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes('<b>Robin'));
  for (const section of ['review', 'applicant', 'drivers', 'vehicles', 'coverage', 'history', 'sources']) assert.ok(html.includes(`id="${section}"`), section);
  const vehicles = html.split('<section id="vehicles">')[1].split('</section>')[0];
  assert.match(vehicles, /Public record \(NHTSA vPIC decode\); prospect confirmation not entered/);
  assert.match(vehicles, /Year<\/dt><dd><div>2003<\/div>/);
  assert.match(vehicles, /Model \/ trim<\/dt><dd><div>Accord EX-V6<\/div>/);
  assert.match(vehicles, /Annual miles<\/dt><dd class="missing">Not shown/);
  assert.match(html, /vpic\.nhtsa\.dot\.gov\/decoder\/Decoder\?VIN=1HGCM82633A004352/);
  assert.match(html, /North Carolina does not use SR-22 filings/);
  assert.match(html, /Not shown, not No or zero/);
  assert.deepEqual(draft.vehicles[0].year, undefined);
  draft.answers.policyStatus = 'No current policy';
  const noPolicy = buildAutoQuoteReport(draft, today);
  assert.match(noPolicy, /Current premium and term<\/dt><dd>Not applicable - prospect reports no current policy/);
  assert.match(noPolicy, /Years with that carrier<\/dt><dd>4<\/dd>/);
  const empty = buildAutoQuoteReport(newAutoQuoteDraft(), today);
  assert.match(empty, /No drivers entered/);
  assert.match(empty, /No vehicles entered/);
  assert.match(empty, /Prospect name not entered/);
});
test('names split the way the rater expects, including suffixes and Last, First', () => {
  assert.deepEqual(splitName('Robin A. Testcase Jr.'), { firstName: 'Robin', middleName: 'A.', lastName: 'Testcase', suffix: 'Jr' });
  assert.deepEqual(splitName('Testcase, Robin'), { firstName: 'Robin', middleName: '', lastName: 'Testcase', suffix: '' });
  assert.deepEqual(splitName('Testcase'), { firstName: '', middleName: '', lastName: 'Testcase', suffix: '' });
  assert.deepEqual(splitName('  Mary   Beth   Testcase III '), { firstName: 'Mary', middleName: 'Beth', lastName: 'Testcase', suffix: 'III' });
});
test('quote packet matches the BLI-AUTO-QUOTE-PACKET contract and carries no SSN, payment or unverified values', () => {
  const draft = sampleDraft();
  draft.answers.umUim = 'Match liability';
  draft.answers.gender = 'Needs verification';
  draft.answers.residence = 'Own home';
  draft.drivers.push({ name: 'Dana Testcase', relationship: 'Spouse', incidents: 'Yes - see details', incidentDetails: 'Speeding 2025-03-01', discounts: 'Good student', dlState: 'Other' });
  draft.drivers.push({ name: 'Unasked Teen' });
  draft.vehicles.push({ year: '2013', make: 'Ford', model: 'F-150', usage: 'Farm', ownership: 'Owned', lienholder: 'Should be dropped when owned', comprehensive: 'None — liability only', vehicleNotes: 'Hauls hay' });
  const packet = buildAutoQuotePacket(draft, today);
  assert.equal(packet.packetType, 'BLI-AUTO-QUOTE-PACKET');
  assert.equal(packet.version, 1);
  assert.deepEqual(packet.applicant.address, { street: '101 N Bridge St', city: 'Elkin', state: 'NC', zip: '28621' });
  assert.equal(packet.applicant.firstName, 'Robin');
  assert.equal(packet.applicant.lastName, 'Testcase');
  assert.equal(packet.applicant.gender, '');
  assert.equal(packet.applicant.residence, 'Own home');
  assert.deepEqual(packet.coverages, { bi: '100/300', pd: '50', umUimBi: '100/300', umpd: '50', medPay: '$1,000' });
  assert.deepEqual(packet.priorInsurance, { status: 'Yes', carrier: 'Farm Bureau', yearsWithCarrier: '4', biLimits: '100/300', expirationDate: '2026-11-01' });
  assert.deepEqual(packet.carriers, ['Progressive', 'National General']);
  assert.equal(packet.drivers.length, 3);
  assert.equal(packet.drivers[0].incidents, 'None — clean');
  assert.equal(packet.drivers[0].occupation, 'Business Administration');
  assert.equal(packet.drivers[0].dlNumber, '');
  assert.equal(packet.drivers[1].incidents, 'Speeding 2025-03-01');
  assert.equal(packet.drivers[1].dlState, 'NC');
  assert.match(packet.drivers[2].incidents, /verify with the prospect/);
  assert.equal(packet.vehicles.length, 2);
  assert.deepEqual(packet.vehicles[0].lienholder, { name: 'Synthetic Credit Union', cityStateZip: '' });
  assert.deepEqual(packet.vehicles[0].coverage, { comprehensive: '$500', collision: '$500', towing: 'Yes', rental: '$50 / $1,500' });
  assert.equal(packet.vehicles[0].garagingZip, '28621');
  assert.equal(packet.vehicles[1].lienholder, null);
  assert.deepEqual(packet.vehicles[1].coverage, { comprehensive: 'None', collision: 'None', towing: 'No', rental: 'None' });
  assert.match(packet.notes, /Driver 2 \(Dana Testcase\) discounts: Good student/);
  assert.match(packet.notes, /Hauls hay/);
  assert.match(packet.notes, /Follow-up before rating/);
  const text = JSON.stringify(packet).toLowerCase();
  for (const forbidden of ['ssn', 'social', 'card', 'routing', 'password']) assert.ok(!text.includes(`"${forbidden}`), forbidden);
  assert.equal(packetFileName(packet), 'QUOTE-PACKET-Testcase-2026-10-27.json');
  assert.match(packetPrompt(packet), /start-auto-quotes skill[\s\S]*"packetType": "BLI-AUTO-QUOTE-PACKET"/);
  draft.answers.umUim = '250/500 & 250 UMPD';
  draft.answers.carriers = '';
  draft.answers.policyStatus = 'No current policy';
  const other = buildAutoQuotePacket(draft, today);
  assert.deepEqual(other.coverages, { bi: '100/300', pd: '50', umUimBi: '250/500', umpd: '250', medPay: '$1,000' });
  assert.deepEqual(other.carriers, ['Progressive', 'National General', 'Dairyland']);
  assert.equal(other.priorInsurance.status, 'No — first time');
});
test('packet export waits for a last name, a driver and a vehicle; the report never does', () => {
  const draft = newAutoQuoteDraft();
  assert.deepEqual(packetBlockers(draft), ['named insured last name', 'at least one driver', 'at least one vehicle']);
  draft.answers.name = 'Testcase';
  draft.drivers = [{ name: 'Testcase' }];
  draft.vehicles = [{ year: '2013' }];
  assert.deepEqual(packetBlockers(draft), []);
  assert.match(buildAutoQuoteReport(newAutoQuoteDraft(), today), /Follow-Up Notes/);
});

test('National General handoff preserves additional intake details and prints the reusable skill prompt', () => {
  const draft = sampleDraft();
  draft.answers.mailingAddress = 'PO Box 12, Elkin NC 28621';
  draft.answers.consumerConsent = 'Not confirmed';
  draft.answers.staffMember = 'Test staff';
  draft.vehicles[0].garagingAddress = '102 Main St, Elkin NC 28621';
  const restored = restoreAutoQuoteDraft(JSON.parse(JSON.stringify(draft)));
  assert.equal(restored.answers.consumerConsent, 'Not confirmed');
  assert.equal(restored.answers.mailingAddress, draft.answers.mailingAddress);
  assert.equal(restored.vehicles[0].garagingAddress, draft.vehicles[0].garagingAddress);
  const report = buildAutoQuoteReport(restored, today);
  assert.ok(report.includes(NATIONAL_GENERAL_PROMPT.replace(/'/g, '&#39;')));
  assert.match(report, /Consumer-report consent|Applicant consent for consumer reports/);
  assert.match(report, /Not confirmed/);
  assert.match(report, /PO Box 12/);
  assert.match(report, /102 Main St/);
  const packet = buildAutoQuotePacket(restored, today);
  assert.match(packet.notes, /Consumer-report consent: Not confirmed/);
  assert.match(packet.notes, /Different mailing address: PO Box 12/);
  assert.match(packet.notes, /different garaging address: 102 Main St/);
  assert.match(packetPrompt(packet), /start-auto-quotes skill/);
});

test('carrier selection survives a saved draft and produces a matching print prompt without changing the rater packet', () => {
  const cases = [
    ['National General', ['$national-general-auto-quote'], ['$progressive-auto-quote']],
    ['Progressive', ['$progressive-auto-quote'], ['$national-general-auto-quote']],
    ['National General and Progressive', ['$national-general-auto-quote', '$progressive-auto-quote'], []],
  ];
  for (const [choice, included, excluded] of cases) {
    const draft = sampleDraft();
    draft.answers.quoteSkillCarrier = choice;
    const restored = restoreAutoQuoteDraft(JSON.parse(JSON.stringify(draft)));
    assert.equal(restored.answers.quoteSkillCarrier, choice);
    const prompt = quoteSkillPrompt(restored.answers);
    const report = buildAutoQuoteReport(restored, today);
    const promptSection = report.split('<section id="quote-skill-prompt">')[1].split('</section>')[0];
    assert.match(promptSection, new RegExp(`Company selection: ${choice}`));
    for (const skill of included) { assert.ok(prompt.includes(skill)); assert.ok(promptSection.includes(skill)); }
    for (const skill of excluded) { assert.ok(!prompt.includes(skill)); assert.ok(!promptSection.includes(skill)); }
    assert.deepEqual(buildAutoQuotePacket(restored, today).carriers, ['Progressive', 'National General']);
  }
  assert.equal(quoteSkillPrompt(restoreAutoQuoteDraft(JSON.parse(JSON.stringify(newAutoQuoteDraft()))).answers), NATIONAL_GENERAL_PROMPT);
});
