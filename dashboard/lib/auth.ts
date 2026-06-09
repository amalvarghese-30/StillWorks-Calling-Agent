import crypto from 'crypto';

const SESSION_SECRET = process.env.LIVEKIT_API_SECRET || 'agriforge-dev-secret-change-me';
const SESSION_COOKIE = 'agriforge_session';
const SESSION_MAX_AGE = 8 * 60 * 60; // 8 hours

interface SessionPayload {
  userId: number;
  email: string;
  role: string;
  name: string;
  exp: number;
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str: string): Buffer {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(testHash), Buffer.from(hash));
}

export function createSessionToken(payload: Omit<SessionPayload, 'exp'>): { token: string; expiresAt: Date } {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const fullPayload: SessionPayload = { ...payload, exp };

  const header = base64UrlEncode(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = base64UrlEncode(Buffer.from(JSON.stringify(fullPayload)));
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(`${header}.${body}`).digest();

  const token = `${header}.${body}.${base64UrlEncode(signature)}`;
  return { token, expiresAt: new Date(exp * 1000) };
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, bodyB64, sigB64] = parts;
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET)
      .update(`${headerB64}.${bodyB64}`).digest();
    const actualSig = base64UrlDecode(sigB64);

    if (!crypto.timingSafeEqual(expectedSig, actualSig)) return null;

    const payload: SessionPayload = JSON.parse(base64UrlDecode(bodyB64).toString('utf8'));

    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookieConfig(): {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict';
    path: string;
    maxAge: number;
  };
} {
  return {
    name: SESSION_COOKIE,
    value: '',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: SESSION_MAX_AGE,
    },
  };
}

export function sessionCookieFor(token: string): string {
  const cfg = getSessionCookieConfig();
  const secureFlag = cfg.options.secure ? '; Secure' : '';
  return `${cfg.name}=${token}; HttpOnly; SameSite=${cfg.options.sameSite}; Path=${cfg.options.path}; Max-Age=${cfg.options.maxAge}${secureFlag}`;
}

export function clearSessionCookie(): string {
  const cfg = getSessionCookieConfig();
  const secureFlag = cfg.options.secure ? '; Secure' : '';
  return `${cfg.name}=; HttpOnly; SameSite=${cfg.options.sameSite}; Path=${cfg.options.path}; Max-Age=0${secureFlag}`;
}

export function getSessionFromRequest(request: Request): SessionPayload | null {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = parseCookies(cookieHeader);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  return verifySessionToken(token);
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((pair) => {
    const [key, ...rest] = pair.trim().split('=');
    if (key) cookies[key] = rest.join('=');
  });
  return cookies;
}

export { SESSION_COOKIE };
