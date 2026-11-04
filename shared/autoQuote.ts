// Auto quote intake: pure data model, validation, HTML report and the
// BLI-AUTO-QUOTE-PACKET export. No DOM and no fetch (the component decodes VINs);
// the node tests import this file directly. Deliberately separate from
// shared/homeQuote.ts - the two interviews share nothing but a visual style.
//
// Select option values match the BLI Auto Rater (bli-quoting/auto-rater) exactly so a
// packet built here loads into the rater with `BLI_RATER.loadPacket()` and keys into
// the carrier portals through the start-auto-quotes skill without translation.
import { displayMake, normalizeVin, validateVin } from './vin.ts';
import type { VehicleSummary } from './vin.ts';

export type AutoField = { key: string; label: string; type?: 'date' | 'email' | 'tel' | 'textarea' | 'select' | 'checks'; options?: string[]; hint?: string; critical?: boolean };
export type Answers = Record<string, string>;
const yesNo = ['Yes', 'No', 'Needs verification'];
const STATES = ['NC', 'VA', 'SC', 'TN', 'GA', 'Other'];

export const APPLICANT_FIELDS: AutoField[] = [
  { key: 'name', label: 'Named insured (full name)', critical: true, hint: 'As it appears on the driver license.' },
  { key: 'dob', label: 'Date of birth', type: 'date', critical: true },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'street', label: 'Street address', critical: true, hint: 'Where the vehicles are garaged. Note a different mailing address under follow-up.' },
  { key: 'mailingAddress', label: 'Mailing address, if different', hint: 'Include street, apartment, city, state and ZIP.' },
  { key: 'city', label: 'City', critical: true },
  { key: 'state', label: 'State', type: 'select', options: STATES, hint: 'Blank = NC.' },
  { key: 'zip', label: 'ZIP', critical: true },
  { key: 'maritalStatus', label: 'Marital status', type: 'select', options: ['Married', 'Single', 'Separated', 'Divorced', 'Widowed', 'Needs verification'] },
  { key: 'gender', label: 'Gender (as licensed)', type: 'select', options: ['Male', 'Female', 'Needs verification'] },
  { key: 'residence', label: 'Residence', type: 'select', options: ['Own home', 'Own mobile home', 'Own condo', 'Rent', 'Live with parents / other', 'Needs verification'], hint: 'Owning the home can earn a homeowner discount.' },
  { key: 'yearsAtAddress', label: 'Years at address', type: 'select', options: ['5+ years', '3–5 years', '1–3 years', 'Less than 1 year', 'Needs verification'] },
  { key: 'effectiveDate', label: 'Requested effective date', type: 'date', critical: true, hint: 'For the Codex quote skills, blank means the date the quote is prepared. Never backdate.' },
  { key: 'occupation', label: 'Occupation', hint: 'Leave blank if unknown; verify a required occupation before making a factual attestation.' },
  { key: 'staffMember', label: 'Staff member collecting information' },
  { key: 'consumerConsent', label: 'Applicant consent for consumer reports', type: 'select', options: ['Confirmed', 'Not confirmed', 'Not given'], hint: 'Confirm permission for the carrier to obtain the reports described in its notice.' },
];
export const DRIVER_FIELDS: AutoField[] = [
  { key: 'name', label: 'Driver name', critical: true },
  { key: 'dob', label: 'Date of birth', type: 'date', critical: true },
  { key: 'relationship', label: 'Relationship to named insured', type: 'select', options: ['Named Insured', 'Spouse', 'Child', 'Parent', 'Other relative', 'Other'], critical: true },
  { key: 'gender', label: 'Gender (as licensed)', type: 'select', options: ['Male', 'Female'] },
  { key: 'maritalStatus', label: 'Marital status', type: 'select', options: ['Married', 'Single', 'Separated', 'Divorced', 'Widowed'] },
  { key: 'dlState', label: 'License state', type: 'select', options: STATES, hint: 'Blank = NC.' },
  { key: 'dlNumber', label: 'License number', hint: 'Not required to quote; collected at issue.' },
  { key: 'yearsLicensed', label: 'Years licensed', hint: 'The agency default assumes first licensed at 16.' },
  { key: 'status', label: 'Driver status', type: 'select', options: ['Rated', 'Excluded', 'Other insurance', 'Never licensed', 'Permit'] },
  { key: 'occupation', label: 'Occupation', hint: 'Blank = agency default.' },
  { key: 'incidents', label: 'Accidents, violations or suspensions (5 years)?', type: 'select', options: ['None reported', 'Yes - see details', 'Needs verification'], critical: true, hint: 'Ask every driver. Blank is not the same as clean.' },
  { key: 'incidentDetails', label: 'Incident dates, type, at-fault and amounts', type: 'textarea' },
  { key: 'discounts', label: 'Discounts to check', hint: 'Good student, defensive driving course, away at school 100+ miles, military.' },
];
export const VEHICLE_FIELDS: AutoField[] = [
  { key: 'vin', label: 'VIN', hint: '17 characters. Decode fills year, make and model from NHTSA public data.' },
  { key: 'year', label: 'Year' },
  { key: 'make', label: 'Make' },
  { key: 'model', label: 'Model / trim' },
  { key: 'usage', label: 'Primary use', type: 'select', options: ['Pleasure', 'Commute < 10 mi', 'Commute 10+ mi', 'Business', 'Farm'], critical: true },
  { key: 'annualMiles', label: 'Annual miles' },
  { key: 'ownership', label: 'Ownership', type: 'select', options: ['Owned', 'Financed', 'Leased'], critical: true },
  { key: 'lienholder', label: 'Lienholder / lessor (name, city, state)', hint: 'Skipped at the quote stage; needed at issue.' },
  { key: 'ownershipLength', label: 'How long owned', type: 'select', options: ['5+ years', '3–5 years', '1–3 years', '6–12 months', '1–6 months', 'New purchase'] },
  { key: 'garagingZip', label: 'Garaging ZIP', hint: 'Blank = same as the applicant ZIP.' },
  { key: 'garagingAddress', label: 'Garaging address, if different', hint: 'Include street, city, state and ZIP.' },
  { key: 'comprehensive', label: 'Comprehensive (other than collision) deductible', type: 'select', options: ['None — liability only', '$0 (ACV / full)', '$100', '$250', '$500', '$1,000'] },
  { key: 'collision', label: 'Collision deductible', type: 'select', options: ['None — liability only', '$100', '$250', '$500', '$1,000'] },
  { key: 'towing', label: 'Towing / roadside', type: 'select', options: ['No', 'Yes'] },
  { key: 'rental', label: 'Rental reimbursement', type: 'select', options: ['None', '$30 / $900', '$40 / $1,200', '$50 / $1,500'] },
  { key: 'vehicleNotes', label: 'Rideshare / delivery use, custom equipment, existing damage, main driver', type: 'textarea' },
];
export const LIABILITY_OPTIONS = ['50/100 & 50 PD — NC minimum', '100/300 & 50 PD', '100/300 & 100 PD', '250/500 & 100 PD', '250/500 & 250 PD'];
export const UM_OPTIONS = ['Match liability', '50/100 & 50 UMPD', '100/300 & 100 UMPD', '250/500 & 250 UMPD'];
export const CARRIER_OPTIONS = ['Progressive', 'National General', 'Dairyland', 'Nationwide', 'NC Grange', 'Travelers'];
export const PACKET_DEFAULT_CARRIERS = ['Progressive', 'National General', 'Dairyland'];
export const QUOTE_SKILL_OPTIONS = ['National General', 'Progressive', 'National General and Progressive'];
export const QUOTE_SKILL_FIELD: AutoField = { key: 'quoteSkillCarrier', label: 'Codex quote company', type: 'select', options: QUOTE_SKILL_OPTIONS };
export const COVERAGE_FIELDS: AutoField[] = [
  { key: 'liability', label: 'Liability (bodily injury / property damage)', type: 'select', options: LIABILITY_OPTIONS, critical: true, hint: 'North Carolina minimum is 50/100/50.' },
  { key: 'umUim', label: 'Uninsured / underinsured motorist', type: 'select', options: UM_OPTIONS },
  { key: 'medPay', label: 'Medical payments', type: 'select', options: ['None', '$500', '$1,000', '$2,000', '$5,000'], hint: 'Agency default is $1,000.' },
  { key: 'paymentPlan', label: 'Payment plan', type: 'select', options: ['Paid in full', 'Monthly installments', 'EFT / autopay installments'] },
  { key: 'paperless', label: 'Paperless', type: 'select', options: ['Yes', 'No'] },
  { key: 'carriers', label: 'BLI Auto Rater packet carriers', type: 'checks', options: CARRIER_OPTIONS, hint: 'These choices are for the separate BLI Auto Rater packet. Select Codex quote companies on Report & packet.' },
  { key: 'coverageNotes', label: 'Other coverage requests', type: 'textarea', hint: 'Loan / lease gap, custom equipment, OEM parts, accident forgiveness, umbrella.' },
];
export const HISTORY_FIELDS: AutoField[] = [
  { key: 'policyStatus', label: 'Current insurance status', type: 'select', options: ['Currently insured', 'No current policy', 'Lapsed', 'Needs verification'], critical: true },
  { key: 'carrier', label: 'Current / prior carrier', critical: true },
  { key: 'yearsWithCarrier', label: 'Years with that carrier', critical: true, hint: 'Drives the continuous-insurance discount. Ask.' },
  { key: 'currentBi', label: 'Current bodily injury limits', type: 'select', options: ['30/60', '50/100', '100/300', '250/500', 'Unknown'], critical: true },
  { key: 'expirationDate', label: 'Policy expiration / renewal date', type: 'date', critical: true },
  { key: 'premium', label: 'Current premium and term' },
  { key: 'lapse', label: 'Any lapse in coverage (12 months)?', type: 'select', options: yesNo, critical: true },
  { key: 'lapseDetails', label: 'Lapse, cancellation or nonrenewal details', type: 'textarea' },
  { key: 'claims', label: 'Any claims or losses in the household (5 years)?', type: 'select', options: yesNo, critical: true, hint: 'Comprehensive claims count too: glass, deer, theft, weather.' },
  { key: 'claimsDetails', label: 'Claim dates, cause, amount and status', type: 'textarea' },
  { key: 'documents', label: 'Outstanding documents / photos', type: 'textarea', hint: 'Current declarations page, license photos, VIN and odometer photos, proof of prior insurance.' },
  { key: 'notes', label: 'Additional prospect answers / follow-up', type: 'textarea' },
];
export type AutoSection = { id: string; label: string; kind: 'fields' | 'drivers' | 'vehicles'; fields: AutoField[] };
export const AUTO_SECTIONS: AutoSection[] = [
  { id: 'applicant', label: 'Applicant', kind: 'fields', fields: APPLICANT_FIELDS },
  { id: 'drivers', label: 'Drivers', kind: 'drivers', fields: DRIVER_FIELDS },
  { id: 'vehicles', label: 'Vehicles', kind: 'vehicles', fields: VEHICLE_FIELDS },
  { id: 'coverage', label: 'Coverage', kind: 'fields', fields: COVERAGE_FIELDS },
  { id: 'history', label: 'Current Policy & History', kind: 'fields', fields: HISTORY_FIELDS },
];
/** Policy-level answers (everything that is not a driver or vehicle card). Keys are unique across the three lists. */
export const POLICY_FIELDS = [...APPLICANT_FIELDS, ...COVERAGE_FIELDS, ...HISTORY_FIELDS, QUOTE_SKILL_FIELD];

export type VinDecode = { vin: string; year: string; make: string; model: string; trim: string; body: string; headline: string; clean: boolean; note: string; retrievedAt: string };
export type AutoQuoteDraft = { version: 1; answers: Answers; drivers: Answers[]; vehicles: Answers[]; decodes: Record<string, VinDecode>; updatedAt: string };
export const MAX_DRIVERS = 8;
export const MAX_VEHICLES = 8;
export const RATER_URL = 'https://rater.billlayneinsurance.com/';

export const newAutoQuoteDraft = (name = ''): AutoQuoteDraft => ({ version: 1, answers: name ? { name } : {}, drivers: [{}], vehicles: [{}], decodes: {}, updatedAt: new Date().toISOString() });
export const normalizeName = (value: string) => value.replace(/\s+/g, ' ').trim();
/** A search-box value worth offering as the prospect name: letters only, no digits (phone / policy numbers / VINs stay out). */
export const looksLikeProspectName = (value: string) => { const name = normalizeName(value); return name.length >= 2 && name.length <= 80 && /^[A-Za-z][A-Za-z' .,-]*$/.test(name); };
const asText = (value: unknown, max = 2000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const filled = (record: Answers) => Object.values(record).some(value => value && value.trim());
const joinPresent = (parts: (string | undefined)[], separator = ' ') => parts.filter(Boolean).join(separator);
export const draftHasContent = (draft: AutoQuoteDraft) => filled(draft.answers) || draft.drivers.some(filled) || draft.vehicles.some(filled);
export const driverLabel = (driver: Answers, index: number) => `Driver ${index + 1}` + (driver.name?.trim() ? ` (${driver.name.trim()})` : '');
export const vehicleLabel = (vehicle: Answers, index: number, decode?: VinDecode) => {
  const description = joinPresent([vehicle.year?.trim(), vehicle.make?.trim(), vehicle.model?.trim()]) || decode?.headline || '';
  return `Vehicle ${index + 1}` + (description ? ` (${description})` : '');
};

/** Allow-list the NHTSA summary down to what the draft stores. */
export function decodeFromSummary(summary: VehicleSummary, now = new Date()): VinDecode {
  return {
    vin: summary.vin, year: summary.year, make: summary.make, model: summary.model, trim: summary.trim,
    body: summary.facts.find(fact => fact.label === 'Body style')?.value || '',
    headline: summary.headline, clean: summary.clean, note: summary.decodeNote, retrievedAt: now.toISOString(),
  };
}
function restoreDecode(raw: unknown): VinDecode | null {
  const record = object(raw);
  const vin = normalizeVin(asText(record.vin, 24));
  if (!validateVin(vin).ok) return null;
  return {
    vin, year: asText(record.year, 4), make: asText(record.make, 60), model: asText(record.model, 80), trim: asText(record.trim, 80),
    body: asText(record.body, 80), headline: asText(record.headline, 200), clean: record.clean === true, note: asText(record.note, 300),
    retrievedAt: Number.isFinite(Date.parse(String(record.retrievedAt))) ? String(record.retrievedAt) : 'Unknown',
  };
}
function restoreAnswers(raw: unknown, fields: AutoField[]) {
  const source = object(raw);
  const out: Answers = {};
  for (const field of fields) {
    const value = asText(source[field.key], 4000);
    if (!value) continue;
    if (field.type === 'checks') {
      const picked = value.split(',').map(item => item.trim()).filter(item => field.options?.includes(item));
      if (picked.length) out[field.key] = picked.join(', ');
    } else if (!field.options || field.options.includes(value)) out[field.key] = value;
  }
  return out;
}
export function restoreAutoQuoteDraft(raw: unknown): AutoQuoteDraft {
  const input = object(raw);
  if (input.version !== 1 || !Array.isArray(input.drivers) || !Array.isArray(input.vehicles)) throw new Error('This is not a supported auto quote draft.');
  const draft = newAutoQuoteDraft();
  draft.answers = restoreAnswers(input.answers, POLICY_FIELDS);
  if (draft.answers.name) draft.answers.name = normalizeName(draft.answers.name);
  draft.drivers = input.drivers.slice(0, MAX_DRIVERS).map(item => restoreAnswers(item, DRIVER_FIELDS));
  draft.vehicles = input.vehicles.slice(0, MAX_VEHICLES).map(item => {
    const vehicle = restoreAnswers(item, VEHICLE_FIELDS);
    if (vehicle.vin) vehicle.vin = normalizeVin(vehicle.vin);
    return vehicle;
  });
  if (!draft.drivers.length) draft.drivers = [{}];
  if (!draft.vehicles.length) draft.vehicles = [{}];
  // Decodes survive only for VINs that are still on the draft and still look like VINs.
  const vins = new Set(draft.vehicles.map(vehicle => vehicle.vin).filter(Boolean));
  for (const item of Object.values(object(input.decodes)).slice(0, MAX_VEHICLES * 2)) {
    const decode = restoreDecode(item);
    if (decode && vins.has(decode.vin)) draft.decodes[decode.vin] = decode;
  }
  return draft;
}

const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const ZIP = /^\d{5}(-\d{4})?$/;
export function autoAnswerWarnings(draft: AutoQuoteDraft, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const warnings: string[] = [];
  const dateCheck = (label: string, value: string | undefined, rule?: (value: string) => string) => {
    if (!value) return;
    if (!isValidDate(value)) warnings.push(`${label}: enter a valid date.`);
    else if (rule) { const warning = rule(value); if (warning) warnings.push(warning); }
  };
  const answers = draft.answers;
  dateCheck('Date of birth', answers.dob, value => value > today ? 'Date of birth cannot be in the future.' : '');
  dateCheck('Requested effective date', answers.effectiveDate, value => value < today ? 'Requested effective date is in the past. Never backdate.' : '');
  dateCheck('Policy expiration / renewal date', answers.expirationDate);
  if (answers.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email)) warnings.push('Email: verify the email address.');
  if (answers.zip && !ZIP.test(answers.zip.trim())) warnings.push('ZIP: enter a 5-digit ZIP code.');
  draft.drivers.forEach((driver, index) => {
    const label = driverLabel(driver, index);
    dateCheck(`${label}: date of birth`, driver.dob, value => value > today ? `${label}: date of birth cannot be in the future.` : '');
  });
  draft.vehicles.forEach((vehicle, index) => {
    const label = vehicleLabel(vehicle, index, draft.decodes[normalizeVin(vehicle.vin || '')]);
    if (vehicle.vin?.trim()) {
      const check = validateVin(vehicle.vin);
      if (!check.ok) warnings.push(`${label}: ${check.reason}`);
      else if (check.checkDigitOk === false) warnings.push(`${label}: VIN check digit does not match; compare it to the title or dash plate.`);
    }
    if (vehicle.garagingZip && !ZIP.test(vehicle.garagingZip.trim())) warnings.push(`${label}: garaging ZIP should be 5 digits.`);
  });
  return warnings;
}
const unanswered = (value?: string) => !value?.trim() || /needs verification|unknown|not shown/i.test(value);
export function autoQuoteGaps(draft: AutoQuoteDraft) {
  // Advisory follow-up only; missing answers never gate navigation, saving or reports.
  const answers = draft.answers;
  const skip = answers.policyStatus === 'No current policy' ? ['carrier', 'yearsWithCarrier', 'currentBi', 'expirationDate'] : [];
  const gaps = POLICY_FIELDS.filter(field => field.critical && !skip.includes(field.key) && unanswered(answers[field.key])).map(field => field.label);
  if (!answers.phone?.trim() && !answers.email?.trim()) gaps.push('Phone or email');
  if (answers.lapse === 'Yes' && !answers.lapseDetails?.trim()) gaps.push('Lapse / cancellation details');
  if (answers.claims === 'Yes' && !answers.claimsDetails?.trim()) gaps.push('Claim details');
  if (!draft.drivers.some(filled)) gaps.push('At least one driver');
  draft.drivers.forEach((driver, index) => {
    if (!filled(driver)) return;
    const label = driverLabel(driver, index);
    for (const field of DRIVER_FIELDS) if (field.critical && unanswered(driver[field.key])) gaps.push(`${label}: ${field.label}`);
    if (driver.incidents === 'Yes - see details' && !driver.incidentDetails?.trim()) gaps.push(`${label}: incident details`);
  });
  if (!draft.vehicles.some(filled)) gaps.push('At least one vehicle');
  draft.vehicles.forEach((vehicle, index) => {
    if (!filled(vehicle)) return;
    const vin = normalizeVin(vehicle.vin || '');
    const decode: VinDecode | undefined = draft.decodes[vin];
    const label = vehicleLabel(vehicle, index, decode);
    if (!vin && !(vehicle.year?.trim() && vehicle.make?.trim() && vehicle.model?.trim())) gaps.push(`${label}: VIN or year / make / model`);
    else if (vin && !decode) gaps.push(`${label}: VIN not decoded / verified`);
    for (const field of VEHICLE_FIELDS) if (field.critical && unanswered(vehicle[field.key])) gaps.push(`${label}: ${field.label}`);
  });
  return [...gaps, ...autoAnswerWarnings(draft)];
}
const squash = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
export function vehicleConflicts(draft: AutoQuoteDraft) {
  const conflicts: string[] = [];
  draft.vehicles.forEach((vehicle, index) => {
    const decode: VinDecode | undefined = draft.decodes[normalizeVin(vehicle.vin || '')];
    if (!decode) return;
    const entered = [vehicle.year, vehicle.make, vehicle.model].map(value => (value || '').trim());
    const decodedModel = squash(decode.model + decode.trim);
    const enteredModel = squash(entered[2]);
    const yearOff = Boolean(entered[0] && decode.year && entered[0] !== decode.year);
    const makeOff = Boolean(entered[1] && decode.make && squash(entered[1]) !== squash(decode.make));
    const modelOff = Boolean(enteredModel && decodedModel && !decodedModel.includes(enteredModel) && !(squash(decode.model) && enteredModel.includes(squash(decode.model))));
    if (yearOff || makeOff || modelOff) conflicts.push(`${vehicleLabel(vehicle, index, decode)}: NHTSA decode ${decode.headline || decode.vin}; entered ${joinPresent(entered)}. Needs verification.`);
  });
  return conflicts;
}

// ---- BLI-AUTO-QUOTE-PACKET (consumed by the BLI Auto Rater and the start-auto-quotes skill) ----
export type AutoQuotePacket = {
  packetType: 'BLI-AUTO-QUOTE-PACKET'; version: 1; createdAt: string; source: string;
  agency: { name: string; phone: string; state: string };
  effectiveDate: string;
  applicant: { firstName: string; middleName: string; lastName: string; suffix: string; dob: string; gender: string; maritalStatus: string; residence: string; yearsAtAddress: string; address: { street: string; city: string; state: string; zip: string }; email: string; phone: string };
  priorInsurance: { status: string; carrier: string; yearsWithCarrier: string; biLimits: string; expirationDate: string };
  drivers: { name: string; dob: string; gender: string; maritalStatus: string; relationship: string; dlState: string; dlNumber: string; yearsLicensed: string; status: string; occupation: string; incidents: string }[];
  vehicles: { vin: string; year: string; make: string; model: string; usage: string; annualMiles: string; ownershipLength: string; garagingZip: string; ownership: string; lienholder: { name: string; cityStateZip: string } | null; coverage: { comprehensive: string; collision: string; towing: string; rental: string } }[];
  carriers: string[];
  coverages: { bi: string; pd: string; umUimBi: string; umpd: string; medPay: string };
  payment: { plan: string; paperless: string };
  defaults: { occupationFallback: string; note: string };
  notes: string;
};
const SUFFIXES: Record<string, string> = { JR: 'Jr', SR: 'Sr', II: 'II', III: 'III', IV: 'IV' };
export function splitName(full: string) {
  let value = normalizeName(full);
  if (value.includes(',')) { const [last, first = ''] = value.split(',').map(part => part.trim()); value = normalizeName(`${first} ${last}`); }
  const parts = value.split(' ').filter(Boolean);
  const suffix = parts.length > 1 ? SUFFIXES[parts[parts.length - 1].replace(/\./g, '').toUpperCase()] || '' : '';
  if (suffix) parts.pop();
  const lastName = parts.length ? parts[parts.length - 1] : '';
  const firstName = parts.length > 1 ? parts[0] : '';
  const middleName = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
  return { firstName, middleName, lastName, suffix };
}
/** Values the prospect has not confirmed never travel in the packet. */
const confirmed = (value?: string) => { const text = (value || '').trim(); return /^needs verification$/i.test(text) ? '' : text; };
const parseLimits = (label: string, suffix: string) => { const match = new RegExp(`^(\\d+\\/\\d+) & (\\d+) ${suffix}`).exec(label || ''); return match ? { bi: match[1], pd: match[2] } : { bi: '', pd: '' }; };
const PRIOR_STATUS: Record<string, string> = { 'Currently insured': 'Yes', 'No current policy': 'No — first time', Lapsed: 'Lapsed' };
const deductible = (value?: string) => value && !value.startsWith('None') ? value : 'None';
function incidentText(driver: Answers) {
  if (driver.incidents === 'None reported') return 'None — clean';
  if (driver.incidents === 'Yes - see details') return driver.incidentDetails?.trim() || 'Yes — details not entered; ask before rating';
  return 'Not asked — verify with the prospect before rating';
}
export function packetBlockers(draft: AutoQuoteDraft) {
  const blockers: string[] = [];
  if (!splitName(draft.answers.name || '').lastName) blockers.push('named insured last name');
  if (!draft.drivers.some(filled)) blockers.push('at least one driver');
  if (!draft.vehicles.some(filled)) blockers.push('at least one vehicle');
  return blockers;
}
export function buildAutoQuotePacket(draft: AutoQuoteDraft, now = new Date()): AutoQuotePacket {
  const answers = draft.answers;
  const name = splitName(answers.name || '');
  const liability = parseLimits(answers.liability || '', 'PD');
  const um = answers.umUim && answers.umUim !== 'Match liability' ? parseLimits(answers.umUim, 'UMPD') : liability;
  const carriers = (answers.carriers || '').split(',').map(item => item.trim()).filter(item => CARRIER_OPTIONS.includes(item));
  const gaps = autoQuoteGaps(draft);
  const notes = [
    answers.notes?.trim(),
    answers.mailingAddress?.trim() ? 'Different mailing address: ' + answers.mailingAddress.trim() : '',
    answers.consumerConsent?.trim() ? 'Consumer-report consent: ' + answers.consumerConsent.trim() : '',
    answers.staffMember?.trim() ? 'Intake completed by: ' + answers.staffMember.trim() : '',
    answers.coverageNotes?.trim() ? 'Coverage requests: ' + answers.coverageNotes.trim() : '',
    answers.claims === 'Yes' ? 'Household claims: ' + (answers.claimsDetails?.trim() || 'details not entered') : '',
    answers.lapse === 'Yes' ? 'Lapse: ' + (answers.lapseDetails?.trim() || 'details not entered') : '',
    answers.documents?.trim() ? 'Outstanding documents: ' + answers.documents.trim() : '',
    ...draft.drivers.map((driver, index) => driver.discounts?.trim() ? `${driverLabel(driver, index)} discounts: ${driver.discounts.trim()}` : ''),
    ...draft.vehicles.map((vehicle, index) => vehicle.vehicleNotes?.trim() ? `${vehicleLabel(vehicle, index, draft.decodes[normalizeVin(vehicle.vin || '')])}: ${vehicle.vehicleNotes.trim()}` : ''),
    ...draft.vehicles.map((vehicle, index) => vehicle.garagingAddress?.trim() ? `${vehicleLabel(vehicle, index, draft.decodes[normalizeVin(vehicle.vin || '')])} different garaging address: ${vehicle.garagingAddress.trim()}` : ''),
    gaps.length ? 'Follow-up before rating: ' + gaps.join('; ') : '',
  ].filter(Boolean).join('\n').slice(0, 6000);
  return {
    packetType: 'BLI-AUTO-QUOTE-PACKET', version: 1, createdAt: now.toISOString(),
    source: 'Agency Command Center - Auto Quote Information',
    agency: { name: 'Bill Layne Insurance Agency', phone: '336-835-1993', state: 'NC' },
    effectiveDate: answers.effectiveDate || '',
    applicant: {
      ...name, dob: answers.dob || '', gender: confirmed(answers.gender), maritalStatus: confirmed(answers.maritalStatus),
      residence: confirmed(answers.residence), yearsAtAddress: confirmed(answers.yearsAtAddress),
      address: { street: answers.street || '', city: answers.city || '', state: answers.state && answers.state !== 'Other' ? answers.state : 'NC', zip: answers.zip || '' },
      email: answers.email || '', phone: answers.phone || '',
    },
    priorInsurance: {
      status: PRIOR_STATUS[answers.policyStatus || ''] || '', carrier: answers.carrier || '', yearsWithCarrier: answers.yearsWithCarrier || '',
      biLimits: answers.currentBi || '', expirationDate: answers.expirationDate || '',
    },
    drivers: draft.drivers.filter(filled).map(driver => ({
      name: normalizeName(driver.name || ''), dob: driver.dob || '', gender: driver.gender || '', maritalStatus: driver.maritalStatus || '',
      relationship: driver.relationship || '', dlState: driver.dlState && driver.dlState !== 'Other' ? driver.dlState : 'NC', dlNumber: driver.dlNumber || '',
      yearsLicensed: driver.yearsLicensed || '', status: driver.status || 'Rated', occupation: driver.occupation?.trim() || 'Business Administration',
      incidents: incidentText(driver),
    })),
    vehicles: draft.vehicles.filter(filled).map(vehicle => ({
      vin: normalizeVin(vehicle.vin || ''), year: vehicle.year || '', make: vehicle.make || '', model: vehicle.model || '',
      usage: vehicle.usage || '', annualMiles: vehicle.annualMiles || '', ownershipLength: vehicle.ownershipLength || '',
      garagingZip: vehicle.garagingZip || answers.zip || '', ownership: vehicle.ownership || '',
      lienholder: vehicle.ownership === 'Owned' || !vehicle.lienholder?.trim() ? null : { name: vehicle.lienholder.trim(), cityStateZip: '' },
      coverage: { comprehensive: deductible(vehicle.comprehensive), collision: deductible(vehicle.collision), towing: vehicle.towing || 'No', rental: vehicle.rental && vehicle.rental !== 'None' ? vehicle.rental : 'None' },
    })),
    carriers: carriers.length ? carriers : [...PACKET_DEFAULT_CARRIERS],
    coverages: { bi: liability.bi, pd: liability.pd, umUimBi: um.bi, umpd: um.pd, medPay: answers.medPay || '$1,000' },
    payment: { plan: answers.paymentPlan || '', paperless: answers.paperless || 'Yes' },
    defaults: { occupationFallback: 'Business Administration', note: 'When a portal requires a field not in this packet, use agency defaults; never enter SSN or payment info; stop before rating/report ordering unless told otherwise.' },
    notes,
  };
}
export const packetFileName = (packet: AutoQuotePacket) => `QUOTE-PACKET-${(packet.applicant.lastName || 'client').replace(/\W+/g, '') || 'client'}-${packet.createdAt.slice(0, 10)}.json`;
export const packetPrompt = (packet: AutoQuotePacket) =>
  'Start carrier quotes from this packet - use the start-auto-quotes skill. Open each carrier in the packet\'s carriers list, start a new NC auto quote, and key in the applicant, drivers, vehicles and coverages. Stop before ordering reports or final rating; never enter an SSN or payment information.\n\n' + JSON.stringify(packet, null, 2);

export const NATIONAL_GENERAL_PROMPT = "Use $national-general-auto-quote to prepare a National General auto quote using the attached intake report. Follow the agency's defaults unless the intake or I specify otherwise. Ask about missing information needed to continue, rate the quote, and download the quote PDF for my review.";
export const PROGRESSIVE_PROMPT = "Use $progressive-auto-quote to prepare a Progressive auto quote using the attached intake report. Follow the agency's defaults unless the intake or I specify otherwise. Ask about missing information needed to continue, rate the quote, and download the quote PDF for my review.";
export const BOTH_CARRIERS_PROMPT = "Use $national-general-auto-quote and $progressive-auto-quote to prepare separate National General and Progressive auto quotes using the attached intake report. Follow the agency's defaults unless the intake or I specify otherwise. Ask about missing information needed to continue, rate each quote, and download each quote PDF for my review.";
export const quoteSkillCarrier = (answers: Answers) => QUOTE_SKILL_OPTIONS.includes(answers.quoteSkillCarrier) ? answers.quoteSkillCarrier : QUOTE_SKILL_OPTIONS[0];
export const quoteSkillPrompt = (answers: Answers) => {
  const carrier = quoteSkillCarrier(answers);
  return carrier === 'Progressive' ? PROGRESSIVE_PROMPT : carrier === 'National General and Progressive' ? BOTH_CARRIERS_PROMPT : NATIONAL_GENERAL_PROMPT;
};

// ---- HTML report ----
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
export const vpicDecoderUrl = (vin: string) => 'https://vpic.nhtsa.dot.gov/decoder/Decoder?VIN=' + encodeURIComponent(normalizeVin(vin));
const REPORT_STYLE = `*{box-sizing:border-box}body{margin:0;background:#f3f4f6;color:#202b35;font:15px/1.6 system-ui,sans-serif;letter-spacing:0}main{max-width:1040px;margin:auto;padding:28px;background:white}header{border-bottom:3px solid #003f87;padding-bottom:20px}header img{width:240px;max-width:100%;height:auto}h1{font-size:28px;line-height:1.25;margin:20px 0 6px}h2{font-size:20px;margin:0 0 8px}h3{font-size:16px;margin:16px 0 4px}p{margin:8px 0}.source,.muted{color:#526170;font-size:13px}.badge{display:inline-block;background:#fff4d8;color:#684900;padding:4px 10px;border-radius:4px;font-weight:700}nav{display:flex;flex-wrap:wrap;gap:8px 18px;border-bottom:1px solid #d5dce3;padding:16px 0}a{color:#004e9d;overflow-wrap:anywhere}section{padding:22px 0;border-bottom:1px solid #d5dce3}dl{margin:0}.row{display:grid;grid-template-columns:minmax(170px,38%) minmax(0,1fr);gap:16px;border-top:1px solid #e8edf1;padding:8px 0;break-inside:avoid}dt{color:#526170}dd{margin:0;font-weight:600;white-space:pre-wrap;overflow-wrap:anywhere}.missing{color:#8a5910;font-weight:400}li{margin:4px 0;overflow-wrap:anywhere}.alert{border-left:3px solid #b87c00;padding:8px 14px;background:#fff9eb}footer{font-size:12px;color:#526170;padding-top:20px}dd .source{font-weight:400;white-space:normal}.record-note{margin-top:8px;padding-top:8px;border-top:1px dashed #d5dce3;font-weight:400}.record-note .source{display:block}@media(max-width:520px){main{padding:18px}h1{font-size:23px}.row{grid-template-columns:1fr;gap:2px}}@media print{@page{size:letter;margin:.55in}body,main{background:white}main{padding:0;max-width:none;font-size:11px}header img{width:190px}h1{font-size:22px}h2{font-size:16px}h3{font-size:13px}nav{display:none}section{padding:14px 0}h2,h3{break-after:avoid}a{color:inherit;text-decoration:none}.row{padding:5px 0}footer{font-size:10px}}`;
export function buildAutoQuoteReport(draft: AutoQuoteDraft, now = new Date()) {
  const answers = draft.answers;
  const gaps = autoQuoteGaps(draft);
  const conflicts = vehicleConflicts(draft);
  const noPolicy = answers.policyStatus === 'No current policy';
  const row = (label: string, value?: string) => `<div class="row"><dt>${escape(label)}</dt><dd${value ? '' : ' class="missing"'}>${escape(value || 'Not shown')}</dd></div>`;
  const list = (items: string[]) => `<ul>${items.map(item => `<li>${escape(item)}</li>`).join('')}</ul>`;
  const rows = (fields: AutoField[], values: Answers, notApplicable: string[] = []) => fields.map(field => row(field.label, values[field.key]?.trim() || (notApplicable.includes(field.key) ? 'Not applicable - prospect reports no current policy' : ''))).join('');
  const section = (id: string, title: string, body: string, note = 'Source: prospect / staff entry; verify against documents.') => `<section id="${id}"><h2>${escape(title)}</h2><p class="source">${escape(note)}</p>${body}</section>`;
  const drivers = draft.drivers.map((driver, index) => filled(driver) ? `<h3>${escape(driverLabel(driver, index))}</h3><dl>${rows(DRIVER_FIELDS, driver)}</dl>` : '').join('') || '<p class="missing">No drivers entered.</p>';
  const vehicles = draft.vehicles.map((vehicle, index) => {
    if (!filled(vehicle)) return '';
    const vin = normalizeVin(vehicle.vin || '');
    const decode: VinDecode | undefined = draft.decodes[vin];
    // Public decode facts belong in the report rows, never in saved prospect answers.
    const publicAnswers: Record<string, string | undefined> = decode ? { year: decode.year, make: displayMake(decode.make), model: joinPresent([decode.model, decode.trim]) } : {};
    const source = 'Public record (NHTSA vPIC decode)';
    const vehicleRow = (field: AutoField) => {
      const answer = vehicle[field.key]?.trim();
      const publicAnswer = publicAnswers[field.key];
      if (!publicAnswer) return row(field.label, answer);
      return `<div class="row"><dt>${escape(field.label)}</dt><dd><div>${escape(answer || publicAnswer)}</div><div class="source">${answer ? 'Prospect / staff entry' : escape(source) + '; prospect confirmation not entered.'}</div>${answer ? `<div class="record-note"><span class="source">${escape(source)}</span>${escape(publicAnswer)}</div>` : ''}</dd></div>`;
    };
    const decodeText = decode ? joinPresent([decode.headline || decode.vin, decode.body], ' - ') + (decode.clean ? '' : ` (${decode.note || 'decode incomplete; verify'})`) : vin ? 'Not decoded' : '';
    return `<h3>${escape(vehicleLabel(vehicle, index, decode))}</h3><dl>${row('VIN', vin || vehicle.vin)}${row('NHTSA decode', decodeText)}${VEHICLE_FIELDS.filter(field => field.key !== 'vin').map(vehicleRow).join('')}</dl>`;
  }).join('') || '<p class="missing">No vehicles entered.</p>';
  const sources = draft.vehicles.map(vehicle => draft.decodes[normalizeVin(vehicle.vin || '')]).filter((decode): decode is VinDecode => Boolean(decode))
    .map(decode => `<li><a href="${escape(vpicDecoderUrl(decode.vin))}" target="_blank" rel="noopener noreferrer">NHTSA vPIC decoder - ${escape(decode.vin)}</a> (retrieved ${escape(decode.retrievedAt)})</li>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><meta name="robots" content="noindex,nofollow"><title>Auto quote intake | ${escape(answers.name || 'New prospect')}</title><style>${REPORT_STYLE}</style></head><body><main><header><img src="https://img.billlayneinsurance.com/i/2026/08/bli-agency-logo-4jqj2j.png" alt="Bill Layne Insurance"><h1>Auto Quote Intake</h1><p>${escape(answers.name || 'Prospect name not entered')}</p><span class="badge">Working intake - not a quote or binder</span><p class="muted">Private agency worksheet. Prepared ${escape(now.toLocaleString('en-US'))}.</p></header>
  <nav aria-label="Report index"><a href="#review">1. Follow-up</a><a href="#applicant">2. Applicant</a><a href="#drivers">3. Drivers</a><a href="#vehicles">4. Vehicles</a><a href="#coverage">5. Coverage</a><a href="#history">6. Current Policy</a><a href="#sources">7. Sources</a></nav>
  <section id="quote-skill-prompt"><h2>Codex quote prompt</h2><p>Company selection: ${escape(quoteSkillCarrier(answers))}. Copy this prompt into Codex and attach this intake report:</p><p>${escape(quoteSkillPrompt(answers))}</p></section>
  <section id="review"><h2>1. Follow-Up Notes</h2><p>${gaps.length} follow-up notes. All interview questions are optional; unanswered items do not block this report. Carrier eligibility rules and the MVR / CLUE reports still apply.</p>${gaps.length ? list(gaps) : '<p>Core interview checklist entered. Verify all answers and carrier requirements before quoting.</p>'}${conflicts.length ? `<div class="alert"><strong>Conflicting information</strong>${list(conflicts)}</div>` : ''}<p class="alert">Never backdate. North Carolina does not use SR-22 filings. Blank answers are not confirmed facts. A clean driving record and licensing at age 16 are preliminary assumptions when no different information is provided; verify against available records and disclose assumptions.</p></section>
  ${section('applicant', '2. Applicant', `<dl>${rows(APPLICANT_FIELDS, answers)}</dl>`)}
  ${section('drivers', '3. Drivers', drivers)}
  ${section('vehicles', '4. Vehicles', vehicles, 'Sources: prospect / staff entries and the NHTSA public decode, labeled separately. Verify against the title or registration.')}
  ${section('coverage', '5. Coverage Requested', `<dl>${rows(COVERAGE_FIELDS, answers)}</dl>`)}
  ${section('history', '6. Current Policy & History', `<dl>${rows(HISTORY_FIELDS, answers, noPolicy ? ['carrier', 'yearsWithCarrier', 'currentBi', 'expirationDate', 'premium'] : [])}</dl>`)}
  <section id="sources"><h2>7. Sources &amp; Verification</h2><ul><li><a href="${escape(RATER_URL)}" target="_blank" rel="noopener noreferrer">BLI Auto Rater</a> - load the downloaded quote packet to start carrier quotes.</li>${sources}</ul><p>An NHTSA decode identifies the vehicle build, not its condition, mileage or value. Open the source and match the VIN before relying on it.</p><p>Prospect answers are kept distinct from public facts. Blank answers mean Not shown, not No or zero. DOB, license, driving history, claims and insurance details must be confirmed with the prospect or authorized documents.</p></section><footer>Bill Layne Insurance Agency | Internal quote preparation only. Contains private information; store in the approved client folder. No application has been submitted and no coverage is bound.</footer></main></body></html>`;
}
