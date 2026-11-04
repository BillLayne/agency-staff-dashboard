import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkDigitMatches, decodeUrl, displayMake, looksLikeVin, normalizeRecalls, normalizeVin,
  recallsUrl, summarizeVehicle, validateVin, vehicleSummaryText,
} from '../shared/vin.ts';

// Public sample VIN that NHTSA decodes cleanly (2003 Honda Accord EX-V6 coupe).
const SAMPLE = '1HGCM82633A004352';

test('normalizeVin uppercases and strips spaces, dashes and stray punctuation', () => {
  assert.equal(normalizeVin(' 1hgcm826-33a 004352. '), SAMPLE);
  assert.equal(normalizeVin(''), '');
});

test('looksLikeVin needs 17 characters and no I, O or Q', () => {
  assert.equal(looksLikeVin(SAMPLE), true);
  assert.equal(looksLikeVin('1hgcm82633a004352'), true);
  assert.equal(looksLikeVin(SAMPLE.slice(0, 16)), false);
  assert.equal(looksLikeVin('1HGCM82633A00435O'), false);
  assert.equal(looksLikeVin('123 Main St, Elkin NC'), false);
});

test('validateVin explains the two common mistakes', () => {
  assert.match(validateVin('1HGCM826').reason, /17 characters; this one has 8/);
  assert.match(validateVin('1HGCM82633A00435Q').reason, /I, O or Q/);
  assert.deepEqual(validateVin(SAMPLE), { ok: true, checkDigitOk: true });
});

test('check digit passes for the sample and fails when one character changes', () => {
  assert.equal(checkDigitMatches(SAMPLE), true);
  assert.equal(checkDigitMatches('1HGCM82633A004353'), false); // last digit changed
  assert.equal(checkDigitMatches('1HGCM82643A004352'), false); // check digit itself changed
  assert.equal(validateVin('1HGCM82643A004352').checkDigitOk, false);
});

test('URLs encode the inputs', () => {
  assert.equal(decodeUrl(' 1hgcm82633a004352 '), `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${SAMPLE}?format=json`);
  assert.equal(recallsUrl('HONDA', 'Accord Crosstour', '2003'), 'https://api.nhtsa.gov/recalls/recallsByVehicle?make=HONDA&model=Accord%20Crosstour&modelYear=2003');
});

test('displayMake title-cases long makes and leaves short ones alone', () => {
  assert.equal(displayMake('HONDA'), 'Honda');
  assert.equal(displayMake('MERCEDES-BENZ'), 'Mercedes-Benz');
  assert.equal(displayMake('BMW'), 'BMW');
  assert.equal(displayMake('GMC'), 'GMC');
});

const sampleRaw = {
  ErrorCode: '0', ErrorText: '0 - VIN decoded clean. Check Digit (9th position) is correct',
  ModelYear: '2003', Make: 'HONDA', Model: 'Accord', Trim: 'EX-V6', BodyClass: 'Coupe', VehicleType: 'PASSENGER CAR',
  Doors: '2', DisplacementL: '2.998832712', EngineCylinders: '6', EngineConfiguration: 'V-Shaped', EngineHP: '240',
  FuelTypePrimary: 'Gasoline', DriveType: '', TransmissionStyle: 'Automatic', TransmissionSpeeds: '5',
  GVWR: 'Class 1C: 4,001 - 5,000 lb (1,814 - 2,268 kg)', AirBagLocFront: '1st Row (Driver and Passenger)',
  AirBagLocSide: '1st Row (Driver and Passenger)', AirBagLocCurtain: '1st and 2nd Rows', ABS: 'Not Applicable',
  Manufacturer: 'AMERICAN HONDA MOTOR CO., INC.', PlantCity: 'MARYSVILLE', PlantState: 'OHIO', PlantCountry: 'UNITED STATES (USA)',
  OwnerName: 'must never appear', // not allow-listed
};

test('summarizeVehicle builds the headline and only the allow-listed facts', () => {
  const s = summarizeVehicle(SAMPLE, sampleRaw);
  assert.equal(s.headline, '2003 Honda Accord EX-V6');
  assert.equal(s.clean, true);
  assert.equal(s.decodeNote, '');
  const fact = (label) => s.facts.find((f) => f.label === label)?.value;
  assert.equal(fact('Engine'), '3.0L V6 240 hp');
  assert.equal(fact('Transmission'), 'Automatic, 5-speed');
  assert.equal(fact('Airbags'), 'Front, Side, Curtain');
  assert.equal(fact('Built in'), 'MARYSVILLE, OHIO, UNITED STATES (USA)');
  assert.equal(fact('Drive'), undefined); // empty values are dropped, not shown blank
  assert.equal(fact('Anti-lock brakes'), undefined); // "Not Applicable" is treated as empty
  assert.equal(JSON.stringify(s).includes('must never appear'), false);
});

test('a dirty decode keeps the data but carries NHTSA wording without the code prefix', () => {
  const s = summarizeVehicle(SAMPLE, { ...sampleRaw, ErrorCode: '1', ErrorText: '1 - Check Digit (9th position) does not calculate properly' });
  assert.equal(s.clean, false);
  assert.equal(s.decodeNote, 'Check Digit (9th position) does not calculate properly');
  assert.equal(s.headline, '2003 Honda Accord EX-V6');
});

test('vehicleSummaryText is one pasteable line with the VIN', () => {
  const text = vehicleSummaryText(summarizeVehicle(SAMPLE, sampleRaw));
  assert.equal(text, `2003 Honda Accord EX-V6 · VIN ${SAMPLE} · Coupe · 3.0L V6 240 hp · Gasoline · Automatic, 5-speed`);
});

test('normalizeRecalls allow-lists four fields and tolerates junk', () => {
  const feed = { Count: 2, results: [
    { NHTSACampaignNumber: '19V182000', ReportReceivedDate: '06/03/2019', Component: 'AIR BAGS', Summary: 'Inflator may explode.', Secret: 'x' },
    'not an object', null, { Component: 'BRAKES' },
  ] };
  const r = normalizeRecalls(feed);
  assert.equal(r.count, 2);
  assert.deepEqual(r.items, [
    { campaign: '19V182000', date: '06/03/2019', component: 'AIR BAGS', summary: 'Inflator may explode.' },
    { campaign: '', date: '', component: 'BRAKES', summary: '' },
  ]);
  assert.deepEqual(normalizeRecalls(null), { count: 0, items: [] });
  assert.deepEqual(normalizeRecalls({ results: 'nope' }), { count: 0, items: [] });
});
