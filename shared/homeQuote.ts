export type QuoteField = { key: string; label: string; type?: 'date' | 'email' | 'tel' | 'textarea' | 'select'; options?: string[]; hint?: string; critical?: boolean };
const yesNo = ['Yes', 'No', 'Needs verification'];
export const QUOTE_SECTIONS: { id: string; label: string; fields: QuoteField[] }[] = [
  { id: 'applicant', label: 'Applicant', fields: [
    { key: 'name', label: 'Homeowner / named insured', critical: true },
    { key: 'dob', label: 'Date of birth', type: 'date', critical: true },
    { key: 'phone', label: 'Phone', type: 'tel' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'coApplicant', label: 'Additional named insured and DOB' },
    { key: 'mailingAddress', label: 'Mailing address', hint: 'Enter Same as property if applicable.' },
    { key: 'effectiveDate', label: 'Requested effective date', type: 'date', critical: true },
    { key: 'purchaseDate', label: 'Purchase / closing date', type: 'date' },
  ] },
  { id: 'home', label: 'Home', fields: [
    { key: 'occupancy', label: 'How is the home used?', type: 'select', options: ['Primary residence', 'Secondary / seasonal', 'Long-term rental', 'Short-term rental', 'Vacant', 'Under construction', 'Other', 'Needs verification'], critical: true },
    { key: 'homeType', label: 'Home type', type: 'select', options: ['Site-built single family', 'Manufactured / mobile home', 'Modular', 'Townhome', 'Condo', 'Multi-family', 'Other', 'Needs verification'], critical: true },
    { key: 'yearBuilt', label: 'Year built (prospect confirmation)' },
    { key: 'heatedArea', label: 'Heated square feet (prospect confirmation)' },
    { key: 'construction', label: 'Exterior / construction', hint: 'Brick, frame, veneer, siding or other.' },
    { key: 'foundation', label: 'Foundation / basement', hint: 'Slab, crawlspace, basement; finished area and use.' },
    { key: 'homeDetails', label: 'Stories, baths, garage and finishes', type: 'textarea' },
    { key: 'otherStructures', label: 'Detached buildings / other structures', type: 'textarea', hint: 'Size, construction, use and desired coverage.' },
  ] },
  { id: 'systems', label: 'Roof & Systems', fields: [
    { key: 'roofAge', label: 'Roof age / replacement year', critical: true, hint: 'Ask for the actual year or known age. Do not use the home year built.' },
    { key: 'roofMaterial', label: 'Roof material and condition', critical: true },
    { key: 'roofDetails', label: 'Roof shape, full / partial replacement and proof', type: 'textarea' },
    { key: 'heating', label: 'Primary and supplemental heat', critical: true, hint: 'Include wood stove / fireplace and fuel type.' },
    { key: 'hvac', label: 'HVAC age / updates' },
    { key: 'electrical', label: 'Electrical wiring, panel and update year', critical: true },
    { key: 'plumbing', label: 'Plumbing material and update year', critical: true },
    { key: 'water', label: 'Water heater age; water / sewer source' },
    { key: 'renovations', label: 'Renovations, unrepaired damage or work underway', type: 'textarea' },
  ] },
  { id: 'coverage', label: 'Current Policy', fields: [
    { key: 'policyStatus', label: 'Current insurance status', type: 'select', options: ['Currently insured', 'No current policy', 'Needs verification'], critical: true },
    { key: 'carrier', label: 'Current carrier / uninsured', critical: true },
    { key: 'coverageA', label: 'Current dwelling coverage (Coverage A)', critical: true, hint: 'From the policy or prospect, not the tax assessment.' },
    { key: 'renewalDate', label: 'Renewal / expiration date', type: 'date', critical: true },
    { key: 'premium', label: 'Current premium and policy term' },
    { key: 'deductibles', label: 'All-peril and wind / hail deductibles' },
    { key: 'coverageNeeds', label: 'Requested limits and optional coverage', type: 'textarea', hint: 'Liability, medical payments, contents, loss of use, water backup, valuables, equipment, flood / earthquake.' },
    { key: 'mortgage', label: 'Mortgage lender / escrow' },
    { key: 'lapse', label: 'Lapse, cancellation or nonrenewal?', type: 'select', options: yesNo, critical: true },
    { key: 'policyNotes', label: 'Policy documents requested / coverage notes', type: 'textarea', hint: 'For no current policy, explain the reason and desired start date.' },
  ] },
  { id: 'risk', label: 'Claims & Risk', fields: [
    { key: 'claims', label: 'Any prior claims or losses?', type: 'select', options: yesNo, critical: true, hint: 'Use the lookback period required by the carrier.' },
    { key: 'claimsDetails', label: 'Claim dates, cause, amount, status and repairs', type: 'textarea' },
    { key: 'business', label: 'Business, farming, rental use or unusual exposures', type: 'textarea' },
    { key: 'liabilityRisks', label: 'Animals, pool, trampoline or other liability exposures', type: 'textarea' },
    { key: 'protection', label: 'Fire protection, alarms and safety devices', type: 'textarea', hint: 'Verify fire department, hydrant / station distance and protection class with an approved source.' },
    { key: 'hazards', label: 'Flood, wildfire, prior water damage and other site concerns', type: 'textarea' },
    { key: 'documents', label: 'Outstanding documents / photos', type: 'textarea', hint: 'Declarations, roof evidence, exterior photos and carrier-specific supplements.' },
    { key: 'notes', label: 'Additional prospect answers / follow-up', type: 'textarea' },
  ] },
];
export const QUOTE_FIELDS = QUOTE_SECTIONS.flatMap(section => section.fields);
export const PROPERTY_FIELDS = [
  ['county', 'County'], ['parcelId', 'Parcel ID'], ['pin', 'PIN'],
  ['yearBuilt', 'Year built'], ['effectiveYearBuilt', 'Effective year built (not roof age)'],
  ['heatedArea', 'Heated area (sq ft)'], ['groundFloorArea', 'Ground floor (sq ft)'],
  ['stories', 'Stories'], ['bedrooms', 'Bedrooms'], ['fullBaths', 'Full baths'], ['halfBaths', 'Half baths'],
  ['exteriorWall', 'Exterior wall'], ['foundation', 'Foundation'], ['roofCover', 'Roof covering'],
  ['roofStructure', 'Roof structure'], ['heatingType', 'Heating'], ['totalAcres', 'Acres'],
  ['landValue', 'Assessed land value'], ['buildingValue', 'Assessed building value'], ['totalValue', 'Total assessed value'],
  ['salePrice', 'Recorded sale price'], ['saleDate', 'Recorded sale date'], ['deedBook', 'Deed book'], ['deedPage', 'Deed page'],
] as const;
export const PROPERTY_LINKS = [
  ['taxCard', 'County property card'], ['gisParcel', 'County GIS / parcel map'], ['gis', 'County GIS'],
  ['deed', 'Deed records'], ['googleMaps', 'Google Maps'], ['fema', 'FEMA flood map search'],
  ['ncFlood', 'NC flood map'], ['zillow', 'Zillow search'], ['realtor', 'Realtor.com search'],
] as const;
export type Property = {
  id: string; officialAddress: string; recordAddressDiffers: boolean; hasCountyRecord: boolean;
  matchMethod: string; facts: Record<string, string>; links: Record<string, string>;
};
export type QuoteResearch = { address: string; formattedAddress: string; retrievedAt: string; note: string; results: Property[] };
export type QuoteDraft = {
  version: 1; address: string; answers: Record<string, string>; research: QuoteResearch | null;
  selectedId: string; confirmed: boolean; updatedAt: string;
};
export const newQuoteDraft = (address = ''): QuoteDraft => ({ version: 1, address, answers: {}, research: null, selectedId: '', confirmed: false, updatedAt: new Date().toISOString() });
export const normalizeAddress = (value: string) => value.replace(/\s+/g, ' ').trim();
const asText = (value: unknown, max = 2000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export function safePropertyUrl(value: unknown) {
  try { const url = new URL(asText(value)); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

// Explicit allowlist: never copy owner details or arbitrary upstream fields into the quote.
export function normalizeResearch(raw: unknown, address: string, now = new Date()): QuoteResearch {
  const payload = object(raw);
  if (!Array.isArray(payload.results) || typeof payload.formattedAddress !== 'string') throw new Error('The property service returned an unreadable result. Try again.');
  return {
    address, formattedAddress: asText(payload.formattedAddress, 250), retrievedAt: now.toISOString(), note: asText(payload.note),
    results: payload.results.slice(0, 30).map((item, index) => {
      const source = object(item);
      const facts: Record<string, string> = {};
      for (const [key] of PROPERTY_FIELDS) {
        const value = source[key];
        if (typeof value === 'number' && Number.isFinite(value)) facts[key] = String(value);
        else if (typeof value === 'string' && value.trim()) facts[key] = asText(value, 300);
      }
      const links: Record<string, string> = {};
      for (const [key] of PROPERTY_LINKS) { const url = safePropertyUrl(object(source.links)[key]); if (url) links[key] = url; }
      return {
        id: `${index}:${asText(source.id, 200)}`, officialAddress: asText(source.officialAddress, 250) || 'Address not provided',
        recordAddressDiffers: source.recordAddressDiffers !== false,
        hasCountyRecord: source.hasCountyRecord === true && Boolean(facts.parcelId || facts.pin),
        matchMethod: asText(source.matchMethod, 100), facts, links,
      };
    }),
  };
}
export function selectedProperty(draft: QuoteDraft) { return draft.research?.results.find(item => item.id === draft.selectedId); }
export function answerWarnings(answers: Record<string, string>, now = new Date()) {
  const warnings: string[] = [];
  for (const field of QUOTE_FIELDS.filter(field => field.type === 'date')) {
    const value = answers[field.key];
    if (!value) continue;
    const date = new Date(`${value}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) warnings.push(`${field.label}: enter a valid date.`);
    else if (field.key === 'dob' && value > now.toISOString().slice(0, 10)) warnings.push('Date of birth cannot be in the future.');
  }
  if (answers.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email)) warnings.push('Email: verify the email address.');
  return warnings;
}
export function quoteGaps(draft: QuoteDraft) {
  // Advisory follow-up only; missing answers never gate navigation, saving or reports.
  const noPolicy = draft.answers.policyStatus === 'No current policy';
  const gaps = QUOTE_FIELDS.filter(field => field.critical && !(noPolicy && ['carrier', 'coverageA', 'renewalDate'].includes(field.key)) && (!draft.answers[field.key]?.trim() || /needs verification|unknown|not shown/i.test(draft.answers[field.key])))
    .map(field => field.label);
  if (!draft.answers.phone?.trim() && !draft.answers.email?.trim()) gaps.push('Phone or email');
  if (draft.answers.claims === 'Yes' && !draft.answers.claimsDetails?.trim()) gaps.push('Claim details');
  if (draft.answers.lapse === 'Yes' && !draft.answers.policyNotes?.trim()) gaps.push('Lapse / cancellation details');
  const property = selectedProperty(draft);
  if (!draft.confirmed || !property?.hasCountyRecord) gaps.unshift('Property / parcel match needs verification');
  if (!property?.facts.yearBuilt && !draft.answers.yearBuilt) gaps.push('Year built');
  if (!property?.facts.heatedArea && !draft.answers.heatedArea) gaps.push('Heated square feet');
  return [...gaps, ...answerWarnings(draft.answers)];
}
export function propertyConflicts(draft: QuoteDraft) {
  const property = selectedProperty(draft);
  if (!property) return [];
  return ['yearBuilt', 'heatedArea'].filter(key => {
    const prospect = draft.answers[key]?.replace(/,/g, '').trim();
    return prospect && property.facts[key] && prospect !== property.facts[key];
  }).map(key => `${key === 'yearBuilt' ? 'Year built' : 'Heated square feet'}: public record ${property.facts[key]}; prospect ${draft.answers[key]}. Needs verification.`);
}
export const findMyHomeUrl = (address: string) => `https://find-my-home-information.pages.dev/?address=${encodeURIComponent(address)}`;

export function restoreQuoteDraft(raw: unknown): QuoteDraft {
  const input = object(raw);
  if (input.version !== 1 || typeof input.address !== 'string' || !input.address.trim() || input.address.length > 180) throw new Error('This is not a supported home quote draft.');
  const draft = newQuoteDraft(normalizeAddress(input.address));
  const answers = object(input.answers);
  for (const field of QUOTE_FIELDS) {
    const value = asText(answers[field.key], 4000);
    if (value && (!field.options || field.options.includes(value))) draft.answers[field.key] = value;
  }
  // Re-normalize restored records. Import always requires a fresh match confirmation.
  const research = object(input.research);
  if (research.address === draft.address && Array.isArray(research.results)) {
    draft.research = normalizeResearch({ ...research, results: research.results.map(item => {
      const record = object(item); return { ...object(record.facts), ...record, id: record.id };
    }) }, draft.address);
    draft.research.retrievedAt = Number.isFinite(Date.parse(String(research.retrievedAt))) ? String(research.retrievedAt) : 'Unknown';
    const index = research.results.findIndex(item => object(item).id === input.selectedId);
    draft.selectedId = draft.research.results[index]?.id || draft.research.results[0]?.id || '';
  }
  return draft;
}

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
export function buildHomeQuoteReport(draft: QuoteDraft) {
  const property = selectedProperty(draft);
  const gaps = quoteGaps(draft);
  const conflicts = propertyConflicts(draft);
  const row = (label: string, value?: string) => `<div class="row"><dt>${escape(label)}</dt><dd${value ? '' : ' class="missing"'}>${escape(value || 'Not shown')}</dd></div>`;
  const list = (items: string[]) => `<ul>${items.map(item => `<li>${escape(item)}</li>`).join('')}</ul>`;
  const facts = property?.facts || {};
  const factSummary = (keys: (typeof PROPERTY_FIELDS[number][0])[]) => PROPERTY_FIELDS
    .filter(([key]) => keys.includes(key) && facts[key])
    .map(([key, label]) => `${label}: ${facts[key]}`).join('\n');
  // Public facts belong in the relevant report rows, never in saved prospect answers.
  const publicAnswers: Record<string, string | undefined> = {
    yearBuilt: facts.yearBuilt,
    heatedArea: facts.heatedArea,
    construction: factSummary(['exteriorWall']),
    foundation: factSummary(['foundation']),
    homeDetails: factSummary(['stories', 'bedrooms', 'fullBaths', 'halfBaths']),
    roofMaterial: factSummary(['roofCover']),
    roofDetails: factSummary(['roofStructure']),
    heating: factSummary(['heatingType']),
  };
  const publicSource = `Public record (${draft.confirmed && property?.hasCountyRecord ? 'property match checked' : 'property match unconfirmed'})`;
  const interviewRow = (field: QuoteField) => {
    const label = field.key === 'yearBuilt' ? 'Year built' : field.key === 'heatedArea' ? 'Heated square feet' : field.label;
    const answer = draft.answers[field.key]?.trim();
    const publicAnswer = publicAnswers[field.key];
    if (!publicAnswer) return row(label, answer || (draft.answers.policyStatus === 'No current policy' && ['carrier', 'coverageA', 'renewalDate', 'premium', 'deductibles'].includes(field.key) ? 'Not applicable - prospect reports no current policy' : ''));
    return `<div class="row"><dt>${escape(label)}</dt><dd><div>${escape(answer || publicAnswer)}</div><div class="source">${answer ? 'Prospect / staff entry' : escape(publicSource) + '; prospect confirmation not entered.'}</div>${answer ? `<div class="record-note"><span class="source">${escape(publicSource)}</span>${escape(publicAnswer)}</div>` : ''}</dd></div>`;
  };
  const sections = QUOTE_SECTIONS.map((section, index) => `<section id="${section.id}"><h2>${index + 3}. ${section.label}</h2><p class="source">${section.fields.some(field => publicAnswers[field.key]) ? 'Sources: prospect / staff entries and available public records, labeled separately. Verify against documents.' : 'Source: prospect / staff entry; verify against documents.'}</p><dl>${section.fields.map(interviewRow).join('')}</dl></section>`).join('');
  const sources = property ? PROPERTY_LINKS.filter(([key]) => safePropertyUrl(property.links[key])).map(([key, label]) => `<li><a href="${escape(safePropertyUrl(property.links[key]))}" target="_blank" rel="noopener noreferrer">${escape(label)}</a></li>`).join('') : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><meta name="robots" content="noindex,nofollow"><title>Home quote intake | ${escape(draft.address)}</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f3f4f6;color:#202b35;font:15px/1.6 system-ui,sans-serif;letter-spacing:0}main{max-width:1040px;margin:auto;padding:28px;background:white}header{border-bottom:3px solid #003f87;padding-bottom:20px}header img{width:240px;max-width:100%;height:auto}h1{font-size:28px;line-height:1.25;margin:20px 0 6px}h2{font-size:20px;margin:0 0 8px}p{margin:8px 0}.source,.muted{color:#526170;font-size:13px}.badge{display:inline-block;background:#fff4d8;color:#684900;padding:4px 10px;border-radius:4px;font-weight:700}nav{display:flex;flex-wrap:wrap;gap:8px 18px;border-bottom:1px solid #d5dce3;padding:16px 0}a{color:#004e9d;overflow-wrap:anywhere}section{padding:22px 0;border-bottom:1px solid #d5dce3}dl{margin:0}.row{display:grid;grid-template-columns:minmax(170px,38%) minmax(0,1fr);gap:16px;border-top:1px solid #e8edf1;padding:8px 0;break-inside:avoid}dt{color:#526170}dd{margin:0;font-weight:600;white-space:pre-wrap;overflow-wrap:anywhere}.missing{color:#8a5910;font-weight:400}li{margin:4px 0;overflow-wrap:anywhere}.alert{border-left:3px solid #b87c00;padding:8px 14px;background:#fff9eb}footer{font-size:12px;color:#526170;padding-top:20px}@media(max-width:520px){main{padding:18px}h1{font-size:23px}.row{grid-template-columns:1fr;gap:2px}}@media print{@page{size:letter;margin:.55in}body,main{background:white}main{padding:0;max-width:none;font-size:11px}header img{width:190px}h1{font-size:22px}h2{font-size:16px}nav{display:none}section{padding:14px 0}h2{break-after:avoid}a{color:inherit;text-decoration:none}.row{padding:5px 0}footer{font-size:10px}}
  dd .source{font-weight:400;white-space:normal}.record-note{margin-top:8px;padding-top:8px;border-top:1px dashed #d5dce3;font-weight:400}.record-note .source{display:block}
  </style></head><body><main><header><img src="https://img.billlayneinsurance.com/i/2026/08/bli-agency-logo-4jqj2j.png" alt="Bill Layne Insurance"><h1>Home Quote Intake</h1><p>${escape(draft.address)}</p><span class="badge">Working intake - not a quote or binder</span><p class="muted">Private agency worksheet. Prepared ${escape(new Date().toLocaleString('en-US'))}.</p></header>
  <nav aria-label="Report index"><a href="#review">1. Follow-up</a><a href="#property">2. Property</a>${QUOTE_SECTIONS.map((section, index) => `<a href="#${section.id}">${index + 3}. ${section.label}</a>`).join('')}<a href="#sources">8. Sources</a></nav>
  <section id="review"><h2>1. Follow-Up Notes</h2><p>${gaps.length} follow-up notes. All interview questions are optional; unanswered items do not block this report. Carrier-specific underwriting requirements and replacement-cost calculation still apply.</p>${gaps.length ? list(gaps) : '<p>Core interview checklist entered. Verify all answers and carrier requirements before quoting.</p>'}${conflicts.length ? `<div class="alert"><strong>Conflicting information</strong>${list(conflicts)}</div>` : ''}<p class="alert">Tax assessments and sale prices are not replacement cost or a recommended Coverage A limit. Do not infer roof age from year built. A map link does not establish flood zone, protection class or eligibility.</p></section>
  <section id="property"><h2>2. Property Research</h2><p class="source">Source: Find My Home Information / county public records. Retrieved ${escape(draft.research?.retrievedAt || 'Not retrieved')}. Public records require client verification.</p><p><strong>${draft.confirmed && property?.hasCountyRecord ? 'Staff confirmed the property match.' : 'Needs verification: property match is not confirmed.'}</strong></p>${draft.research?.note ? `<p>${escape(draft.research.note)}</p>` : ''}<dl>${row('Entered address', draft.address)}${row('Geocoded address', draft.research?.formattedAddress)}${row('Record address', property?.officialAddress)}${PROPERTY_FIELDS.map(([key, label]) => row(label, property?.facts[key])).join('')}</dl></section>
  ${sections}<section id="sources"><h2>8. Sources & Verification</h2><ul><li><a href="${escape(findMyHomeUrl(draft.address))}" target="_blank" rel="noopener noreferrer">Find My Home Information - entered address</a></li>${sources}</ul><p>Links may open a search or general county portal. Open the source and match the address and parcel before relying on it. The property card, deed, flood maps and listing pages are not independently parsed or verified by this worksheet.</p><p>Prospect answers are kept distinct from public facts. Blank answers mean Not shown, not No or zero. DOB, ownership, claims, updates and insurance details must be confirmed with the prospect or authorized documents.</p></section><footer>Bill Layne Insurance Agency | Internal quote preparation only. Contains private information; store in the approved client folder. No application has been submitted and no coverage is bound.</footer></main></body></html>`;
}
