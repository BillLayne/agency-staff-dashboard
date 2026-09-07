export interface AuthEnv {
  SITE_PASSWORD?: string;
  SESSION_SECRET?: string;
  APP_ID?: string;
  APP_NAME?: string;
}

export interface PagesContext<E = AuthEnv> {
  request: Request;
  env: E;
  next: () => Promise<Response>;
}

export const SESSION_SECONDS = 7 * 24 * 60 * 60;
const encoder = new TextEncoder();
const encode = (value: Uint8Array) => btoa(String.fromCharCode(...value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const decode = (value: string) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
export const appId = (env: AuthEnv) => env.APP_ID || 'customer-matrix-pro';
export const cookieName = (env: AuthEnv) => appId(env) === 'agency-staff-dashboard' ? 'agency_staff_session' : 'customer_matrix_pro_session';
export const authConfigured = (env: AuthEnv) => Boolean(env.SITE_PASSWORD && env.SESSION_SECRET && env.SESSION_SECRET.length >= 32);

async function signingKey(env: AuthEnv) {
  if (!authConfigured(env)) throw new Error('Authentication is not configured.');
  // Rotating either server credential invalidates existing sessions.
  return crypto.subtle.importKey('raw', encoder.encode(`${env.SESSION_SECRET}:${env.SITE_PASSWORD}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function passwordMatches(input: string, expected: string) {
  const [left, right] = await Promise.all([input, expected].map(async value => new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))));
  return left.reduce((difference, byte, index) => difference | (byte ^ right[index]), 0) === 0;
}

export async function createSession(env: AuthEnv, now = Date.now()) {
  const issued = Math.floor(now / 1000);
  const payload = encode(encoder.encode(JSON.stringify({ aud: appId(env), iat: issued, exp: issued + SESSION_SECONDS, nonce: crypto.randomUUID() })));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(env), encoder.encode(payload));
  return `${payload}.${encode(new Uint8Array(signature))}`;
}

export async function verifySession(token: string | undefined, env: AuthEnv, now = Date.now()) {
  if (!token || token.length > 2048 || !authConfigured(env)) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const valid = await crypto.subtle.verify('HMAC', await signingKey(env), decode(parts[1]), encoder.encode(parts[0]));
    if (!valid) return false;
    const claims = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    const current = Math.floor(now / 1000);
    return claims.aud === appId(env) && Number.isInteger(claims.iat) && Number.isInteger(claims.exp)
      && claims.iat <= current + 60 && claims.exp > current && claims.exp - claims.iat === SESSION_SECONDS;
  } catch { return false; }
}

export function readSession(request: Request, env: AuthEnv) {
  return request.headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName(env)}=`))?.slice(cookieName(env).length + 1);
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return false;
  return request.headers.get('sec-fetch-site') !== 'cross-site';
}

export function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}

export async function requireSession(request: Request, env: AuthEnv): Promise<Response | null> {
  if (!authConfigured(env)) return json({ error: 'Sign-in is temporarily unavailable. Please contact the agency administrator.', code: 'AUTH_NOT_CONFIGURED' }, 503);
  if (!(await verifySession(readSession(request, env), env))) return json({ error: 'Your session expired. Sign in again; your unsaved work stays on this device.', code: 'SESSION_EXPIRED', loginUrl: '/login' }, 401);
  if (!['GET', 'HEAD'].includes(request.method) && !sameOrigin(request)) return json({ error: 'This request must come from the dashboard.' }, 403);
  return null;
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

export function loginPage(env: AuthEnv, message = '', status = 401) {
  const title = escapeHtml(env.APP_NAME || 'Agency Command Center');
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sign in | ${title}</title><link rel="icon" href="data:,"><style>
  *{box-sizing:border-box}body{margin:0;background:#f3f4f6;color:#17212d;font-family:system-ui,sans-serif;min-height:100dvh;display:grid;place-items:center;padding:20px}main{width:min(420px,100%);border:1px solid #d6dbe2;border-radius:8px;background:white;padding:28px}h1{font-size:24px;line-height:1.2;margin:8px 0 24px}p{color:#526070;font-size:14px;line-height:1.5}label{display:block;font-size:14px;font-weight:600;margin-bottom:8px}input,button{width:100%;min-height:48px;border-radius:6px;font:inherit;padding:12px}input{border:1px solid #aab5c3;margin-bottom:16px}button{background:#003f87;color:white;border:0;font-weight:600;cursor:pointer}input:focus-visible,button:focus-visible{outline:3px solid #77b8eb;outline-offset:3px}.error{padding:12px;background:#fff1f2;color:#9f1239;border:1px solid #fecdd3;border-radius:6px}.brand{color:#003f87;font-weight:700}</style></head><body><main><p class="brand">Bill Layne Insurance</p><h1>${title}</h1>${message ? `<p class="error" role="alert">${escapeHtml(message)}</p>` : ''}<form method="post" action="/login"><label for="password">Agency access password</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus maxlength="256"><button type="submit">Sign in</button></form></main></body></html>`, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'" } });
}

export async function authenticationMiddleware(context: PagesContext) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const isApi = url.pathname.startsWith('/api/');
  if (!authConfigured(env)) return isApi ? json({ error: 'Sign-in is temporarily unavailable.', code: 'AUTH_NOT_CONFIGURED' }, 503) : loginPage(env, 'Sign-in is temporarily unavailable. Please contact the agency administrator.', 503);
  if (url.pathname === '/logout') {
    if (!sameOrigin(request)) return json({ error: 'This request must come from the dashboard.' }, 403);
    return new Response(null, { status: 303, headers: { location: '/login', 'cache-control': 'no-store', 'set-cookie': `${cookieName(env)}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` } });
  }
  if (url.pathname === '/login' && request.method === 'POST') {
    if (!sameOrigin(request)) return loginPage(env, 'Please sign in from this dashboard.', 403);
    if (Number(request.headers.get('content-length') || 0) > 4096) return loginPage(env, 'Please enter a valid password.', 413);
    let password = '';
    try { password = String((await request.formData()).get('password') || ''); } catch { return loginPage(env, 'Please enter your password.', 400); }
    if (password.length > 256 || !(await passwordMatches(password, env.SITE_PASSWORD!))) return loginPage(env, 'That password was not accepted. Try again.');
    const token = await createSession(env);
    return new Response(null, { status: 303, headers: { location: '/', 'cache-control': 'no-store', 'set-cookie': `${cookieName(env)}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}` } });
  }
  const authorized = await verifySession(readSession(request, env), env);
  if (!authorized) return isApi ? json({ error: 'Your session expired. Sign in again; your unsaved work stays on this device.', code: 'SESSION_EXPIRED', loginUrl: '/login' }, 401) : loginPage(env);
  if (url.pathname === '/login') return new Response(null, { status: 303, headers: { location: '/', 'cache-control': 'no-store' } });
  if (!['GET', 'HEAD'].includes(request.method) && !sameOrigin(request)) return json({ error: 'This request must come from the dashboard.' }, 403);
  const upstream = await next();
  const headers = new Headers(upstream.headers);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('x-frame-options', 'SAMEORIGIN');
  if (!url.pathname.startsWith('/assets/')) headers.set('cache-control', 'no-store');
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers });
}
