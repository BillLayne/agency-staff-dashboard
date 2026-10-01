// Loopback-only preview for the Docs workspace (Document Links) when the
// Windows workerd runtime cannot start. Runs the REAL auth middleware and the
// REAL /api/doc-links proxy, but the document service behind it is an
// in-memory fake: nothing is uploaded to docs.billlayneinsurance.com and no
// real credentials are read (session + token are synthetic, generated here).
//
//   npm run build
//   node --experimental-strip-types scripts/preview-doc-links.mjs
//   open http://127.0.0.1:8789/__preview-login   (sets a local session, then loads the app)
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authenticationMiddleware, createSession, cookieName, json } from '../server/auth.ts';
import { docLinksHandler, docLinkViewsHandler } from '../server/docLinks.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const port = 8789;
const base = `http://127.0.0.1:${port}`;
const env = {
  SITE_PASSWORD: randomBytes(24).toString('hex'),
  SESSION_SECRET: randomBytes(32).toString('hex'),
  APP_ID: 'agency-staff-dashboard',
  APP_NAME: 'Agency Staff Dashboard - Local Docs Preview',
  DOC_LINK_TOKEN: randomBytes(32).toString('hex'),
};
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp', '.jpg': 'image/jpeg' };

// --- in-memory stand-in for the SMS Command Center document service ---------
const hex = () => randomBytes(6).toString('hex');
const daysAgo = days => new Date(Date.now() - days * 86400000).toISOString();
const library = [
  ['Pat-Example-Proof-of-Insurance.pdf', 'Pat Example', 'command-center', 1],
  ['SAMPLE-CUSTOMER-ID-CARDS.pdf', null, 'staff-dashboard', 2],
  ['Jordan-Sample-Insurance-Quote.pdf', null, 'sms', 4],
  ['Taylor-Demo-Payment-Receipt.pdf', 'Taylor Demo', 'command-center', 6],
  ['scan-of-signed-no-loss-statement.pdf', null, 'sms', 9],
  ['Casey-Test-Cancellation-Form.docx', 'Casey Test', 'command-center', 12],
].map(([fileName, customer, source, age]) => {
  const shortId = hex();
  return { shortId, url: `https://docs.billlayneinsurance.com/d/${shortId}`, fileName, contentType: fileName.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf', createdAt: daysAgo(age), source, customer, size: 180000 + age * 9000 };
});
const views = {
  [library[0].shortId]: { count: 3, firstViewedAt: daysAgo(1), lastViewedAt: daysAgo(0.2), openedCount: 1, lastOpenedAt: daysAgo(0.2), downloadedCount: 1, lastDownloadedAt: daysAgo(0.1) },
  [library[1].shortId]: { count: 2, firstViewedAt: daysAgo(2), lastViewedAt: daysAgo(1.5), openedCount: 1, lastOpenedAt: daysAgo(1.5) },
  [library[2].shortId]: { count: 1, firstViewedAt: daysAgo(3), lastViewedAt: daysAgo(3) },
};
async function fakeDocumentService(url, init = {}) {
  await new Promise(resolve => setTimeout(resolve, 350)); // feel a little like a network call
  const target = new URL(url);
  if (new Headers(init.headers).get('authorization') !== `Bearer ${env.DOC_LINK_TOKEN}`) return json({ error: 'Unauthorized' }, 401);
  if (target.pathname === '/api/doc-links' && init.method === 'POST') {
    const file = init.body.get('file');
    const shortId = hex();
    const item = { shortId, url: `https://docs.billlayneinsurance.com/d/${shortId}`, fileName: file.name, contentType: file.type || 'application/pdf', createdAt: new Date().toISOString(), source: init.body.get('source') || 'command-center', customer: init.body.get('customer') || null, size: file.size };
    library.unshift(item);
    return json(item, 201);
  }
  if (target.pathname === '/api/doc-links') return json({ items: library, cursor: null });
  if (target.pathname === '/api/document-views') {
    const ids = (target.searchParams.get('ids') || '').split(',');
    return json({ views: Object.fromEntries(ids.filter(id => views[id]).map(id => [id, views[id]])) });
  }
  return json({ error: 'Not found' }, 404);
}

createServer(async (incoming, outgoing) => {
  try {
    // Honour the Host actually used (localhost vs 127.0.0.1) so the real same-origin check passes.
    const url = new URL(incoming.url, /^(localhost|127\.0\.0\.1):\d+$/.test(incoming.headers.host || '') ? `http://${incoming.headers.host}` : base);
    if (url.pathname === '/__preview-login') {
      outgoing.writeHead(303, { location: '/', 'set-cookie': `${cookieName(env)}=${await createSession(env)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400` });
      outgoing.end(); return;
    }
    const chunks = []; let size = 0;
    for await (const chunk of incoming) { size += chunk.length; if (size > 17 * 1024 * 1024) { outgoing.writeHead(413); outgoing.end(); return; } chunks.push(chunk); }
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const request = new Request(url, { method: incoming.method, headers: incoming.headers, ...(body ? { body } : {}) });
    const next = async () => {
      if (url.pathname === '/api/doc-links') return docLinksHandler({ request, env, next }, fakeDocumentService);
      if (url.pathname === '/api/doc-links/views') return docLinkViewsHandler({ request, env, next }, fakeDocumentService);
      if (url.pathname.startsWith('/api/')) return json({ error: 'This local Docs preview does not connect to contacts, images or AI.' }, 503);
      if (!['GET', 'HEAD'].includes(request.method)) return json({ error: 'Not available in this preview.' }, 405);
      const file = path.resolve(dist, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if (!file.startsWith(dist + path.sep) || !existsSync(file)) return new Response('Not found', { status: 404 });
      return new Response(request.method === 'HEAD' ? null : readFileSync(file), { headers: { 'content-type': types[path.extname(file)] || 'application/octet-stream' } });
    };
    const response = await authenticationMiddleware({ request, env, next });
    const headers = Object.fromEntries(response.headers);
    // Local http: drop Secure so the browser keeps the cookie on 127.0.0.1.
    if (headers['set-cookie']) headers['set-cookie'] = headers['set-cookie'].replace(/;\s*Secure/gi, '');
    outgoing.writeHead(response.status, headers);
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { outgoing.writeHead(500); outgoing.end('Local preview request failed: ' + (error && error.message)); }
}).listen(port, '127.0.0.1', () => console.log(`Local Docs preview: ${base}/__preview-login  (fake document service, synthetic credentials)`));
