
import type { Portal, SearchMode } from './types';

/* ============================================================================
   BRAND COLORS
============================================================================ */
export const COLORS = {
  PRIMARY_BLUE: '#003f87',
  SECONDARY_BLUE: '#0076d3',
  GREEN: '#10b981',
  PAGE_BG: '#f1f5f9',
  HEADING: '#0f172a',
  BODY: '#334155',
  FOOTER_BG: '#0f172a',
  STAR_GOLD: '#facc15',
  WHITE: '#ffffff'
};

/* ============================================================================
   SOCIAL LINKS
============================================================================ */
export const SOCIAL_LINKS = {
  YOUTUBE: 'https://www.youtube.com/@ncautoandhome',
  FACEBOOK: 'https://www.facebook.com/dollarbillagency/',
  INSTAGRAM: 'https://www.instagram.com/ncautoandhome/',
  X: 'https://x.com/shopsavecompare'
};

/* ============================================================================
   CARRIER LOGOS
============================================================================ */
export const CARRIER_LOGOS: Record<string, string> = {
  'Progressive': 'https://i.imgur.com/7N1vfo0.png',
  'Nationwide': 'https://i.imgur.com/Mv5V7tV.png',
  'Travelers': 'https://i.imgur.com/m6wsO1p.png',
  'National General': 'https://i.imgur.com/HF8oPAF.png',
  'Foremost': 'https://i.imgur.com/rHIo4r5.jpg',
  'Hagerty': 'https://i.imgur.com/0UyINHi.png',
  'Dairyland': 'https://i.imgur.com/1VkIvxv.png',
  'NCJUA': 'https://i.imgur.com/oSJj6ZW.png',
  'NC Grange Mutual': 'https://i.imgur.com/Fesnkng.png',
  'Alamance Farmers': 'https://i.imgur.com/S8BVnvs.png'
};

export const CARRIER_UI_COLORS: Record<string, string> = {
  'Progressive': '#e8f4fd',
  'Nationwide': '#e8edf5',
  'Travelers': '#fde8e8',
  'National General': '#fef3e8',
  'Foremost': '#e8f5e9',
  'Hagerty': '#fef9e8',
  'Dairyland': '#e8f5f2',
  'NCJUA': '#eef2ff',
  'NC Grange Mutual': '#e8f5e9',
  'Alamance Farmers': '#fdf5e8'
};

export const AGENCY_LOGO = 'https://i.imgur.com/lxu9nfT.png';

/* ============================================================================
   GMAIL SYSTEM PROMPT (ENGINEERING GRADE)
============================================================================ */
export const GMAIL_SYSTEM_PROMPT = `You are the Lead Email Engineer for Bill Layne Insurance. Generate luxury-grade HTML for GMAIL.

**MISSION CONTROL:**
1. **Analyze Context:** Is this a simple email/payment reminder OR a complex policy document?
2. **Strict Adherence:** ONLY include information present in the user's prompt or attached files. **NEVER HALLUCINATE** coverages, limits, or policy numbers.

**MODE 1: GENERAL CORRESPONDENCE & PAYMENTS**
(Trigger: Payment reminders, simple notes, "amounts due", general questions, or lists of bills)
- **Goal:** Clear, friendly communication.
- **Action:** Present the provided info (e.g., list of bills, dates, names) in a clean, centered table or bulleted list.
- **Forbidden:** DO NOT generate a "Verification of Insurance" or "Quote Breakdown" unless explicitly requested. DO NOT invent liability limits or vehicle coverages if only payment info is given.

**MODE 2: POLICY ANALYSIS (Quotes, Renewals, Declarations, Certificates of Insurance)**
(Trigger: "Quote", "Review", "Dec Page", "COI", "Certificate", or detailed coverage data provided in the prompt/file)
- **Goal:** Full E&O Protection and accurate data extraction.
- **Requirement:** Fully itemize every coverage found.
- **Auto:** Break down EACH vehicle (Liability, Coll, Comp, Rental, Towing).
- **Home:** Break down Cov A-F.
- **Certificates (COI):** Extract and clearly list the Insured, Certificate Holder, Policy Numbers, Effective/Expiration Dates, and all Liability Limits (General, Auto, Umbrella, Workers Comp).
- **Rule:** If coverage data exists, display it. If not, do not invent it.

**VISUAL STANDARDS:**
- **Structure:** <table> based only. 600px max-width centered.
- **Brand:** Primary Blue (#003f87) and Secondary Blue (#0076d3) Accents.
- **CRITICAL HEADER RULE:** DO NOT include the main "Bill Layne Insurance" agency header or logo at the top of your output. The system automatically wraps your content with the official agency header. Start directly with the content (e.g., Hello, Carrier Logo, or Subject).
- **NO DUPLICATE OUTER SHELL:** Never output a second official dual-logo header, second hero band, or repeated top branding block. There must only be one top header/hero sequence total.
- **Tone:** "Neighborly Professionalism" (Warm, clear, helpful).
- **Output:** Return ONLY the inner body HTML.
`;

/* ============================================================================
   WEBPAGE SYSTEM PROMPT
============================================================================ */
export const WEBPAGE_SYSTEM_PROMPT = `
You are the Elite Hybrid Insurance Quote Webpage Generator for Bill Layne Insurance.
Follow strict brand identity: Trust Teal (#2080a0), Black (#000000).
Ensure every vehicle and property detail is itemized in high-density tables/cards.
No raw markdown, no commentary, only full HTML with inline CSS.
`;

/* ============================================================================
   AGENT PORTALS
============================================================================ */
export const DEFAULT_INSURANCE_PORTALS: Portal[] = [
  { id:'agency-matrix', name:'Agency Matrix', url:'https://agents.agencymatrix.com/#/', icon:'fa-solid fa-building', description:'Primary agent portal', color: '#1e293b' },
  { id:'nationwide', name:'Nationwide', url:'https://agentcenter.nationwide.com/home', icon:'fa-solid fa-flag-usa', description:'Agent center portal', image: 'https://i.imgur.com/Mv5V7tV.png', color: '#005596' },
  { id:'national-general', name:'National General', url:'https://natgenagency.com/MainMenu.aspx', icon:'fa-solid fa-globe', description:'Agency portal', image: 'https://i.imgur.com/HF8oPAF.png', color: '#002D72' },
  { id:'progressive', name:'Progressive', url:'https://www.foragentsonly.com/home/?Welcome=400', icon:'fa-solid fa-chart-line', description:'For agents only portal', image: 'https://i.imgur.com/7N1vfo0.png', color: '#00A1E0' },
  { id:'foremost', name:'Foremost', url:'https://www.foremostagent.com/ia/portal/login', icon:'fa-solid fa-house-user', description:'Agent portal login', image: 'https://i.imgur.com/rHIo4r5.jpg', color: '#F58220' },
  { id:'nc-grange', name:'NC Grange', url:'https://ncgmweb.com/login', icon:'fa-solid fa-tractor', description:'NC Grange portal', image: 'https://i.imgur.com/Fesnkng.png', color: '#2E7D32' }
];

/**
 * The rest of the carriers Bill represents. These sit behind the "More Carriers"
 * menu in the portal drawer so the tile row stays down to the daily-use portals.
 * Logos are served from this repo's public/ folder.
 */
export const MORE_CARRIER_PORTALS: Portal[] = [
  { id:'alamance', name:'Alamance', url:'https://alamance.britecore.com/agent/misc/ko_dashboard', icon:'fa-solid fa-shield-halved', description:'BriteCore dashboard', image:'/alamance.png', color:'#4CAF50' },
  { id:'steadily', name:'Steadily', url:'https://agent.steadily.com/home', icon:'fa-solid fa-house-chimney-user', description:'Landlord insurance agent portal', color:'#2563eb' },
  { id:'travelers', name:'Travelers', url:'https://signin.travelers.com/apps', icon:'fa-solid fa-umbrella', description:'Agent sign-in', image:'/travelers.png', color:'#E01719' },
  { id:'dairyland', name:'Dairyland', url:'https://agent.dairylandagent.com/web/dashboard/my-dashboard?continue', icon:'fa-solid fa-motorcycle', description:'Agent dashboard', image:'/dairyland.png', color:'#0057B8' },
  { id:'allstate', name:'Allstate', url:'https://myconnection1.allstate.com/IA/?CID=OTC-DNSR-GR-120523&att=myallstateconnection', icon:'fa-solid fa-hands-holding-circle', description:'MyConnection agent portal', color:'#0033A0' },
  { id:'docusign', name:'DocuSign', url:'https://app.hellosign.com/', icon:'fa-solid fa-file-signature', description:'E-signature (HelloSign)', color:'#FFB800' },
  { id:'colonial-group', name:'Colonial Group', url:'https://tcgportal.azurewebsites.net/Portal2', icon:'fa-solid fa-building-columns', description:'TCG agent portal', color:'#1e3a8a' },
  { id:'hagerty', name:'Hagerty', url:'https://www.hagertyagent.com/Agent/Home', icon:'fa-solid fa-car-side', description:'Classic car agent portal', image:'/hagerty.png', color:'#C8102E' },
  { id:'ncjua', name:'NCJUA', url:'https://insure.ncjuanciua.org/innovation', icon:'fa-solid fa-house-tsunami', description:'Coastal / FAIR plan portal', color:'#005596' },
  { id:'ncrb', name:'NCRB', url:'https://webportal.ncrb.org/NCRBPortal/PortalHome.aspx', icon:'fa-solid fa-scale-balanced', description:'NC Rate Bureau portal', color:'#6d28d9' }
];

/* ============================================================================
   SEARCH MODES
============================================================================ */
export const MODE_META: Record<SearchMode, { placeholder: string; showTax: boolean }> = {
  agency: { placeholder:'Search Agency Matrix by name or address…', showTax:false },
  web: { placeholder:'Search the web…', showTax:false },
  realestate: { placeholder:'Enter NC property address for Find My Home…', showTax:true },
  people: { placeholder:'Enter name, phone, or address…', showTax:false },
  onedrive: { placeholder:'Search Client Folder by name…', showTax:false },
  contacts: { placeholder:'Start typing an insurance company name…', showTax:false }
};

/* ============================================================================
   NC COUNTY GIS
============================================================================ */
export const NC_COUNTY_GIS_DATA: Record<string, { name: string; url: string; note?: string }> = {
  surry: { name:'Surry County', url:'https://gis.surryinfo.com/?addr={query}' },
  yadkin: { name:'Yadkin County', url:'http://gis.yadkinshunt.com/yadkingis/?find={query}' },
  wilkes: { name:'Wilkes County', url:'https://gis.wilkescounty.net/wilkesjs/', note:'Manual search required.' },
  forsyth: { name:'Forsyth County', url:'http://www.cityofws.org/maps?find={query}' },
  mecklenburg: { name:'Mecklenburg County', url:'https://polaris3g.mecklenburgcountync.gov/search?str={query}' },
  wake: { name:'Wake County', url:'https://maps.raleighnc.gov/iMAPS/?search={query}' }
};

/* ============================================================================
   PROMPT TEMPLATES - STRENGTHENED PER-TEMPLATE CONTRACTS
============================================================================ */
export type TemplateType =
  | 'auto-quote' | 'home-quote' | 'renters-quote' | 'motorcycle-quote'
  | 'commercial-quote' | 'sr22-quote' | 'comparison' | 'welcome'
  | 'renewal' | 'receipt' | 'policy-change' | 'poi' | 'coi'
  | 'cancellation' | 'claims' | 'needs-analysis' | 'underwriting'
  | 'marketing' | 'referral' | 'google-review';

export interface TemplateContract {
  key: string;
  title: string;
  icon: string;
  bgColor: string;
  templateType: TemplateType;
  heroStyle: 'gradient' | 'gradient-renewal' | 'solid-green' | 'solid-navy' | 'solid-blue' | 'solid-amber' | 'solid-red';
  heroNumberRule: string;
  intent: string;
  requiredSections: string[];
  forbiddenSections: string[];
  requiredDataFields: string[];
  optionalDataFields?: string[];
  ctaRules: string;
  complianceNotes?: string;
  isSales: boolean;
  isB2B?: boolean;
  prompt: string;
}

const SALES_CTA = 'Call -> Notify Bill to Contact Me -> Reply -> Messenger. First-person copy.';
const TXN_CTA = 'Call -> Reply, with inline Messenger text link only. No Notify-Bill button.';
const B2B_CTA = 'Call -> Reply, inline Messenger text link only. No social buttons and no Facebook-follow line.';

export const PROMPT_TEMPLATES: Record<string, TemplateContract> = {
  auto_quote: {
    key: 'auto_quote',
    title: 'Auto Insurance Quote',
    icon: 'fa-car',
    bgColor: '#0f172a',
    templateType: 'auto-quote',
    heroStyle: 'gradient',
    isSales: true,
    heroNumberRule: 'BIG = monthly payment. Gold label "Est. Monthly Payment". Sub-line = total term premium plus payment-plan clarification.',
    intent: 'Present a competitive auto quote and invite the client to bind.',
    requiredSections: ['Greeting + thank-you', 'Hero with monthly premium', 'We Shopped Your Rate card', 'Per-vehicle coverage breakdown', 'Drivers as stacked rows with no avatars', 'CTA with effective-date microcopy'],
    forbiddenSections: ['Proof-of-insurance or ID-card language', 'Payment-received or receipt confirmation', 'Certificate-holder language', 'Bound-coverage language such as "you are covered" or "your policy"'],
    requiredDataFields: ['CLIENT_NAME', 'CARRIER', 'TERM_MONTHS', 'TOTAL_PREMIUM', 'VEHICLES[]', 'DRIVERS[]', 'EFFECTIVE_DATE'],
    optionalDataFields: ['QUOTE_NUMBER', 'BUNDLE_OPPORTUNITY'],
    ctaRules: SALES_CTA,
    complianceNotes: 'Quote is not a policy. Add subject-to-underwriting and rating-verification language.',
    prompt: 'Generate a 2026 Gmail-safe AUTO INSURANCE QUOTE. Monthly-first hero. Include the We Shopped Your Rate card, a per-vehicle coverage breakdown, and driver stacked rows with no circle avatars. Quote language only; never imply bound coverage.',
  },
  home_quote: {
    key: 'home_quote',
    title: 'Home Insurance Quote',
    icon: 'fa-house',
    bgColor: '#0f172a',
    templateType: 'home-quote',
    heroStyle: 'gradient',
    isSales: true,
    heroNumberRule: 'BIG = annual premium. Label "Annual Premium". Sub-line = monthly escrow estimate.',
    intent: 'Present a competitive homeowners or dwelling quote and invite the client to bind.',
    requiredSections: ['Greeting + thank-you', 'Hero with annual premium', 'We Shopped Your Rate card', 'Combined Coverage Value card where TIV = A + B + C only', 'Coverage breakdown A/B/C/D/E/F', 'Property or insured stacked row', 'CTA'],
    forbiddenSections: ['"Total coverage" or "policy limit" on the TIV card', 'Receipt language', 'POI language', 'Bound-coverage language'],
    requiredDataFields: ['CLIENT_NAME', 'CARRIER', 'ANNUAL_PREMIUM', 'COVERAGE_A', 'COVERAGE_B', 'COVERAGE_C', 'DEDUCTIBLE', 'PROPERTY_ADDRESS'],
    optionalDataFields: ['MONTHLY_ESCROW', 'COVERAGE_D', 'COVERAGE_E', 'COVERAGE_F', 'ROOF_AGE'],
    ctaRules: SALES_CTA,
    complianceNotes: 'TIV = Coverage A + B + C only. Never include D/E/F in TIV. Quote is not a policy.',
    prompt: 'Generate a 2026 Gmail-safe HOME INSURANCE QUOTE. Annual-first hero. Include the We Shopped Your Rate card, Combined Coverage Value where TIV = A+B+C, and the full coverage breakdown. Quote language only.',
  },
  renters_quote: {
    key: 'renters_quote',
    title: 'Renters Insurance Quote',
    icon: 'fa-house-user',
    bgColor: '#0f172a',
    templateType: 'renters-quote',
    heroStyle: 'gradient',
    isSales: true,
    heroNumberRule: 'BIG = annual premium. Label "Annual Premium". Sub-line = monthly estimate.',
    intent: 'Present a renters quote and invite the client to bind.',
    requiredSections: ['Greeting + thank-you', 'Hero with annual premium', 'We Shopped Your Rate card', 'Personal property / liability / loss-of-use breakdown', 'CTA'],
    forbiddenSections: ['Dwelling or Coverage A language', 'Receipt language', 'POI language'],
    requiredDataFields: ['CLIENT_NAME', 'CARRIER', 'ANNUAL_PREMIUM', 'PERSONAL_PROPERTY_LIMIT', 'LIABILITY_LIMIT', 'PROPERTY_ADDRESS'],
    ctaRules: SALES_CTA,
    complianceNotes: 'Renters has no dwelling coverage. Quote is not a policy.',
    prompt: 'Generate a 2026 Gmail-safe RENTERS QUOTE. Annual-first hero, We-Shopped card, personal property / liability / loss-of-use breakdown. No dwelling coverage. Quote language only.',
  },
  motorcycle_quote: {
    key: 'motorcycle_quote',
    title: 'Motorcycle Insurance Quote',
    icon: 'fa-motorcycle',
    bgColor: '#0f172a',
    templateType: 'motorcycle-quote',
    heroStyle: 'gradient',
    isSales: true,
    heroNumberRule: 'BIG = monthly payment. Sub-line = total term premium.',
    intent: 'Present a motorcycle or powersport quote and invite the client to bind.',
    requiredSections: ['Greeting + thank-you', 'Hero with monthly premium', 'We Shopped Your Rate card', 'Per-unit coverage breakdown', 'Rider stacked rows', 'CTA'],
    forbiddenSections: ['Receipt language', 'POI language', 'Bound-coverage language'],
    requiredDataFields: ['CLIENT_NAME', 'CARRIER', 'TERM_MONTHS', 'TOTAL_PREMIUM', 'UNITS[]', 'RIDERS[]'],
    ctaRules: SALES_CTA,
    complianceNotes: 'Quote is not a policy. For dual-policy powersport/RV, show combined annual total and payment-plan cards.',
    prompt: 'Generate a 2026 Gmail-safe MOTORCYCLE / POWERSPORT QUOTE. Monthly-first hero, We-Shopped card, per-unit coverage, rider stacked rows. Quote language only.',
  },
  sr22_quote: {
    key: 'sr22_quote',
    title: 'SR-22 Auto Quote',
    icon: 'fa-file-contract',
    bgColor: '#0f172a',
    templateType: 'sr22-quote',
    heroStyle: 'gradient',
    isSales: true,
    heroNumberRule: 'BIG = monthly payment. Sub-line = total term premium.',
    intent: 'Present an auto quote that includes SR-22 financial-responsibility filing.',
    requiredSections: ['Greeting + thank-you', 'Hero with monthly premium', 'We Shopped Your Rate card', 'Coverage breakdown', 'Plain-English SR-22 filing explainer', 'CTA'],
    forbiddenSections: ['Receipt language', 'POI language', 'Judgmental or shaming tone'],
    requiredDataFields: ['CLIENT_NAME', 'CARRIER', 'TERM_MONTHS', 'TOTAL_PREMIUM', 'VEHICLES[]', 'SR22_FILING_FEE', 'SR22_DURATION'],
    ctaRules: SALES_CTA,
    complianceNotes: 'Explain SR-22 is a filing, not a policy type. Quote is not a policy.',
    prompt: 'Generate a 2026 Gmail-safe SR-22 AUTO QUOTE. Monthly-first hero, We-Shopped card, coverage breakdown, plus a plain-English SR-22 filing explainer. Supportive, non-judgmental, quote language only.',
  },
  commercial_quote: {
    key: 'commercial_quote',
    title: 'Commercial Insurance Quote',
    icon: 'fa-briefcase',
    bgColor: '#0f172a',
    templateType: 'commercial-quote',
    heroStyle: 'gradient',
    isSales: true,
    heroNumberRule: 'BIG = annual premium. Label "Annual Premium". Sub-line = payment-plan note.',
    intent: 'Present a commercial BOP, GL, commercial auto, or workers comp quote.',
    requiredSections: ['Greeting + thank-you', 'Hero with annual premium', 'We Shopped Your Rate card', 'Coverage breakdown by line', 'Named insured / business stacked row', 'CTA'],
    forbiddenSections: ['Personal-lines driver-age sub-labels', 'Receipt language', 'POI language', 'COI delivery language'],
    requiredDataFields: ['BUSINESS_NAME', 'CARRIER', 'ANNUAL_PREMIUM', 'COVERAGE_LINES[]', 'EFFECTIVE_DATE'],
    optionalDataFields: ['NAICS', 'CLASS_CODE'],
    ctaRules: SALES_CTA,
    complianceNotes: 'Quote is not a policy. Surplus/E&S lines need amber statutory notice. Carrier with no logo should use a text pill.',
    prompt: 'Generate a 2026 Gmail-safe COMMERCIAL QUOTE. Annual-first hero, We-Shopped card, coverage by line. Quote language only. Surplus lines get the amber notice.',
  },
  comparison: {
    key: 'comparison',
    title: 'Rate Comparison',
    icon: 'fa-scale-balanced',
    bgColor: '#0f172a',
    templateType: 'comparison',
    heroStyle: 'gradient',
    isSales: true,
    heroNumberRule: 'BIG = recommended option payment. Sub-line names the carrier.',
    intent: 'Compare the client current or competing rate against Bill recommended option.',
    requiredSections: ['Greeting + thank-you', 'Hero with recommended option', 'Side-by-side comparison', 'Why the recommended option wins', 'CTA'],
    forbiddenSections: ['Disparaging competitors', 'Receipt language', 'POI language', 'Spam superlatives such as cheapest or best price'],
    requiredDataFields: ['CLIENT_NAME', 'OPTIONS[]'],
    ctaRules: SALES_CTA,
    complianceNotes: 'Use neutral language such as competitive and your options. Quote is not a policy.',
    prompt: 'Generate a 2026 Gmail-safe RATE COMPARISON. Hero shows the recommended option. Include a side-by-side comparison, neutral language, and no spam superlatives.',
  },
  welcome: {
    key: 'welcome',
    title: 'Welcome / New Business',
    icon: 'fa-handshake',
    bgColor: '#0f172a',
    templateType: 'welcome',
    heroStyle: 'gradient',
    isSales: true,
    heroNumberRule: 'AUTO: monthly big. HOME/property: annual big. Label "Active Coverage Confirmed".',
    intent: 'Welcome a newly bound client and walk them through activation and next steps.',
    requiredSections: ['Greeting + thank-you', 'Hero with bound premium', 'Policy at a glance', 'Covered items', 'Drivers or insureds as stacked rows', 'Activation next steps', 'Claims Steps card', 'CTA'],
    forbiddenSections: ['We Shopped Your Rate card', 'Quote or proposal framing', 'Receipt language'],
    requiredDataFields: ['CLIENT_NAME', 'CARRIER', 'POLICY_NUMBER', 'EFFECTIVE_DATE', 'PREMIUM', 'COVERED_ITEMS[]'],
    ctaRules: SALES_CTA + ' Full Messenger opt-in card allowed.',
    complianceNotes: 'Coverage is bound here, so confirming language is allowed.',
    prompt: 'Generate a 2026 Gmail-safe WELCOME / NEW BUSINESS email. Gradient hero, policy-at-a-glance, covered items, insured stacked rows, activation next steps, and a Claims Steps card. No We-Shopped card.',
  },
  renewal: {
    key: 'renewal',
    title: 'Policy Renewal',
    icon: 'fa-arrows-rotate',
    bgColor: '#0f172a',
    templateType: 'renewal',
    heroStyle: 'gradient-renewal',
    isSales: true,
    heroNumberRule: 'AUTO: monthly big. HOME: annual big. Label "Your Renewal". Use warmer gradient variant.',
    intent: 'Confirm an upcoming renewal, show the new premium, and reinforce loyalty.',
    requiredSections: ['Greeting + loyalty thank-you', 'Hero with new premium', 'Loyalty callout', 'What changed', 'Renewal action / next steps', 'CTA'],
    forbiddenSections: ['We Shopped Your Rate card', 'New-quote or proposal framing', 'Receipt language', 'POI language'],
    requiredDataFields: ['CLIENT_NAME', 'CARRIER', 'POLICY_NUMBER', 'RENEWAL_DATE', 'NEW_PREMIUM'],
    optionalDataFields: ['PRIOR_PREMIUM', 'CHANGES[]'],
    ctaRules: SALES_CTA,
    complianceNotes: 'Renewal is not a quote. If premium increased, be transparent and offer to re-shop.',
    prompt: 'Generate a 2026 Gmail-safe RENEWAL email. Warmer gradient hero, loyalty callout instead of We-Shopped, what-changed summary, and renewal next steps.',
  },
  receipt: {
    key: 'receipt',
    title: 'Payment Receipt',
    icon: 'fa-receipt',
    bgColor: '#059669',
    templateType: 'receipt',
    heroStyle: 'solid-green',
    isSales: false,
    heroNumberRule: 'BIG = amount paid. Label "Payment Confirmed".',
    intent: 'Confirm a received payment.',
    requiredSections: ['Hero with amount paid', 'Payment receipt detail block', 'Next payment or installment schedule when applicable', 'Disclaimer'],
    forbiddenSections: ['Quote or proposal language', 'Duplicate header or hero', 'We Shopped card', 'POI language'],
    requiredDataFields: ['CLIENT_NAME', 'PAYMENT_AMOUNT', 'PAYMENT_DATE', 'PAYMENT_METHOD', 'POLICY_NUMBER', 'COVERAGE_START', 'COVERAGE_END'],
    optionalDataFields: ['NEXT_DUE_DATE', 'NEXT_DUE_AMOUNT', 'REMAINING_PAYMENTS'],
    ctaRules: TXN_CTA,
    complianceNotes: 'NSF variant should use amber tone and "payment was not received" wording. NC 11 NCAC 04.0121.',
    prompt: 'Generate a 2026 Gmail-safe PAYMENT RECEIPT. Solid green hero with "Payment Confirmed", receipt detail block, next-payment schedule. Exactly one header and one hero. No quote language.',
  },
  policy_change: {
    key: 'policy_change',
    title: 'Policy Change Confirmation',
    icon: 'fa-pen-to-square',
    bgColor: '#0076d3',
    templateType: 'policy-change',
    heroStyle: 'solid-blue',
    isSales: false,
    heroNumberRule: 'BIG = net premium change. Label "Change Confirmation".',
    intent: 'Confirm a change made to an existing policy.',
    requiredSections: ['Hero with net premium change', 'What changed', 'What stayed the same', 'Financial impact', 'Required disclosures when applicable', 'CTA', 'Disclaimer'],
    forbiddenSections: ['Quote or proposal language', 'Receipt confirmation language', 'POI language'],
    requiredDataFields: ['CLIENT_NAME', 'POLICY_NUMBER', 'CHANGE_DESCRIPTION', 'PRIOR_PREMIUM', 'NEW_PREMIUM', 'REQUESTED_BY'],
    ctaRules: TXN_CTA,
    complianceNotes: 'Driver exclusion or coverage reduction requires E&O disclosure and NC statutory notice periods.',
    prompt: 'Generate a 2026 Gmail-safe POLICY CHANGE CONFIRMATION. Solid blue hero, what-changed / what-stayed-the-same, financial impact, and conditional disclosures.',
  },
  poi: {
    key: 'poi',
    title: 'Proof of Insurance',
    icon: 'fa-id-card',
    bgColor: '#003f87',
    templateType: 'poi',
    heroStyle: 'solid-navy',
    isSales: false,
    heroNumberRule: 'BIG = policy or effective info. Label "Proof of Insurance".',
    intent: 'Provide official proof of an active policy.',
    requiredSections: ['Hero with policy/effective info', 'Covered items', 'Coverage schedule', 'Optional lienholder / additional interest', 'CTA'],
    forbiddenSections: ['Quote or proposal language', 'Receipt language', 'We Shopped card'],
    requiredDataFields: ['CLIENT_NAME', 'CARRIER', 'POLICY_NUMBER', 'EFFECTIVE_DATE', 'EXPIRATION_DATE', 'COVERED_ITEMS[]'],
    ctaRules: TXN_CTA,
    complianceNotes: 'Routed by dedicated renderer in poiTemplate.ts, not the general model path.',
    prompt: 'Generate a 2026 Gmail-safe PROOF OF INSURANCE. Solid navy hero, covered items, coverage schedule, optional lienholder block.',
  },
  coi: {
    key: 'coi',
    title: 'Certificate of Insurance',
    icon: 'fa-shield-halved',
    bgColor: '#003f87',
    templateType: 'coi',
    heroStyle: 'solid-navy',
    isSales: false,
    isB2B: true,
    heroNumberRule: 'BIG = policy/effective info. Label "Certificate of Insurance".',
    intent: 'Provide a certificate of insurance for a third-party certificate holder.',
    requiredSections: ['Hero', 'Named insured', 'Certificate holder', 'Coverage schedule with limits', 'CTA'],
    forbiddenSections: ['Quote or proposal language', 'Personal-lines driver rows', 'Receipt language'],
    requiredDataFields: ['NAMED_INSURED', 'CERTIFICATE_HOLDER', 'CARRIER', 'POLICY_NUMBER', 'COVERAGE_LINES[]', 'EFFECTIVE_DATE', 'EXPIRATION_DATE'],
    ctaRules: B2B_CTA,
    complianceNotes: 'Must reference certificate and certificate holder explicitly.',
    prompt: 'Generate a 2026 Gmail-safe CERTIFICATE OF INSURANCE notice. Solid navy hero, named insured + certificate holder, coverage schedule with limits. Certificate-holder language required.',
  },
  cancellation: {
    key: 'cancellation',
    title: 'Cancellation Notice',
    icon: 'fa-triangle-exclamation',
    bgColor: '#d97706',
    templateType: 'cancellation',
    heroStyle: 'solid-amber',
    isSales: false,
    heroNumberRule: 'BIG = effective date. Label "Effective".',
    intent: 'Notify a client of a pending or completed cancellation with E&O precision.',
    requiredSections: ['Hero with effective date and status pill', 'What happened using carrier stated reason', 'Your options unless client-requested', 'Important disclosures', 'CTA'],
    forbiddenSections: ['Messenger opt-in card', 'Review request', 'Cross-sell', 'Any phrasing that says the agent cancelled the policy'],
    requiredDataFields: ['CLIENT_NAME', 'CARRIER', 'POLICY_NUMBER', 'CANCELLATION_TYPE', 'EFFECTIVE_DATE', 'STATED_REASON'],
    ctaRules: 'Call -> Reply. Footer Messenger inline text link only; omit Messenger on cancellation.',
    complianceNotes: 'Hero color by type. NC G.S. 58-41-15 notice periods. Agent never "cancels".',
    prompt: 'Generate a 2026 Gmail-safe CANCELLATION NOTICE. Hero color by type, carrier reason without blaming client, options unless client-requested, amber disclosures. No Messenger/review/cross-sell.',
  },
  claims: {
    key: 'claims',
    title: 'Claims Notice / Acknowledgement',
    icon: 'fa-file-invoice-dollar',
    bgColor: '#003f87',
    templateType: 'claims',
    heroStyle: 'solid-navy',
    isSales: false,
    heroNumberRule: 'No premium number. Hero states claim received or claim number.',
    intent: 'Acknowledge a reported claim and explain next steps plus the 24/7 claims line.',
    requiredSections: ['Hero with claim acknowledgement', 'Claims Steps card', 'Carrier 24/7 claims phone', 'What to expect', 'CTA'],
    forbiddenSections: ['Any promise that the claim will be covered', 'Quote or proposal language', 'Cross-sell'],
    requiredDataFields: ['CLIENT_NAME', 'CARRIER', 'POLICY_NUMBER', 'CLAIM_TYPE'],
    optionalDataFields: ['CLAIM_NUMBER', 'DATE_OF_LOSS'],
    ctaRules: TXN_CTA,
    complianceNotes: 'Never promise coverage. Use adjuster-timeline language.',
    prompt: 'Generate a 2026 Gmail-safe CLAIMS acknowledgement. Navy hero, numbered Claims Steps card with square badges, carrier 24/7 claims line, adjuster-timeline language. Never promise the claim will be covered.',
  },
  underwriting: {
    key: 'underwriting',
    title: 'B2B Underwriter Correspondence',
    icon: 'fa-user-shield',
    bgColor: '#003f87',
    templateType: 'underwriting',
    heroStyle: 'solid-navy',
    isSales: false,
    isB2B: true,
    heroNumberRule: 'No consumer premium framing. Hero states the inquiry subject.',
    intent: 'Carrier or underwriter B2B correspondence.',
    requiredSections: ['Solid navy hero', 'Professional body', 'Relevant policy/account references', 'Inline CTA'],
    forbiddenSections: ['Messenger opt-in card', 'Facebook-follow line', 'Social pill buttons', 'Consumer sales language', 'We Shopped card'],
    requiredDataFields: ['RECIPIENT', 'SUBJECT', 'BODY_POINTS[]'],
    ctaRules: B2B_CTA,
    complianceNotes: 'B2B tone. Agency-only or dual-logo header. Inline Messenger text link only.',
    prompt: 'Generate a 2026 Gmail-safe B2B UNDERWRITER email. Solid navy hero, professional tone, account references. No Messenger card, no Facebook line, no social buttons, no consumer sales language.',
  },
  needs_analysis: {
    key: 'needs_analysis',
    title: 'Insurance Needs Analysis',
    icon: 'fa-magnifying-glass-chart',
    bgColor: '#0f172a',
    templateType: 'needs-analysis',
    heroStyle: 'gradient',
    isSales: true,
    heroNumberRule: 'No single premium hero; hero frames the review invitation.',
    intent: 'Invite a client to a coverage review or gap analysis.',
    requiredSections: ['Greeting + thank-you', 'Gradient hero review invitation', 'What we will review', 'Why it matters', 'CTA to schedule'],
    forbiddenSections: ['Specific bound premiums framed as a quote', 'Receipt language', 'POI language', 'Fear-based or pressure language'],
    requiredDataFields: ['CLIENT_NAME'],
    optionalDataFields: ['CURRENT_LINES[]', 'LIFE_CHANGE_TRIGGER'],
    ctaRules: SALES_CTA,
    complianceNotes: 'Educational, no pressure. Quote is not a policy if any numbers appear.',
    prompt: 'Generate a 2026 Gmail-safe NEEDS ANALYSIS / coverage-review invitation. Gradient hero, what-we-will-review, why-it-matters, schedule CTA. Educational, no pressure.',
  },
  marketing: {
    key: 'marketing',
    title: 'Marketing / Newsletter',
    icon: 'fa-bullhorn',
    bgColor: '#0f172a',
    templateType: 'marketing',
    heroStyle: 'gradient',
    isSales: true,
    heroNumberRule: 'No premium hero; hero carries the campaign headline.',
    intent: 'General marketing, newsletter, or seasonal campaign.',
    requiredSections: ['Gradient hero headline', 'Body content', 'CTA', 'Unsubscribe'],
    forbiddenSections: ['Spam vocabulary', 'Fake testimonials', 'Fabricated quotes'],
    requiredDataFields: ['CAMPAIGN_TOPIC'],
    ctaRules: SALES_CTA,
    complianceNotes: 'Avoid spam vocabulary. Unsubscribe mandatory. Keep at least 70% text.',
    prompt: 'Generate a 2026 Gmail-safe MARKETING / NEWSLETTER email. Gradient hero headline, body, CTA, mandatory unsubscribe. No spam vocabulary.',
  },
  referral: {
    key: 'referral',
    title: 'Referral Request / Thank-You',
    icon: 'fa-gift',
    bgColor: '#0f172a',
    templateType: 'referral',
    heroStyle: 'gradient',
    isSales: true,
    heroNumberRule: 'No premium hero; hero carries the thank-you or referral ask.',
    intent: 'Thank a client and invite a referral.',
    requiredSections: ['Warm greeting + thank-you', 'Gradient hero', 'Low-pressure ask', 'How to refer', 'CTA'],
    forbiddenSections: ['Cash-for-referral language that implies rebating', 'Spam vocabulary', 'Pressure'],
    requiredDataFields: ['CLIENT_NAME'],
    ctaRules: SALES_CTA,
    complianceNotes: 'Avoid anything that reads as illegal inducement or rebating.',
    prompt: 'Generate a 2026 Gmail-safe REFERRAL email. Gratitude-led, gradient hero, low-pressure ask, easy share path. No rebating-style inducements.',
  },
  google_review: {
    key: 'google_review',
    title: 'Google Review Request',
    icon: 'fa-star',
    bgColor: '#0f172a',
    templateType: 'google-review',
    heroStyle: 'gradient',
    isSales: true,
    heroNumberRule: 'No premium hero; hero carries the thank-you plus 4.9-star social proof.',
    intent: 'Invite a satisfied client to leave a Google review.',
    requiredSections: ['Warm greeting + thank-you', 'Gradient hero with 4.9-star proof', 'The ask + direct review link', 'CTA button to review URL'],
    forbiddenSections: ['Incentivized-review language', 'Spam vocabulary'],
    requiredDataFields: ['CLIENT_NAME'],
    ctaRules: 'Primary CTA -> review link https://g.page/r/CXGq9B7-jzu7EBM/review. Then Reply/Messenger.',
    complianceNotes: 'Never offer anything in exchange for a review.',
    prompt: 'Generate a 2026 Gmail-safe GOOGLE REVIEW request. Gratitude-led, gradient hero with 4.9-star proof, direct review-link button. No incentives.',
  },
  review: {
    key: 'review',
    title: 'Google Review Request',
    icon: 'fa-star',
    bgColor: '#0f172a',
    templateType: 'google-review',
    heroStyle: 'gradient',
    isSales: true,
    heroNumberRule: 'No premium hero; hero carries the thank-you plus 4.9-star social proof.',
    intent: 'Alias of google_review kept so existing UI references keep working.',
    requiredSections: ['Warm greeting + thank-you', 'Gradient hero with 4.9-star proof', 'The ask + direct review link', 'CTA button to review URL'],
    forbiddenSections: ['Incentivized-review language', 'Spam vocabulary'],
    requiredDataFields: ['CLIENT_NAME'],
    ctaRules: 'Primary CTA -> review link https://g.page/r/CXGq9B7-jzu7EBM/review.',
    complianceNotes: 'Alias of google_review.',
    prompt: 'Generate a 2026 Gmail-safe GOOGLE REVIEW request. Gratitude-led, gradient hero with 4.9-star proof, direct review-link button. No incentives.',
  },
};

export const TEMPLATE_KEYS = Object.keys(PROMPT_TEMPLATES);

export function getTemplate(key: string): TemplateContract | undefined {
  return PROMPT_TEMPLATES[key];
}

/* ============================================================================
   CARRIER RESOURCES
============================================================================ */
export const CARRIER_RESOURCES = {
  nationwide: {
    name:'Nationwide',
    phone:'1-877-669-6877',
    claimsPhone:'1-800-421-3535',
    websiteUrl:'https://www.nationwide.com',
    paymentUrl:'https://www.nationwide.com/personal/member-services/pay-bill',
    claimsUrl:'https://www.nationwide.com/claims/'
  },
  progressive: {
    name:'Progressive',
    phone:'1-888-671-4405',
    claimsPhone:'1-800-776-4737',
    websiteUrl:'https://www.progressive.com',
    paymentUrl:'https://www.progressive.com/manage-policy/',
    claimsUrl:'https://www.progressive.com/claims/'
  },
  'national-general': {
    name:'National General',
    phone:'1-888-293-5108',
    claimsPhone:'1-800-325-1088',
    websiteUrl:'https://nationalgeneral.com/',
    paymentUrl:'https://nationalgeneral.com/customers/default.aspx',
    claimsUrl:'https://nationalgeneral.com/claims_center/'
  },
  foremost: {
    name:'Foremost',
    phone:'1-800-532-4221',
    claimsPhone:'1-800-527-3907',
    websiteUrl:'https://www.foremost.com/',
    paymentUrl:'https://www.foremost.com/pay-bill',
    claimsUrl:'https://www.foremost.com/claims/'
  },
  alamance: {
    name:'Alamance',
    phone:'(336) 570-2211',
    claimsPhone:'(336) 570-2211',
    websiteUrl:'https://www.alamancefarmers.com/',
    paymentUrl:'https://www.alamancefarmers.com/pay-my-bill',
    claimsUrl:'https://www.alamancefarmers.com/claims'
  },
  'nc-grange': {
    name:'NC Grange Mutual',
    phone:'1-800-662-7488',
    claimsPhone:'1-800-662-7488',
    websiteUrl:'https://ncgm.com/',
    paymentUrl:'https://ncgm.com/make-a-payment/',
    claimsUrl:'https://ncgm.com/claims/'
  }
};

/* ============================================================================
   LOCAL STORAGE
============================================================================ */
export const LOCAL_STORAGE_HISTORY_KEY = 'quicklink-upload-history';
export const LOCAL_STORAGE_GROUPS_KEY = 'quicklink-upload-groups';
