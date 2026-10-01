// Document Links: shared, dependency-free helpers for the browser card
// (components/DocumentLinksCard.tsx) and the Pages Function proxy
// (server/docLinks.ts). The documents themselves are hosted by the SMS
// Command Center Worker (docs.billlayneinsurance.com) -- the SAME branded
// /d/<id> preview pages the SMS composer creates. See the "Document Links"
// section of CUSTOMER_MATRIX_PRO_AI_HANDOFF.md.

export const MAX_DOC_BYTES = 15 * 1024 * 1024; // must match MAX_DOC_LINK_BYTES in the SMS worker
export const DOC_ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.avif';
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'];

// Links are only ever rendered as hrefs when they point at the agency's own
// document host with the exact /d/<12 hex> shape -- a misbehaving upstream
// can't slip a javascript: or look-alike URL into the dashboard.
export const DOC_LINK_HOSTS = ['docs.billlayneinsurance.com', 'agency-sms-command-center.bill-7e3.workers.dev'];

// Same account selector convention as Unified Search's Drive links: Bill has
// several Google accounts signed in and /u/N indexes are unstable.
export const GMAIL_ACCOUNT_EMAIL = 'Bill@billlayneinsurance.com';

// The picture phones show when a document link is texted (og:image). It is the
// SMS Command Center's AGENCY_PREVIEW_IMAGE -- the SAME image for links made
// here, in the staff dashboard and in SMS (Bill, 2026-10-01: keep it
// consistent). This is only a local display copy for the in-app preview;
// if the Worker's image changes, replace public/doc-link-text-preview.jpg.
export const TEXT_PREVIEW_IMAGE = '/doc-link-text-preview.jpg';
export const AGENCY_PHONE = '(336) 835-1993';

export type DocTypeId = 'id-card' | 'digital-id' | 'proof' | 'quote' | 'receipt' | 'billing' | 'no-loss' | 'cancellation' | 'general';
export interface DocTypePreset {
  id: DocTypeId;
  label: string;
  /** Appended to the customer-facing file name; contains the keyword the preview page keys its headline on. */
  fileLabel: string;
  noun: string;
  sentence: string;
}

// Same vocabulary and order as the SMS composer's DOCUMENT_PRESETS, so the two
// tools feel like one program.
export const DOC_TYPES: DocTypePreset[] = [
  { id: 'id-card', label: 'Insurance card', fileLabel: 'Insurance-Card', noun: 'insurance card', sentence: 'your insurance card is ready.' },
  { id: 'digital-id', label: 'Digital Auto ID card', fileLabel: 'Digital-Auto-ID-Card', noun: 'Digital Auto ID card', sentence: 'your Digital Auto ID card is ready.' },
  { id: 'proof', label: 'Proof of insurance', fileLabel: 'Proof-of-Insurance', noun: 'proof of insurance', sentence: 'your proof of insurance is ready.' },
  { id: 'quote', label: 'Quote', fileLabel: 'Insurance-Quote', noun: 'insurance quote', sentence: "here's the quote we put together." },
  { id: 'receipt', label: 'Payment receipt', fileLabel: 'Payment-Receipt', noun: 'payment receipt', sentence: 'your payment receipt is ready.' },
  { id: 'billing', label: 'Billing document', fileLabel: 'Billing-Statement', noun: 'billing statement', sentence: 'your billing statement is ready.' },
  { id: 'no-loss', label: 'No-loss statement', fileLabel: 'No-Loss-Statement', noun: 'no-loss statement', sentence: 'your no-loss statement is ready to review and sign.' },
  { id: 'cancellation', label: 'Cancellation form', fileLabel: 'Cancellation-Form', noun: 'cancellation form', sentence: 'your cancellation form is ready. Please review it before signing.' },
  { id: 'general', label: 'Other document', fileLabel: 'Document', noun: 'document', sentence: 'the document you asked about is ready.' },
];
export const docType = (id: DocTypeId) => DOC_TYPES.find(type => type.id === id) || DOC_TYPES[DOC_TYPES.length - 1];

export type DocLinkSource = 'sms' | 'command-center' | 'staff-dashboard';
export const DOC_LINK_SOURCES: { id: DocLinkSource; label: string }[] = [
  { id: 'command-center', label: 'Command Center' },
  { id: 'staff-dashboard', label: 'Staff Dashboard' },
  { id: 'sms', label: 'Sent by SMS' },
];
export const sourceLabel = (source: DocLinkSource) => DOC_LINK_SOURCES.find(item => item.id === source)?.label || 'Sent by SMS';

export interface DocLinkItem {
  shortId: string;
  url: string;
  fileName: string;
  contentType: string;
  createdAt: string;
  source: DocLinkSource;
  customer: string | null;
  size: number | null;
}

export interface DocViewStats {
  count: number;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  openedCount: number;
  lastOpenedAt: string | null;
  downloadedCount: number;
  lastDownloadedAt: string | null;
}

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const iso = (value: unknown) => (typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value)) ? value : null);
const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0);

export function extensionOf(name: string) {
  const match = /\.([a-z0-9]{1,5})$/i.exec(name || '');
  return match ? match[1].toLowerCase() : '';
}

/** Mirrors safeFileName() in the SMS worker -- the name the customer will actually see. */
export function safeFileName(name: string) {
  return (name || '').replace(/\\/g, '/').split('/').pop()!
    .replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 90) || 'attachment';
}

export function isSafeDocLinkUrl(url: unknown): url is string {
  if (typeof url !== 'string' || url.length > 200) return false;
  const match = /^https:\/\/([a-z0-9.-]+)\/d\/[a-f0-9]{12}$/i.exec(url);
  return Boolean(match && DOC_LINK_HOSTS.includes(match[1].toLowerCase()));
}

/**
 * Mirrors documentPreviewMetadata() in the SMS worker: the preview page picks
 * its headline from keywords in the FILE NAME. Keep the two in sync.
 */
export function previewTypeForFileName(fileName: string) {
  const normalized = (fileName || '').toLowerCase();
  if (normalized.includes('id-card') || normalized.includes('id card') || normalized.includes('insurance-card')) return 'insurance card';
  if (normalized.includes('receipt')) return 'payment receipt';
  if (normalized.includes('proof') || normalized.includes('verification') || normalized.includes('poi')) return 'proof of insurance';
  if (normalized.includes('quote')) return 'insurance quote';
  if (normalized.includes('no-loss') || normalized.includes('no loss')) return 'no-loss form';
  if (normalized.includes('cancel')) return 'cancellation document';
  if (normalized.includes('bill') || normalized.includes('invoice')) return 'billing document';
  return 'insurance document';
}
export const previewHeadline = (fileName: string) => `Your ${previewTypeForFileName(fileName)} is ready`;
/** The bold title under the picture in a text-message preview (the worker's og:title). */
export const previewLinkTitle = (fileName: string) => `${previewHeadline(fileName)} | Bill Layne Insurance`;

const TYPE_FOR_PREVIEW: Record<string, DocTypeId> = {
  'insurance card': 'id-card', 'payment receipt': 'receipt', 'proof of insurance': 'proof', 'insurance quote': 'quote',
  'no-loss form': 'no-loss', 'cancellation document': 'cancellation', 'billing document': 'billing',
};
/** Best guess at the document type from an uploaded file's own name. */
export const guessDocType = (fileName: string): DocTypeId => TYPE_FOR_PREVIEW[previewTypeForFileName(fileName)] || 'general';

/**
 * The file name the customer sees on the preview page and when they save it.
 * Customer + type keyword ("Roy-Meyreles-Proof-of-Insurance.pdf") so the
 * headline is right even when the scan was called "scan0034.pdf". Always keeps
 * the original extension and stays inside the worker's 90-character limit.
 */
export function suggestFileName(originalName: string, customer: string, typeId: DocTypeId) {
  const ext = extensionOf(originalName);
  const suffix = ext ? '.' + ext : '';
  const type = docType(typeId);
  const person = tidyCustomerName(customer);
  let stem: string;
  if (typeId === 'general') {
    const originalStem = (originalName || 'document').replace(/\.[^.]+$/, '');
    stem = person ? `${person} ${type.fileLabel}` : originalStem;
  } else if (!person && guessDocType(originalName) === typeId) {
    stem = originalName.replace(/\.[^.]+$/, ''); // already descriptive -- keep it
  } else {
    stem = [person, type.fileLabel].filter(Boolean).join(' ');
  }
  return finalizeFileName(stem, suffix);
}

/** Sanitize an edited name, re-attaching the original extension if it was removed. */
export function finalizeFileName(nameOrStem: string, suffix: string) {
  const stem = (suffix && nameOrStem.toLowerCase().endsWith(suffix.toLowerCase()) ? nameOrStem.slice(0, -suffix.length) : nameOrStem).trim();
  const safeStem = safeFileName(stem || 'Document').replace(/\.+$/, '').slice(0, 90 - suffix.length).replace(/-+$/, '');
  return (safeStem || 'Document') + suffix;
}

export function validateDocFile(file: { name: string; size: number }) {
  const ext = extensionOf(file.name);
  if (ext === 'heic' || ext === 'heif') return 'iPhone HEIC photos are not supported. Export the photo as JPG first, then upload it.';
  if (!ALLOWED_EXTENSIONS.includes(ext)) return 'Only PDF, Word (.doc/.docx) and image files (JPG, PNG, GIF, WebP) can be shared as document links.';
  if (!file.size) return 'This file is empty. Choose a different file.';
  if (file.size > MAX_DOC_BYTES) return `This file is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Document links accept files up to 15 MB.`;
  return '';
}

/** Tidy one name word: fix ALL-CAPS / all-lowercase, keep initials ("JC") and deliberate casing ("DeShawn"). */
function tidyNameWord(word: string) {
  if (word.length <= 2 && word === word.toUpperCase()) return word;
  return word === word.toUpperCase() || word === word.toLowerCase()
    ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    : word;
}
/** "roy meyreles" / "ROY MEYRELES" -> "Roy Meyreles", as it should read on the customer's page. */
export const tidyCustomerName = (customer: string) => (customer || '').trim().split(/\s+/).filter(Boolean).map(tidyNameWord).join(' ');

export function firstNameOf(customer: string) {
  return tidyCustomerName(customer).split(' ')[0] || '';
}

export function buildCustomerMessage(typeId: DocTypeId, customer: string, url: string) {
  const type = docType(typeId);
  const first = firstNameOf(customer);
  return [
    `${first ? `Hi ${first}, ` : 'Hi, '}${type.sentence}`,
    '',
    'Tap the link to view, save, or share it:',
    url,
    '',
    `If you have any questions, just reply or call us at ${AGENCY_PHONE}.`,
    '',
    'Bill Layne Insurance',
    AGENCY_PHONE,
  ].join('\n');
}

export const emailSubject = (typeId: DocTypeId) => `Your ${docType(typeId).noun} from Bill Layne Insurance`;

export function gmailComposeUrl(subject: string, body: string) {
  const params = new URLSearchParams({ authuser: GMAIL_ACCOUNT_EMAIL, view: 'cm', fs: '1', su: subject, body });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/** The staff copy of a link: ?ref=staff keeps test clicks out of customer receipts. */
export const staffTestUrl = (url: string) => `${url}?ref=staff`;

export function normalizeDocLinkItem(raw: unknown): DocLinkItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const shortId = typeof record.shortId === 'string' && /^[a-f0-9]{12}$/.test(record.shortId) ? record.shortId : '';
  if (!shortId || !isSafeDocLinkUrl(record.url) || !record.url.endsWith('/d/' + shortId)) return null;
  return {
    shortId,
    url: record.url,
    fileName: text(record.fileName, 120) || 'document',
    contentType: text(record.contentType, 100),
    createdAt: iso(record.createdAt) || '',
    source: record.source === 'command-center' || record.source === 'staff-dashboard' ? record.source : 'sms',
    customer: text(record.customer, 80) || null,
    size: typeof record.size === 'number' && Number.isFinite(record.size) && record.size >= 0 ? Math.floor(record.size) : null,
  };
}

export function normalizeViewStats(raw: unknown): DocViewStats | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const stats: DocViewStats = {
    count: count(record.count),
    firstViewedAt: iso(record.firstViewedAt),
    lastViewedAt: iso(record.lastViewedAt),
    openedCount: count(record.openedCount),
    lastOpenedAt: iso(record.lastOpenedAt),
    downloadedCount: count(record.downloadedCount),
    lastDownloadedAt: iso(record.lastDownloadedAt),
  };
  return stats.count || stats.openedCount || stats.downloadedCount ? stats : null;
}

export function formatWhen(value: string | null, withTime = true) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, withTime
    ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export type ReceiptTone = 'none' | 'viewed' | 'opened' | 'saved';
/** Same priority as the SMS thread pill: Saved > Opened > Viewed > Not viewed. */
export function describeReceipt(stats: DocViewStats | null | undefined): { tone: ReceiptTone; label: string; title: string } {
  if (!stats) return { tone: 'none', label: 'Not viewed yet', title: 'The customer has not opened this link yet. Your own test clicks are not counted.' };
  const title = [
    stats.firstViewedAt ? `First viewed ${formatWhen(stats.firstViewedAt)}` : '',
    stats.count ? `${stats.count} view${stats.count === 1 ? '' : 's'}` : '',
    stats.lastOpenedAt ? `Opened the file ${formatWhen(stats.lastOpenedAt)}` : '',
    stats.lastDownloadedAt ? `Saved the file ${formatWhen(stats.lastDownloadedAt)}` : '',
  ].filter(Boolean).join(' · ');
  if (stats.downloadedCount) return { tone: 'saved', label: `Saved · ${formatWhen(stats.lastDownloadedAt || stats.lastViewedAt)}`, title };
  if (stats.openedCount) return { tone: 'opened', label: `Opened · ${formatWhen(stats.lastOpenedAt || stats.lastViewedAt)}`, title };
  return { tone: 'viewed', label: `Viewed${stats.count > 1 ? ` ${stats.count}×` : ''} · ${formatWhen(stats.lastViewedAt)}`, title };
}

export function formatBytes(size: number | null) {
  if (!size) return '';
  return size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;
}

export function matchesDocQuery(item: DocLinkItem, query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = [item.fileName, item.customer || '', item.shortId, item.url, previewTypeForFileName(item.fileName)].join(' ').toLowerCase();
  return words.every(word => haystack.includes(word));
}
