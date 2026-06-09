import { NextResponse } from 'next/server';
import { hashPassword, verifyPassword, createSessionToken, sessionCookieFor } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const dbPath = process.env.DATABASE_PATH || '../data/manas_group.db';
    const Database = await import('better-sqlite3');
    const db = new (Database.default as any)(dbPath);

    const user = db.prepare(
      'SELECT id, email, name, role, password_hash, is_active FROM users WHERE email = ?'
    ).get(email) as any;

    if (!user) {
      db.close();
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!user.is_active) {
      db.close();
      return NextResponse.json({ error: 'Account is disabled' }, { status: 403 });
    }

    if (!user.password_hash) {
      db.close();
      return NextResponse.json({ error: 'Account not configured. Contact administrator.' }, { status: 403 });
    }

    const valid = verifyPassword(password, user.password_hash);
    if (!valid) {
      db.close();
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Update last login
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(
      new Date().toISOString(),
      user.id
    );
    db.close();

    const { token } = createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });

    response.headers.set('Set-Cookie', sessionCookieFor(token));
    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
