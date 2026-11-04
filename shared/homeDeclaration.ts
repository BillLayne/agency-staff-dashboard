import { QUOTE_FIELDS, newQuoteDraft, normalizeAddress, type QuoteDraft } from './homeQuote.ts';

// Document details are evidence, never an answer to claims, lapse or status
// questions, nor a source for a prospective quote's requested effective date.
export const homeDocumentKeys = new Set(['name', 'dob', 'phone', 'email', 'coApplicant', 'mailingAddress', 'occupancy', 'homeType', 'yearBuilt', 'heatedArea', 'construction', 'foundation', 'homeDetails', 'roofAge', 'roofMaterial', 'roofDetails', 'heating', 'hvac', 'electrical', 'plumbing', 'water', 'renovations', 'carrier', 'coverageA', 'renewalDate', 'premium', 'deductibles', 'coverageNeeds', 'mortgage', 'policyNotes']);
const record = (raw: unknown): Record<string, unknown> => raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s + 'T12:00:00Z')) && new Date(s + 'T12:00:00Z').toISOString().slice(0, 10) === s;
export interface HomeDeclaration { documentType: 'current' | 'renewal' | 'unknown'; riskAddress: string; answers: Record<string, string> }
export function normalizeHomeDeclaration(raw: unknown): HomeDeclaration {
  const data = record(raw), source = record(data.answers), answers: Record<string, string> = {};
  const documentType = data.documentType === 'current' || data.documentType === 'renewal' ? data.documentType : 'unknown';
  for (const field of QUOTE_FIELDS) {
    if (!homeDocumentKeys.has(field.key) || typeof source[field.key] !== 'string') continue;
    let value = (source[field.key] as string).trim().slice(0, 2000);
    if (!value || (field.options && !field.options.includes(value)) || (field.type === 'date' && !validDate(value))) continue;
    if (field.key === 'coverageNeeds' && !/document|declaration|source/i.test(value)) value = 'Policy document (verify requested coverages): ' + value;
    if (field.key === 'premium' && documentType !== 'current' && !/renewal|source|document/i.test(value)) value = 'Source document: ' + value;
    answers[field.key] = value;
  }
  // Future renewal terms and limits must not be labeled as the expiring policy.
  if (documentType !== 'current') { delete answers.carrier; delete answers.coverageA; delete answers.renewalDate; }
  const riskAddress = typeof data.riskAddress === 'string' ? normalizeAddress(data.riskAddress).slice(0, 180) : '';
  return { documentType, riskAddress, answers };
}
export const homeDeclarationHasData = (data: HomeDeclaration) => Boolean(data.riskAddress || Object.keys(data.answers).length);
const nameKey = (s = '') => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const addressKey = (s: string) => s.toLowerCase().replace(/\b(north|south|east|west)\b/g, value => ({ north: 'n', south: 's', east: 'e', west: 'w' }[value] || value)).replace(/\b(street|road|avenue|drive|lane|court|boulevard|highway)\b/g, value => ({ street: 'st', road: 'rd', avenue: 'ave', drive: 'dr', lane: 'ln', court: 'ct', boulevard: 'blvd', highway: 'hwy' }[value] || value)).replace(/[^a-z0-9]+/g, ' ').trim();

/** Returns a new draft. Research and existing answers are never overwritten. */
export function mergeHomeDeclaration(draft: QuoteDraft, raw: HomeDeclaration, chosenAddress: string): { draft: QuoteDraft; needsResearch: boolean; skipped: number } {
  const data = normalizeHomeDeclaration(raw), address = normalizeAddress(chosenAddress);
  if (address.length < 8 || address.length > 180 || !/\d/.test(address) || !/[a-z]/i.test(address)) throw new Error('Enter the full property address before adding the document details.');
  if (draft.address && addressKey(draft.address) !== addressKey(address)) throw new Error('This address does not match the open draft. Save the draft and start a new home quote before importing.');
  if (draft.answers.name && !data.answers.name) throw new Error('The named insured was not found on the document. Verify the insured before adding details to this draft.');
  if (draft.answers.name && data.answers.name && nameKey(draft.answers.name) !== nameKey(data.answers.name)) throw new Error('The named insured differs from the open draft. Save it and start a new home quote before importing.');
  const needsResearch = !draft.address;
  const next: QuoteDraft = { ...newQuoteDraft(address), ...draft, address: draft.address || address, answers: { ...draft.answers }, documentValues: { ...draft.documentValues }, updatedAt: new Date().toISOString() };
  let skipped = 0;
  for (const [key, value] of Object.entries(data.answers)) {
    if (!next.answers[key]?.trim()) { next.answers[key] = value; next.documentValues![key] = value; }
    else if (next.answers[key].trim().toLowerCase() !== value.toLowerCase()) skipped++;
  }
  return { draft: next, needsResearch, skipped };
}
