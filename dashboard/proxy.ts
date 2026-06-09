import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from './lib/auth';

// Pages that require authentication (ALL dashboard pages)
const PROTECTED_PAGES = [
  '/', '/call-center', '/campaigns', '/analytics', '/analytics/executive',
  '/settings', '/escalations', '/customers', '/leads', '/quotes', '/inventory',
  '/calendar', '/services', '/voice', '/calls', '/operations',
];

// Public pages that never require authentication
const PUBLIC_PAGES = ['/login'];

// Role-based page permissions
const PAGE_PERMISSIONS: Record<string, string[]> = {
  '/call-center': ['admin', 'manager', 'agent'],
  '/campaigns': ['admin', 'manager'],
  '/analytics': ['admin', 'manager'],
  '/analytics/executive': ['admin'],
  '/settings': ['admin', 'manager'],
  '/escalations': ['admin', 'manager', 'agent'],
  '/customers': ['admin', 'manager', 'agent', 'viewer'],
  '/leads': ['admin', 'manager', 'agent'],
  '/quotes': ['admin', 'manager', 'agent', 'viewer'],
  '/inventory': ['admin', 'manager', 'viewer'],
  '/calendar': ['admin', 'manager', 'agent'],
  '/services': ['admin', 'manager', 'agent'],
  '/voice': ['admin', 'manager', 'agent'],
  '/calls': ['admin', 'manager', 'agent', 'viewer'],
  '/operations': ['admin', 'manager'],
};

// API route permissions with dynamic route matching
interface ApiRule {
  method: string;
  pattern: RegExp;
  roles: string[];
}

const API_PERMISSIONS: ApiRule[] = [
  { method: 'POST', pattern: /^\/api\/scheduler$/, roles: ['admin'] },
  { method: 'PATCH', pattern: /^\/api\/campaigns\/[^/]+$/, roles: ['admin'] },
  { method: 'POST', pattern: /^\/api\/calls\/[^/]+\/actions$/, roles: ['admin'] },
  { method: 'POST', pattern: /^\/api\/calls\/outbound$/, roles: ['admin', 'manager', 'agent'] },
  { method: 'POST', pattern: /^\/api\/campaigns\/upload$/, roles: ['admin'] },
  { method: 'POST', pattern: /^\/api\/dispatch$/, roles: ['admin', 'manager', 'agent'] },
  { method: 'POST', pattern: /^\/api\/queue$/, roles: ['admin', 'manager'] },
  { method: 'PATCH', pattern: /^\/api\/leads$/, roles: ['admin', 'manager', 'agent'] },
  { method: 'POST', pattern: /^\/api\/notifications$/, roles: ['admin', 'manager', 'agent'] },
  { method: 'POST', pattern: /^\/api\/service-bookings$/, roles: ['admin', 'manager', 'agent'] },
];

function checkApiPermission(method: string, pathname: string, role: string): boolean {
  for (const rule of API_PERMISSIONS) {
    if (rule.method === method && rule.pattern.test(pathname)) {
      return rule.roles.includes(role);
    }
  }
  return true;
}

function getSession(request: NextRequest): { userId: number; email: string; role: string; name: string } | null {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((pair) => {
    const [key, ...rest] = pair.trim().split('=');
    if (key) cookies[key] = rest.join('=');
  });

  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  return { userId: payload.userId, email: payload.email, role: payload.role, name: payload.name };
}

function matchesDynamicRoute(pathname: string, routes: string[]): boolean {
  return routes.some((route) => {
    const regex = new RegExp('^' + route.replace(/\[[^/]+\]/g, '[^/]+') + '$');
    return regex.test(pathname);
  });
}

function addSecurityHeaders(response: NextResponse): void {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';");
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const session = getSession(request);
  const role = session?.role || '';
  const userId = session?.userId ? String(session.userId) : null;

  // Skip static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/auth/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // API routes
  if (pathname.startsWith('/api/')) {
    // Webhook endpoints use signature auth, not session auth
    const isWebhook = pathname === '/api/webhooks/livekit';
    if (isWebhook) {
      const response = NextResponse.next();
      addSecurityHeaders(response);
      return response;
    }

    // All other API routes require authentication
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Audit log for write operations
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      const auditEntry = {
        user_id: userId,
        action: method,
        resource: pathname,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || '',
        created_at: new Date().toISOString(),
      };

      try {
        fetch(new URL('/api/audit', request.url), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(auditEntry),
        }).catch(() => {});
      } catch {}
    }

    // Check API permissions with dynamic route matching
    if (!checkApiPermission(method, pathname, role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const response = NextResponse.next();
    addSecurityHeaders(response);
    response.headers.set('x-user-id', userId || '');
    response.headers.set('x-user-role', role || '');
    return response;
  }

  // Page routes

  // Allow public pages
  if (PUBLIC_PAGES.includes(pathname)) {
    // If already authenticated, redirect from login to dashboard
    if (pathname === '/login' && session) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  // All other pages require authentication
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check page-level role permissions
  const requiredRoles = PAGE_PERMISSIONS[pathname];
  if (requiredRoles && !requiredRoles.includes(role)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const response = NextResponse.next();
  addSecurityHeaders(response);
  response.headers.set('x-user-id', userId || '');
  response.headers.set('x-user-role', role || '');
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
