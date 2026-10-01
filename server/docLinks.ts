import { appId, json, requireSession } from './auth.ts';
import type { AuthEnv, PagesContext } from './auth.ts';
import { MAX_DOC_BYTES, normalizeDocLinkItem, normalizeViewStats, validateDocFile } from '../shared/docLinks.ts';

// Proxy between the dashboard and the SMS Command Center Worker, which hosts
// the documents. The browser only ever talks to this (session-gated,
// same-origin) function; DOC_LINK_TOKEN is attached here and never leaves the
// server. That token is scoped on the Worker side to /api/doc-links and
// /api/document-views only -- it cannot send texts or read conversations.

export interface DocLinksEnv extends AuthEnv {
  DOC_LINK_TOKEN?: string;
  /** Optional override; defaults to the Worker's workers.dev address (server-to-server, outside the zone's bot rules). */
  DOC_LINK_API_BASE?: string;
}

export const DEFAULT_DOC_LINK_API_BASE = 'https://agency-sms-command-center.bill-7e3.workers.dev';
// File cap plus generous room for multipart boundaries and the two text fields.
const MAX_BODY_BYTES = MAX_DOC_BYTES + 256 * 1024;
const UPSTREAM_TIMEOUT_MS = 45000;

const notConfigured = () => json({ error: 'Document links are not set up on this dashboard yet. Contact the agency administrator.', code: 'DOC_LINKS_NOT_CONFIGURED' }, 503);

function upstream(env: DocLinksEnv) {
  const token = env.DOC_LINK_TOKEN || '';
  if (token.length < 32) return null;
  let base = DEFAULT_DOC_LINK_API_BASE;
  if (env.DOC_LINK_API_BASE) {
    try {
      const parsed = new URL(env.DOC_LINK_API_BASE);
      if (parsed.protocol !== 'https:') return null;
      base = parsed.origin;
    } catch { return null; }
  }
  return { base, token };
}

async function callUpstream(fetcher: typeof fetch, url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetcher(url, { ...init, signal: controller.signal });
  } finally { clearTimeout(timeout); }
}

// Upstream validation messages are safe, short and useful ("Files must be
// between 1 byte and 15 MB"), so pass those through; anything else becomes a
// generic message rather than leaking internals.
async function upstreamError(response: Response, fallback: string) {
  if (response.status === 401 || response.status === 403) {
    return json({ error: 'The document service did not accept this dashboard\'s credentials. Contact the agency administrator.', code: 'DOC_LINKS_AUTH' }, 502);
  }
  if (response.status === 400) {
    try {
      const body = await response.json() as { error?: unknown };
      if (typeof body.error === 'string' && body.error.length <= 200) return json({ error: body.error }, 400);
    } catch { /* fall through */ }
  }
  return json({ error: fallback }, 502);
}

const CURSOR_PATTERN = /^[A-Za-z0-9_\-.=+/]{1,1024}$/;

// Permanent delete is reserved for Bill's Agency Command Center (Bill,
// 2026-10-01). This same file runs in the staff dashboard, which refuses.
export const canDeleteDocLinks = (env: DocLinksEnv) => appId(env) !== 'agency-staff-dashboard';
// Gold Elite Gmail drafts go through the BLI Mail Gateway, which runs AS BILL -- every draft
// lands in Bill's Drafts. So only his Command Center offers it; staff keep a plain Gmail link.
export const canGmailDraft = (env: DocLinksEnv) => appId(env) !== 'agency-staff-dashboard';

export async function docLinksHandler(context: PagesContext<DocLinksEnv>, fetcher: typeof fetch = fetch) {
  const { request, env } = context;
  const denied = await requireSession(request, env);
  if (denied) return denied;
  const target = upstream(env);

  if (request.method === 'GET') {
    if (!target) return notConfigured();
    const cursor = new URL(request.url).searchParams.get('cursor') || '';
    if (cursor && !CURSOR_PATTERN.test(cursor)) return json({ error: 'Invalid page cursor.' }, 400);
    try {
      const response = await callUpstream(fetcher, `${target.base}/api/doc-links${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, {
        headers: { authorization: `Bearer ${target.token}`, accept: 'application/json' },
      });
      if (!response.ok) return upstreamError(response, 'The document library is unavailable right now. Please retry.');
      const body = await response.json() as { items?: unknown; cursor?: unknown };
      const items = (Array.isArray(body.items) ? body.items : []).map(normalizeDocLinkItem).filter(Boolean);
      const next = typeof body.cursor === 'string' && CURSOR_PATTERN.test(body.cursor) ? body.cursor : null;
      return json({ items, cursor: next, canDelete: canDeleteDocLinks(env), canGmailDraft: canGmailDraft(env) });
    } catch {
      return json({ error: 'Could not reach the document library. Please retry.' }, 502);
    }
  }

  if (request.method === 'DELETE') {
    if (!canDeleteDocLinks(env)) return json({ error: 'Only the Agency Command Center can delete document links.', code: 'DELETE_NOT_ALLOWED' }, 403);
    if (!target) return notConfigured();
    const id = (new URL(request.url).searchParams.get('id') || '').toLowerCase();
    if (!/^[a-f0-9]{12}$/.test(id)) return json({ error: 'Invalid document id.' }, 400);
    try {
      const response = await callUpstream(fetcher, `${target.base}/api/doc-links?id=${id}`, {
        method: 'DELETE', headers: { authorization: `Bearer ${target.token}`, accept: 'application/json' },
      });
      if (!response.ok) return upstreamError(response, 'The document could not be deleted. Nothing changed for that link; please retry.');
      const body = await response.json() as { alreadyGone?: unknown };
      return json({ ok: true, shortId: id, alreadyGone: body.alreadyGone === true });
    } catch {
      return json({ error: 'Could not reach the document service. Please retry the delete.' }, 502);
    }
  }

  if (request.method !== 'POST') return json({ error: 'Use GET to list documents, POST to create a link or DELETE to remove one.' }, 405);
  if (!target) return notConfigured();
  if (Number(request.headers.get('content-length') || 0) > MAX_BODY_BYTES) return json({ error: 'Document links accept files up to 15 MB.' }, 413);
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('multipart/form-data')) return json({ error: 'Send the document as a file upload.' }, 415);

  let form: FormData;
  try { form = await request.formData(); } catch { return json({ error: 'The upload could not be read. Please choose the file again.' }, 400); }
  // Allowlist: exactly one file plus an optional customer label -- nothing
  // else is forwarded.
  const file = form.get('file');
  if (!file || typeof file === 'string') return json({ error: 'Choose a file to upload.' }, 400);
  const problem = validateDocFile(file as File);
  if (problem) return json({ error: problem }, 400);
  const customer = String(form.get('customer') ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);

  const outbound = new FormData();
  outbound.append('file', file as File, (file as File).name);
  if (customer) outbound.append('customer', customer);
  // Which dashboard made it -- decided here, never by the browser. This same
  // file runs in both the Agency Command Center and the staff dashboard.
  outbound.append('source', appId(env) === 'agency-staff-dashboard' ? 'staff-dashboard' : 'command-center');
  try {
    const response = await callUpstream(fetcher, `${target.base}/api/doc-links`, {
      method: 'POST', headers: { authorization: `Bearer ${target.token}`, accept: 'application/json' }, body: outbound,
    });
    if (!response.ok) return upstreamError(response, 'The document service could not create the link. Nothing was sent to anyone; please retry.');
    const item = normalizeDocLinkItem(await response.json());
    if (!item) return json({ error: 'The document service returned an unexpected response. Check the library before retrying.' }, 502);
    return json({ item }, 201);
  } catch {
    return json({ error: 'The upload did not finish. Check the library before retrying so you do not create a duplicate.' }, 502);
  }
}

// GET /api/doc-links/file?id=<shortId> -- the document's bytes, so a Gmail draft can attach it
// even when the file isn't on this computer any more (library rows). Fetched server-to-server
// with ?ref=staff so it never counts as the customer opening it.
export async function docLinkFileHandler(context: PagesContext<DocLinksEnv>, fetcher: typeof fetch = fetch) {
  const { request, env } = context;
  const denied = await requireSession(request, env);
  if (denied) return denied;
  if (request.method !== 'GET') return json({ error: 'Use GET to fetch a document.' }, 405);
  const target = upstream(env);
  if (!target) return notConfigured();
  const id = (new URL(request.url).searchParams.get('id') || '').toLowerCase();
  if (!/^[a-f0-9]{12}$/.test(id)) return json({ error: 'Invalid document id.' }, 400);
  try {
    const response = await callUpstream(fetcher, `${target.base}/d/${id}/open?ref=staff`, { headers: { accept: '*/*' } });
    if (response.status === 404) return json({ error: 'That document no longer exists.' }, 404);
    if (!response.ok || !response.body) return json({ error: 'Could not load the document. Please retry.' }, 502);
    if (Number(response.headers.get('content-length') || 0) > MAX_DOC_BYTES) return json({ error: 'This document is too large to attach.' }, 413);
    return new Response(response.body, {
      headers: {
        'content-type': response.headers.get('content-type') || 'application/octet-stream',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch {
    return json({ error: 'Could not reach the document service. Please retry.' }, 502);
  }
}

export async function docLinkViewsHandler(context: PagesContext<DocLinksEnv>, fetcher: typeof fetch = fetch) {
  const { request, env } = context;
  const denied = await requireSession(request, env);
  if (denied) return denied;
  if (request.method !== 'GET') return json({ error: 'Use GET for document receipts.' }, 405);
  const target = upstream(env);
  if (!target) return notConfigured();
  const ids = [...new Set((new URL(request.url).searchParams.get('ids') || '').split(',').map(id => id.trim().toLowerCase()))]
    .filter(id => /^[a-f0-9]{12}$/.test(id)).slice(0, 40);
  if (!ids.length) return json({ views: {} });
  try {
    const response = await callUpstream(fetcher, `${target.base}/api/document-views?ids=${ids.join(',')}`, {
      headers: { authorization: `Bearer ${target.token}`, accept: 'application/json' },
    });
    if (!response.ok) return upstreamError(response, 'Document receipts are unavailable right now.');
    const body = await response.json() as { views?: Record<string, unknown> };
    const views: Record<string, unknown> = {};
    for (const id of ids) {
      const stats = normalizeViewStats(body.views?.[id]);
      if (stats) views[id] = stats;
    }
    return json({ views });
  } catch {
    return json({ error: 'Could not reach document receipts. Please retry.' }, 502);
  }
}
