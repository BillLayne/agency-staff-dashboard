
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
  'Progressive': 'https://i.imgur.com/SJQzwRU.png',
  'Nationwide': 'https://i.imgur.com/MjJTKti.png',
  'Travelers': 'https://i.imgur.com/JNB2wDG.png',
  'National General': 'https://i.imgur.com/9ZWQsAS.png',
  'Foremost': 'https://i.imgur.com/rHIo4r5.jpg',
  'Hagerty': 'https://i.imgur.com/0UyINHi.png',
  'Dairyland': 'https://i.imgur.com/1VkIvxv.png',
  'Plymouth Rock': 'https://i.imgur.com/7N1vfo0.png',
  'Bristol West': 'https://i.imgur.com/HF8oPAF.png',
  'Alamance': 'https://i.imgur.com/S8BVnvs.png'
};

export const CARRIER_UI_COLORS: Record<string, string> = {
  'Progressive': '#e8f4fd',
  'Nationwide': '#e8edf5',
  'Travelers': '#fde8e8',
  'National General': '#fef3e8',
  'Foremost': '#e8f5e9',
  'Hagerty': '#fef9e8',
  'Dairyland': '#e8f5f2',
  'Plymouth Rock': '#f0e8fd',
  'Bristol West': '#fde8f4',
  'Alamance': '#fdf5e8'
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
  { id:'alamance', name:'Alamance', url:'https://alamance.britecore.com/agent/misc/ko_dashboard', icon:'fa-solid fa-shield-halved', description:'BriteCore dashboard', image: 'https://i.imgur.com/S8BVnvs.png', color: '#4CAF50' },
  { id:'nc-grange', name:'NC Grange', url:'https://ncgm.com/', icon:'fa-solid fa-tractor', description:'NC Grange portal', image: 'https://i.imgur.com/Fesnkng.png', color: '#2E7D32' }
];

/* ============================================================================
   SEARCH MODES
============================================================================ */
export const MODE_META: Record<SearchMode, { placeholder: string; showTax: boolean }> = {
  agency: { placeholder:'Search Agency Matrix by name or address…', showTax:false },
  web: { placeholder:'Search the web…', showTax:false },
  realestate: { placeholder:'Enter full address (City, NC, County)…', showTax:true },
  people: { placeholder:'Enter name, phone, or address…', showTax:false },
  onedrive: { placeholder:'Search Client Folder by name…', showTax:false }
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
   PROMPT TEMPLATES
============================================================================ */
export const PROMPT_TEMPLATES = {
  auto_quote: { title: 'Auto Insurance Quote', icon: 'fa-car', prompt: 'Generate a luxury Auto Insurance Quote proposal for Gmail.', bgColor: '#e8f0fe' },
  coi: { title: 'Certificate of Insurance', icon: 'fa-shield-halved', prompt: 'Generate a formal Certificate of Insurance (COI) cover letter and summary.', bgColor: '#fef3cd' },
  claims: { title: 'Claims Filing Notice', icon: 'fa-file-invoice-dollar', prompt: 'Generate a clear Claims Filing Notice with next steps for the client.', bgColor: '#fef7e0' },
  commercial_quote: { title: 'Commercial Insurance Quote', icon: 'fa-briefcase', prompt: 'Generate a luxury Commercial Insurance Quote proposal for Gmail.', bgColor: '#e8f0fe' },
  comparison: { title: 'Coverage Comparison', icon: 'fa-scale-balanced', prompt: 'Generate a detailed Coverage Comparison table for Gmail.', bgColor: '#f3e8fd' },
  google_review: { title: 'Google Review Request', icon: 'fa-star', prompt: 'Generate a polite Google Review Request for satisfied clients.', bgColor: '#fce8f0' },
  home_quote: { title: 'Home Insurance Quote', icon: 'fa-house', prompt: 'Generate a luxury Home Insurance Quote proposal for Gmail.', bgColor: '#e8f0fe' },
  life_quote: { title: 'Life Insurance Quote', icon: 'fa-heart-pulse', prompt: 'Generate a luxury Life Insurance Quote proposal for Gmail.', bgColor: '#e8f0fe' },
  marketing: { title: 'Marketing/Promotional', icon: 'fa-bullhorn', prompt: 'Generate a luxury Marketing/Promotional email for insurance services.', bgColor: '#fce8f0' },
  motorcycle_rv_quote: { title: 'Motorcycle/RV Quote', icon: 'fa-motorcycle', prompt: 'Generate a luxury Motorcycle or RV Insurance Quote proposal for Gmail.', bgColor: '#e8f0fe' },
  needs_analysis: { title: 'Needs Analysis', icon: 'fa-magnifying-glass-chart', prompt: 'Generate an Insurance Needs Analysis questionnaire email.', bgColor: '#f3e8fd' },
  receipt: { title: 'Payment Receipt', icon: 'fa-receipt', prompt: 'Generate a professional Payment Receipt confirmation email.', bgColor: '#fef7e0' },
  welcome: { title: 'Policy Confirmation/Welcome', icon: 'fa-handshake', prompt: 'Generate a warm Policy Confirmation and Welcome email for a new client.', bgColor: '#e6f4ea' },
  review: { title: 'Policy Review Summary', icon: 'fa-clipboard-check', prompt: 'Generate a comprehensive Policy Review Summary email.', bgColor: '#f3e8fd' },
  poi: { title: 'Proof of Insurance / ID Card', icon: 'fa-id-card', prompt: 'Generate a formal Proof of Insurance / ID Card delivery email.', bgColor: '#e6f4ea' },
  referral: { title: 'Referral Thank You', icon: 'fa-gift', prompt: 'Generate a warm Referral Thank You email with a gift mention.', bgColor: '#fce8f0' },
  renewal: { title: 'Renewal Notice', icon: 'fa-arrows-rotate', prompt: 'Generate a professional Policy Renewal Notice email.', bgColor: '#e6f4ea' },
  sr22_quote: { title: 'SR-22 Quote', icon: 'fa-file-contract', prompt: 'Generate a luxury SR-22 Insurance Quote proposal for Gmail.', bgColor: '#e8f0fe' },
  underwriting: { title: 'Underwriting Notice', icon: 'fa-user-shield', prompt: 'Generate a professional Underwriting Notice or request for information.', bgColor: '#e6f4ea' }
};

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
   IMGUR
============================================================================ */
export const IMGUR_CLIENT_ID = '546c25a59c58ad7';
export const IMGUR_UPLOAD_URL = 'https://api.imgur.com/3/image';

/* ============================================================================
   LOCAL STORAGE
============================================================================ */
export const LOCAL_STORAGE_HISTORY_KEY = 'quicklink-upload-history';
export const LOCAL_STORAGE_GROUPS_KEY = 'quicklink-upload-groups';
