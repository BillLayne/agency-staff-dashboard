import { normalizeDocLinkItem, normalizeViewStats } from '../shared/docLinks';
import type { DocLinkItem, DocViewStats } from '../shared/docLinks';

// Browser client for the dashboard's own /api/doc-links proxy (server/docLinks.ts).
// Same-origin + session cookie only; the document service credential stays server-side.

async function readJson(response: Response) {
  if (response.status === 401 || response.redirected) {
    throw new Error('Your session expired. Sign in again, then retry. Nothing was lost.');
  }
  const type = response.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new Error('The dashboard returned a sign-in page instead of data. Refresh and sign in again.');
  const body = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'The document service is unavailable. Please retry.');
  return body;
}

async function request(path: string, init: RequestInit = {}) {
  try {
    return await readJson(await fetch(path, { credentials: 'same-origin', ...init }));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    if (error instanceof TypeError) throw new Error('Could not reach the dashboard. Check your connection and retry.');
    throw error;
  }
}

export async function createDocLink(file: File, customer: string, signal?: AbortSignal): Promise<DocLinkItem> {
  const form = new FormData();
  form.append('file', file, file.name);
  if (customer.trim()) form.append('customer', customer.trim());
  const body = await request('/api/doc-links', { method: 'POST', body: form, signal });
  const item = normalizeDocLinkItem(body.item);
  if (!item) throw new Error('The document service returned an unexpected response. Check the library before retrying.');
  return item;
}

/**
 * Every page of the library, newest first (follows the cursor like the image
 * library does), plus whether this dashboard may delete (decided server-side).
 */
export async function listAllDocLinks(signal?: AbortSignal, onPage?: (count: number) => void): Promise<{ items: DocLinkItem[]; canDelete: boolean }> {
  const items: DocLinkItem[] = [];
  const seen = new Set<string>();
  let canDelete = false;
  let cursor = '';
  for (let page = 0; page < 25; page += 1) {
    const body = await request(`/api/doc-links${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, { signal });
    for (const raw of Array.isArray(body.items) ? body.items : []) {
      const item = normalizeDocLinkItem(raw);
      if (item && !seen.has(item.shortId)) { seen.add(item.shortId); items.push(item); }
    }
    onPage?.(items.length);
    canDelete = body.canDelete === true;
    cursor = typeof body.cursor === 'string' ? body.cursor : '';
    if (!cursor) break;
  }
  return { items, canDelete };
}

/** Permanently delete one document link (file, link and receipts). Safe to retry. */
export async function deleteDocLink(shortId: string, signal?: AbortSignal): Promise<{ alreadyGone: boolean }> {
  const body = await request(`/api/doc-links?id=${encodeURIComponent(shortId)}`, { method: 'DELETE', signal });
  return { alreadyGone: body.alreadyGone === true };
}

export async function fetchDocViews(ids: string[], signal?: AbortSignal): Promise<Record<string, DocViewStats>> {
  const result: Record<string, DocViewStats> = {};
  for (let start = 0; start < ids.length; start += 40) {
    const chunk = ids.slice(start, start + 40);
    const body = await request(`/api/doc-links/views?ids=${chunk.join(',')}`, { signal });
    const views = (body.views && typeof body.views === 'object' ? body.views : {}) as Record<string, unknown>;
    for (const id of chunk) {
      const stats = normalizeViewStats(views[id]);
      if (stats) result[id] = stats;
    }
  }
  return result;
}
