import { DRIVER_FIELDS, MAX_DRIVERS, MAX_VEHICLES, POLICY_FIELDS, VEHICLE_FIELDS, draftHasContent, newAutoQuoteDraft } from './autoQuote.ts';
import type { Answers, AutoField, AutoQuoteDraft } from './autoQuote.ts';
import { normalizeVin, validateVin } from './vin.ts';

// The document is evidence, not a source for answers the customer must provide.
// In particular, never infer consent, insurance status, claims, incidents, or a
// requested quote effective date from a declarations page.
// Do not silently turn a mailing address into a garaging address. Staff can
// enter the garaging address after checking the declarations and prospect.
export const policyKeys = new Set(['name', 'dob', 'phone', 'email', 'mailingAddress', 'carrier', 'currentBi', 'expirationDate', 'premium', 'liability', 'medPay', 'coverageNotes', 'notes']);
export const driverKeys = new Set(['name', 'dob', 'gender', 'maritalStatus', 'dlState', 'yearsLicensed', 'status', 'discounts']);
export const vehicleKeys = new Set(['vin', 'year', 'make', 'model', 'usage', 'annualMiles', 'ownership', 'lienholder', 'garagingZip', 'garagingAddress', 'comprehensive', 'collision', 'towing', 'rental', 'vehicleNotes']);
const obj = (x: unknown): Record<string, unknown> => x && typeof x === 'object' && !Array.isArray(x) ? x as Record<string, unknown> : {};
const validDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v + 'T12:00:00Z')) && new Date(v + 'T12:00:00Z').toISOString().slice(0, 10) === v;
const clean = (raw: unknown, fields: AutoField[], allowed: Set<string>): Answers => {
  const source = obj(raw), out: Answers = {};
  for (const field of fields) {
    if (!allowed.has(field.key) || typeof source[field.key] !== 'string') continue;
    let value = (source[field.key] as string).trim().slice(0, 1000);
    if (!value || (field.options && !field.options.includes(value))) continue;
    if (field.type === 'date' && !validDate(value)) continue;
    if (field.key === 'vin') { value = normalizeVin(value); if (!validateVin(value).ok) continue; }
    if ((field.key === 'zip' || field.key === 'garagingZip') && !/^\d{5}(?:-\d{4})?$/.test(value)) continue;
    if (field.key === 'year' && !/^(19|20)\d{2}$/.test(value)) continue;
    out[field.key] = value;
  }
  return out;
};
export interface DeclarationExtraction { documentType: 'current' | 'renewal' | 'unknown'; answers: Answers; drivers: Answers[]; vehicles: Answers[]; }
export function normalizeDeclaration(raw: unknown): DeclarationExtraction {
  const value = obj(raw);
  const documentType = value.documentType === 'current' || value.documentType === 'renewal' ? value.documentType : 'unknown';
  const answers = clean(value.answers, POLICY_FIELDS, policyKeys);
  // A renewal offer cannot establish the expiring policy's carrier, limits or
  // expiration date. The reviewed notes retain the renewal's printed details.
  if (documentType !== 'current') { delete answers.carrier; delete answers.currentBi; delete answers.expirationDate; }
  if (answers.premium && documentType !== 'current' && !/renewal|source|document/i.test(answers.premium)) answers.premium = 'Source document: ' + answers.premium;
  return {
    documentType, answers,
    drivers: (Array.isArray(value.drivers) ? value.drivers : []).slice(0, MAX_DRIVERS).map(item => clean(item, DRIVER_FIELDS, driverKeys)).filter(item => Boolean(item.name)),
    vehicles: (Array.isArray(value.vehicles) ? value.vehicles : []).slice(0, MAX_VEHICLES).map(item => clean(item, VEHICLE_FIELDS, vehicleKeys)).filter(item => Boolean(item.vin || (item.year && item.make && item.model))),
  };
}
export const declarationHasData = (d: DeclarationExtraction) => Boolean(Object.keys(d.answers).length || d.drivers.length || d.vehicles.length);
const normalizedName = (s = '') => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const filled = (a: Answers) => Object.values(a).some(v => v?.trim());
const vehicleIdentity = (v: Answers) => [v.year, v.make, v.model].map(x => normalizedName(x)).join('|');

/** Fill blanks only; never silently replace another prospect or guess a match. */
export function mergeDeclaration(draft: AutoQuoteDraft, extraction: DeclarationExtraction): { draft: AutoQuoteDraft; skipped: number } {
  const data = normalizeDeclaration(extraction);
  if (draftHasContent(draft) && (!draft.answers.name?.trim() || !data.answers.name?.trim())) {
    throw new Error('To protect the existing draft, the named insured must be shown on both the document and the draft. Start a new quote or enter the named insured before importing.');
  }
  if (draft.answers.name && data.answers.name && normalizedName(draft.answers.name) !== normalizedName(data.answers.name)) {
    throw new Error('This document names a different insured than the open draft. Save the current draft and start a new quote before importing it.');
  }
  const next: AutoQuoteDraft = { ...newAutoQuoteDraft(), ...draft, answers: { ...draft.answers }, drivers: draft.drivers.map(x => ({ ...x })), vehicles: draft.vehicles.map(x => ({ ...x })), decodes: { ...draft.decodes } };
  let skipped = 0;
  const fill = (target: Answers, source: Answers) => {
    for (const [key, value] of Object.entries(source)) {
      if (!target[key]?.trim()) target[key] = value;
      else if (target[key].trim().toLowerCase() !== value.toLowerCase()) skipped++;
    }
  };
  fill(next.answers, data.answers);
  for (const driver of data.drivers) {
    const matches = next.drivers.filter(x => normalizedName(x.name) === normalizedName(driver.name));
    if (matches.length > 1) { skipped++; continue; }
    const match = matches[0] || next.drivers.find(x => !filled(x));
    if (match) fill(match, driver);
    else if (next.drivers.length < MAX_DRIVERS) next.drivers.push({ ...driver });
    else skipped++;
  }
  const hadVehicles = draft.vehicles.some(filled);
  const addedDescriptions = new Set<string>();
  for (const vehicle of data.vehicles) {
    const matches = next.vehicles.filter(x => Boolean(vehicle.vin && x.vin && normalizeVin(x.vin) === vehicle.vin));
    if (matches.length > 1) { skipped++; continue; }
    const description = vehicleIdentity(vehicle);
    if (!matches.length && !vehicle.vin && (hadVehicles || addedDescriptions.has(description))) { skipped++; continue; }
    const match = matches[0] || next.vehicles.find(x => !filled(x));
    if (match) fill(match, vehicle);
    else if (next.vehicles.length < MAX_VEHICLES) next.vehicles.push({ ...vehicle });
    else skipped++;
    if (!vehicle.vin) addedDescriptions.add(description);
  }
  next.updatedAt = new Date().toISOString();
  return { draft: next, skipped };
}
