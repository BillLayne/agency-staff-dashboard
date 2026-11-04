import { json, requireSession } from './auth.ts';
import type { AuthEnv, PagesContext } from './auth.ts';
import { normalizeAddress, normalizeResearch } from '../shared/homeQuote.ts';

export const HOME_PROPERTY_ENDPOINT = 'https://find-my-home-information.pages.dev/api/property';
export async function homeQuoteHandler(context: PagesContext<AuthEnv>, fetcher: typeof fetch = fetch) {
  const { request, env } = context;
  const denied = await requireSession(request, env);
  if (denied) return denied;
  if (request.method !== 'POST') return json({ error: 'Use POST for property research.' }, 405);
  if (Number(request.headers.get('content-length') || 0) > 1024) return json({ error: 'Send only the property address.' }, 413);
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 1024) return json({ error: 'Send only the property address.' }, 413);
    body = JSON.parse(text);
  } catch { return json({ error: 'Enter a complete North Carolina street address.' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => key !== 'address') || !('address' in body) || typeof body.address !== 'string') return json({ error: 'Send only the property address; interview answers stay in the browser.' }, 400);
  const address = normalizeAddress(body.address);
  if (address.length < 8 || address.length > 180 || !/\d/.test(address) || !/[a-z]/i.test(address)) return json({ error: 'Enter a full street address, city and NC ZIP code (8-180 characters).' }, 400);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22000);
  try {
    const response = await fetcher(HOME_PROPERTY_ENDPOINT, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address }), signal: controller.signal,
    });
    if (!response.ok) return json({ error: 'Property research is unavailable right now. Your interview is unchanged. Retry or open Find My Home.' }, 502);
    const result = await response.json();
    return json(normalizeResearch(result, address));
  } catch {
    return json({ error: controller.signal.aborted ? 'Property research timed out. Your interview is unchanged. Please retry.' : 'Could not read the property service. Your interview is unchanged. Please retry.' }, 502);
  } finally { clearTimeout(timeout); }
}
