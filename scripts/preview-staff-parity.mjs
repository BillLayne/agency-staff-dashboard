// Loopback-only preview fallback when the Windows workerd runtime cannot start.
// Runs the real auth and quote handlers, but never connects to contacts D1 or messaging APIs.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authenticationMiddleware, createSession, cookieName, json } from '../server/auth.ts';
import { homeQuoteHandler } from '../server/homeQuote.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const vars = Object.fromEntries(readFileSync(path.join(root, '.dev.vars'), 'utf8').split(/\r?\n/).filter(line => /^[A-Z_][A-Z0-9_]*=/.test(line)).map(line => {
  const index = line.indexOf('='); const value = line.slice(index + 1).trim();
  return [line.slice(0, index), value.startsWith('"') ? JSON.parse(value) : value.replace(/^'(.*)'$/, '$1')];
}));
const env = { SITE_PASSWORD: vars.SITE_PASSWORD, SESSION_SECRET: vars.SESSION_SECRET, APP_ID: 'agency-staff-dashboard', APP_NAME: 'Agency Command Center - Local Quote Preview' };
const port = 8791;
const base = `http://127.0.0.1:${port}`;
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
mkdirSync(path.join(root, 'output/qa'), { recursive: true });
writeFileSync(path.join(root, 'output/qa/staff-local-auth.json'), JSON.stringify({ cookies: [{ name: cookieName(env), value: await createSession(env), domain: '127.0.0.1', path: '/', httpOnly: true, secure: false, sameSite: 'Lax', expires: Math.floor(Date.now() / 1000) + 86400 }], origins: [] }), { mode: 0o600 });
createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url, base);
    let body = '';
    for await (const chunk of incoming) { body += chunk; if (body.length > 32768) { outgoing.writeHead(413); outgoing.end(); return; } }
    const request = new Request(url, { method: incoming.method, headers: incoming.headers, ...(body ? { body } : {}) });
    const next = async () => {
      if (url.pathname === '/api/home-quote') return homeQuoteHandler({ request, env, next });
      if (url.pathname === '/api/contacts' && request.method === 'GET') return json({ revision: 0, entries: [] });
      if (url.pathname.startsWith('/api/')) return json({ error: 'Local preview: service disconnected.' }, 503);
      if (!['GET', 'HEAD'].includes(request.method)) return json({ error: 'Not available in this preview.' }, 405);
      const file = path.resolve(dist, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if (!file.startsWith(dist + path.sep) || !existsSync(file)) return new Response('Not found', { status: 404 });
      return new Response(request.method === 'HEAD' ? null : readFileSync(file), { headers: { 'content-type': types[path.extname(file)] || 'application/octet-stream' } });
    };
    const response = await authenticationMiddleware({ request, env, next });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch { outgoing.writeHead(500); outgoing.end('Local preview request failed.'); }
}).listen(port, '127.0.0.1', () => console.log(`Local quote preview: ${base}. No contacts or messaging writes enabled.`));
