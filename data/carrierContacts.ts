export type ContactDetailKind = 'phone' | 'fax' | 'email' | 'website';

export interface ContactDetail {
  label: string;
  value: string;
  kind: ContactDetailKind;
}

export interface CompanyContact {
  id: string;
  company: string;
  aliases: string[];
  category: 'Agency carrier' | 'Workers compensation' | 'Saved contact';
  details: ContactDetail[];
  address?: string;
  source: string;
}

const travelersWorkersCompDetails: ContactDetail[] = [
  { label: 'Workers comp phone', value: '1-800-453-9843', kind: 'phone' },
  { label: 'Fax', value: '877-634-3710', kind: 'fax' },
  { label: 'Email', value: 'arwc@travelers.com', kind: 'email' },
  { label: 'Website', value: 'www.travelers.com', kind: 'website' },
];

export const COMPANY_CONTACTS: CompanyContact[] = [
  {
    id: 'nationwide',
    company: 'Nationwide',
    aliases: ['Nationwide Insurance'],
    category: 'Agency carrier',
    details: [
      { label: 'Customer service', value: '1-800-243-2642', kind: 'phone' },
      { label: 'Claims', value: '1-800-421-3535', kind: 'phone' },
      { label: 'Website', value: 'www.nationwide.com', kind: 'website' },
    ],
    source: 'Bill Layne agency directory',
  },
  {
    id: 'progressive',
    company: 'Progressive',
    aliases: ['Progressive Insurance'],
    category: 'Agency carrier',
    details: [
      { label: 'Customer service', value: '1-888-671-4405', kind: 'phone' },
      { label: 'Claims', value: '1-800-776-4737', kind: 'phone' },
      { label: 'Website', value: 'www.progressive.com', kind: 'website' },
    ],
    source: 'Existing Agency Command Center carrier resources',
  },
  {
    id: 'national-general',
    company: 'National General',
    aliases: ['National General Insurance', 'NatGen'],
    category: 'Agency carrier',
    details: [
      { label: 'Customer service', value: '1-888-293-5108', kind: 'phone' },
      { label: 'Claims', value: '1-800-325-1088', kind: 'phone' },
      { label: 'Website', value: 'www.nationalgeneral.com', kind: 'website' },
    ],
    source: 'Existing Agency Command Center carrier resources',
  },
  {
    id: 'foremost',
    company: 'Foremost',
    aliases: ['Foremost Insurance'],
    category: 'Agency carrier',
    details: [
      { label: 'Customer service', value: '1-800-532-4221', kind: 'phone' },
      { label: 'Claims', value: '1-800-527-3907', kind: 'phone' },
      { label: 'Website', value: 'www.foremost.com', kind: 'website' },
    ],
    source: 'Existing Agency Command Center carrier resources',
  },
  {
    id: 'alamance',
    company: 'Alamance Farmers Mutual',
    aliases: ['Alamance', 'Alamance Farmers'],
    category: 'Agency carrier',
    details: [
      { label: 'Customer service', value: '336-570-2211', kind: 'phone' },
      { label: 'Claims', value: '336-570-2211', kind: 'phone' },
      { label: 'Website', value: 'www.alamancefarmers.com', kind: 'website' },
    ],
    source: 'Existing Agency Command Center carrier resources',
  },
  {
    id: 'nc-grange',
    company: 'NC Grange Mutual',
    aliases: ['NC Grange', 'North Carolina Grange Mutual'],
    category: 'Agency carrier',
    details: [
      { label: 'Customer service', value: '1-800-662-7488', kind: 'phone' },
      { label: 'Claims', value: '1-800-662-7488', kind: 'phone' },
      { label: 'Website', value: 'www.ncgm.com', kind: 'website' },
    ],
    source: 'Existing Agency Command Center carrier resources',
  },
  {
    id: 'ace-american',
    company: 'ACE American Insurance Company',
    aliases: ['ACE American', 'ACE'],
    category: 'Workers compensation',
    details: travelersWorkersCompDetails,
    address: 'PO Box 5600, Hartford, CT 06102-5600',
    source: 'NCRB WC Assigned Risk list, revised 08/26/2024',
  },
  {
    id: 'accident-fund',
    company: 'Accident Fund Insurance Co. of America',
    aliases: ['Accident Fund'],
    category: 'Workers compensation',
    details: [
      { label: 'Workers comp phone', value: '1-866-221-9640', kind: 'phone' },
      { label: 'Fax', value: '844-778-1070', kind: 'fax' },
      { label: 'Email', value: 'policy@assignedrisksolutions.com', kind: 'email' },
      { label: 'Website', value: 'www.assignedrisksolutions.com', kind: 'website' },
    ],
    address: '200 N. Grand Ave, Lansing, MI 48901-7985',
    source: 'NCRB WC Assigned Risk list, revised 08/26/2024',
  },
  {
    id: 'american-zurich',
    company: 'American Zurich Insurance Co.',
    aliases: ['American Zurich', 'Zurich'],
    category: 'Workers compensation',
    details: travelersWorkersCompDetails,
    address: 'PO Box 5600, Hartford, CT 06102-5600',
    source: 'NCRB WC Assigned Risk list, revised 08/26/2024',
  },
  {
    id: 'amguard',
    company: 'AmGuard Insurance Co.',
    aliases: ['AmGuard', 'Guard Insurance'],
    category: 'Workers compensation',
    details: [
      { label: 'Workers comp phone', value: '1-800-673-2465', kind: 'phone' },
      { label: 'Fax', value: '570-829-4587', kind: 'fax' },
      { label: 'Email', value: 'underwriting3@guard.com', kind: 'email' },
      { label: 'Website', value: 'www.guard.com', kind: 'website' },
    ],
    address: 'PO Box AH, Wilkes Barre, PA 18702',
    source: 'NCRB WC Assigned Risk list, revised 08/26/2024',
  },
  {
    id: 'auto-owners',
    company: 'Auto-Owners Insurance Co.',
    aliases: ['Auto-Owners', 'Auto Owners'],
    category: 'Workers compensation',
    details: travelersWorkersCompDetails,
    address: 'PO Box 5600, Hartford, CT 06102-5600',
    source: 'NCRB WC Assigned Risk list, revised 08/26/2024',
  },
  {
    id: 'builders-mutual',
    company: 'Builders Mutual Insurance Co.',
    aliases: ['Builders Mutual'],
    category: 'Workers compensation',
    details: travelersWorkersCompDetails,
    address: 'PO Box 5600, Hartford, CT 06102-5600',
    source: 'NCRB WC Assigned Risk list, revised 08/26/2024',
  },
  {
    id: 'cincinnati',
    company: 'Cincinnati Insurance Company',
    aliases: ['Cincinnati Insurance', 'Cincinnati'],
    category: 'Workers compensation',
    details: travelersWorkersCompDetails,
    address: 'PO Box 5600, Hartford, CT 06102-5600',
    source: 'NCRB WC Assigned Risk list, revised 08/26/2024',
  },
  {
    id: 'continental-casualty',
    company: 'Continental Casualty Co.',
    aliases: ['Continental Casualty'],
    category: 'Workers compensation',
    details: travelersWorkersCompDetails,
    address: 'PO Box 5600, Hartford, CT 06102-5600',
    source: 'NCRB WC Assigned Risk list, revised 08/26/2024',
  },
  {
    id: 'hartford-underwriters',
    company: 'Hartford Underwriters Co.',
    aliases: ['Hartford Underwriters', 'Hartford'],
    category: 'Workers compensation',
    details: travelersWorkersCompDetails,
    address: 'PO Box 5600, Hartford, CT 06102-5600',
    source: 'NCRB WC Assigned Risk list, revised 08/26/2024',
  },
  {
    id: 'liberty-mutual',
    company: 'Liberty Mutual Insurance Co.',
    aliases: ['Liberty Mutual', 'Liberty'],
    category: 'Workers compensation',
    details: [
      { label: 'Workers comp phone', value: '1-800-653-7893', kind: 'phone' },
      { label: 'Fax', value: '603-427-1885', kind: 'fax' },
      { label: 'Email', value: 'ims@libertymutual.com', kind: 'email' },
      { label: 'Website', value: 'www.libertymutual.com', kind: 'website' },
    ],
    address: 'PO Box 66400, London, KY 40742-6400',
    source: 'NCRB WC Assigned Risk list, revised 08/26/2024',
  },
  {
    id: 'travelers-property-casualty',
    company: 'Travelers Property & Casualty Cos.',
    aliases: ['Travelers Property and Casualty', 'Travelers'],
    category: 'Workers compensation',
    details: travelersWorkersCompDetails,
    address: 'PO Box 5600, Hartford, CT 06102-5600',
    source: 'NCRB WC Assigned Risk list, revised 08/26/2024',
  },
];

export const normalizeCompanyName = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const findCompanyContacts = (
  query: string,
  contacts: CompanyContact[] = COMPANY_CONTACTS,
): CompanyContact[] => {
  const terms = normalizeCompanyName(query).split(' ').filter(Boolean);
  if (terms.length === 0) return [];

  return contacts
    .filter((contact) => {
      const companyNames = normalizeCompanyName([contact.company, ...contact.aliases].join(' '));
      return terms.every((term) => companyNames.includes(term));
    })
    .sort((a, b) => a.company.localeCompare(b.company));
};
