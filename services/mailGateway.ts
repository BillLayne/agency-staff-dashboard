// BLI Mail Gateway client (Apps Script, runs as Bill) -- creates Gmail DRAFTS with an
// attachment. Contract and every rule here come from the LIVE repo's
// mail-gateway/HANDOFF-ATTACH-PDF-TO-GMAIL.md and PDF Studio's working client:
//   * POST as text/plain (Apps Script can't answer a CORS preflight), follow redirects,
//     abort after 45 s.
//   * Omit bcc: the gateway then copies Save@BillLayneInsurance.com (agency record).
//   * A success response must say attached === 1 (an old gateway "succeeds" without the file).
//   * Settings live per device in localStorage under the same keys every BLI app uses; the
//     secret never goes in source, the page, or an email.

export const GW_URL_KEY = 'bliMailGateway.url';
export const GW_SECRET_KEY = 'bliMailGateway.secret';
const GATEWAY_URL = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;
export const GMAIL_DRAFTS_URL = 'https://mail.google.com/mail/?authuser=Bill%40billlayneinsurance.com#drafts';
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024; // Gmail's ceiling is 25 MB; stay well under

const read = (key: string) => { try { return localStorage.getItem(key) || ''; } catch { return ''; } };

export function gatewaySettings() {
  const url = read(GW_URL_KEY).trim();
  const secret = read(GW_SECRET_KEY).trim();
  return { url, secret, configured: GATEWAY_URL.test(url) && secret.length > 0 };
}

export function saveGatewaySettings(url: string, secret: string) {
  const cleanUrl = url.trim();
  if (!GATEWAY_URL.test(cleanUrl)) throw new Error('That is not a Mail Gateway address. It starts with https://script.google.com/macros/s/ and ends with /exec.');
  if (!secret.trim()) throw new Error('Paste the gateway secret too.');
  try {
    localStorage.setItem(GW_URL_KEY, cleanUrl);
    localStorage.setItem(GW_SECRET_KEY, secret.trim());
  } catch {
    throw new Error('This browser blocked saving the connection. Allow site storage and try again.');
  }
}

export function forgetGatewaySettings() {
  try { localStorage.removeItem(GW_URL_KEY); localStorage.removeItem(GW_SECRET_KEY); } catch { /* nothing saved */ }
}

/**
 * Accepts PDF Studio's phone/device hand-off link (".../#gw=<base64url {u,s}>") so Bill can
 * connect this dashboard with one paste instead of two.
 */
export function settingsFromHandoffLink(link: string): { url: string; secret: string } | null {
  const match = /#gw=([A-Za-z0-9_-]+)/.exec(link.trim());
  if (!match) return null;
  try {
    const parsed = JSON.parse(atob(match[1].replace(/-/g, '+').replace(/_/g, '/'))) as { u?: unknown; s?: unknown };
    if (typeof parsed.u === 'string' && GATEWAY_URL.test(parsed.u) && typeof parsed.s === 'string' && parsed.s) {
      return { url: parsed.u, secret: parsed.s };
    }
  } catch { /* not a hand-off link */ }
  return null;
}

/** Reachability only -- the secret is proven when a real draft is created. */
export async function checkGateway(url: string): Promise<string> {
  let body: { ok?: boolean; service?: string; version?: string };
  try {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
    body = await response.json();
  } catch {
    throw new Error('Could not reach the Mail Gateway at that address. Check it and try again.');
  }
  if (!body.ok || body.service !== 'BLI Mail Gateway') throw new Error('That address answered, but it is not the BLI Mail Gateway.');
  if (Number.parseFloat(String(body.version || '0')) < 1.1) throw new Error(`The gateway is version ${body.version}; attaching files needs version 1.1 or newer.`);
  return String(body.version);
}

/** Chunked so multi-MB files don't overflow the call stack. */
export function b64FromBytes(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  return btoa(binary);
}

export class GatewayError extends Error {
  /** True when the request may have reached Gmail -- check Drafts before trying again. */
  uncertain: boolean;
  constructor(message: string, uncertain = false) { super(message); this.uncertain = uncertain; }
}

export interface DraftRequest {
  to: string;
  subject: string;
  html: string;
  attachment: { name: string; mimeType: string; bytes: Uint8Array };
}

export async function createGmailDraft(draft: DraftRequest): Promise<{ draftId: string; remainingQuota: number | null }> {
  const { url, secret, configured } = gatewaySettings();
  if (!configured) throw new GatewayError('Gmail drafts are not connected on this device yet.');
  if (draft.attachment.bytes.length > MAX_ATTACHMENT_BYTES) throw new GatewayError('This file is too large to attach to an email (over 20 MB).');
  const payload = JSON.stringify({
    secret,
    mode: 'draft',
    to: draft.to.trim(),
    subject: draft.subject,
    html: draft.html,
    attachments: [{ name: draft.attachment.name, mimeType: draft.attachment.mimeType || 'application/octet-stream', dataB64: b64FromBytes(draft.attachment.bytes) }],
    // bcc omitted on purpose -> gateway defaults to Save@BillLayneInsurance.com (agency record)
  });
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: payload,
      redirect: 'follow',
      signal: AbortSignal.timeout(45000),
    });
  } catch {
    throw new GatewayError('Gmail did not confirm the draft. Check your Gmail Drafts before trying again so you do not make a duplicate.', true);
  }
  let body: { ok?: boolean; error?: string; draftId?: string; attached?: number; remainingQuota?: number };
  try {
    body = await response.json();
  } catch {
    throw new GatewayError('The gateway answered unexpectedly. Check your Gmail Drafts before trying again.', true);
  }
  if (!body.ok) throw new GatewayError(`Draft NOT created: ${body.error || 'the gateway refused the request.'}`);
  if (body.attached !== 1) throw new GatewayError('A draft was created but the file was NOT attached. The Mail Gateway needs its version 1.1 update.', false);
  return { draftId: String(body.draftId || ''), remainingQuota: typeof body.remainingQuota === 'number' ? body.remainingQuota : null };
}
