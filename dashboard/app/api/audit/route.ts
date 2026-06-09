import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.action || !body.resource) {
      return NextResponse.json({ error: 'action and resource required' }, { status: 400 });
    }

    // Async audit logging — fire-and-forget style
    try {
      const Database = await import('better-sqlite3');
      const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
      const db = new (Database.default as any)(dbPath);
      db.prepare(
        'INSERT INTO audit_logs (user_id, action, resource, resource_id, details_json, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        body.user_id || null,
        body.action,
        body.resource,
        body.resource_id || null,
        JSON.stringify(body.details_json || {}),
        body.ip_address || null,
        body.user_agent || null,
        body.created_at || new Date().toISOString()
      );
      db.close();
    } catch {}

    return NextResponse.json({ logged: true });
  } catch {
    return NextResponse.json({ logged: true });
  }
}
