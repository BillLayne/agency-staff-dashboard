import { json, requireSession, type AuthEnv, type PagesContext } from './auth.ts';

export interface Statement {
  bind(...values: unknown[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}
export interface ContactDatabase { prepare(sql: string): Statement }
export interface ContactEnv extends AuthEnv { CONTACTS_DB?: ContactDatabase }

type Detail = { kind: 'phone' | 'fax' | 'email' | 'website'; label: string; value: string };
export type ContactEntry = Detail & { id: string; company: string; createdAt: number; replacesDetail?: Detail };
const kinds = new Set(['phone', 'fax', 'email', 'website']);
const text = (value: unknown, limit: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= limit;
const detailValid = (entry: unknown): entry is Detail => {
  if (!entry || typeof entry !== 'object') return false;
  const row = entry as Detail;
  return kinds.has(row.kind) && text(row.label, 160) && text(row.value, 1000);
};

export function validateContacts(input: unknown): input is ContactEntry[] {
  if (!Array.isArray(input) || input.length > 5000) return false;
  const ids = new Set<string>();
  return input.every(value => {
    const row = value as ContactEntry;
    if (!detailValid(value) || !text(row.id, 200) || !text(row.company, 200) || !Number.isFinite(row.createdAt)
      || row.createdAt < 0 || ids.has(row.id) || (row.replacesDetail !== undefined && !detailValid(row.replacesDetail))) return false;
    if (Object.keys(row).some(key => !['id', 'company', 'kind', 'label', 'value', 'createdAt', 'replacesDetail'].includes(key))) return false;
    if (row.replacesDetail && Object.keys(row.replacesDetail).some(key => !['kind', 'label', 'value'].includes(key))) return false;
    ids.add(row.id);
    if (row.kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.value)) return false;
    if (row.kind === 'website') {
      try {
        const value = row.value.trim();
        const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`);
        if (!['https:', 'http:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password) return false;
      } catch { return false; }
    }
    return true;
  });
}

async function readDocument(db: ContactDatabase) {
  const row = await db.prepare('SELECT entries, revision FROM contact_directory WHERE id = 1').first<{ entries: string; revision: number }>();
  if (!row) throw new Error('Contact database has not been initialized.');
  return { entries: JSON.parse(row.entries) as ContactEntry[], revision: row.revision };
}

export async function contactsHandler({ request, env }: PagesContext<ContactEnv>) {
  const authError = await requireSession(request, env);
  if (authError) return authError;
  if (!env.CONTACTS_DB) return json({ error: 'Shared contacts are temporarily unavailable. Your local contacts are still available.' }, 503);
  try {
    if (request.method === 'GET') return json(await readDocument(env.CONTACTS_DB));
    if (request.method !== 'PUT') return json({ error: 'Method not allowed.' }, 405);
    if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'Expected a JSON contact update.' }, 415);
    const raw = await request.text();
    if (raw.length > 2_000_000) return json({ error: 'The contact backup is too large.' }, 413);
    let input: { entries?: unknown; revision?: unknown };
    try { input = JSON.parse(raw); } catch { return json({ error: 'The contact update is not valid JSON.' }, 400); }
    if (!input || typeof input !== 'object' || !validateContacts(input.entries) || !Number.isSafeInteger(input.revision) || Number(input.revision) < 0) return json({ error: 'The contact update has invalid or duplicate entries.' }, 400);
    // The revision comparison and write are atomic. A trigger keeps the previous version.
    const updated = await env.CONTACTS_DB.prepare('UPDATE contact_directory SET entries = ?, revision = revision + 1, updated_at = ? WHERE id = 1 AND revision = ? RETURNING revision')
      .bind(JSON.stringify(input.entries), Date.now(), input.revision).first<{ revision: number }>();
    if (!updated) return json({ ...(await readDocument(env.CONTACTS_DB)), error: 'Contacts changed on another device. Review the latest version before saving.' }, 409);
    return json({ entries: input.entries, revision: updated.revision });
  } catch {
    return json({ error: 'Shared contacts could not be reached. Your pending changes are kept on this device.' }, 503);
  }
}
