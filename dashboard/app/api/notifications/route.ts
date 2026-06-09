import { NextResponse } from 'next/server';
import { getCollection, normalizeDoc } from '../db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get('unread') === 'true';
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    const notifCol = await getCollection('notifications');
    let notifications: any[] = [];

    if (notifCol) {
      const filter: any = {};
      if (unreadOnly) filter.read = 0;
      notifications = await notifCol
        .find(filter)
        .sort({ created_at: -1 })
        .limit(limit)
        .toArray();
      notifications = notifications.map(normalizeDoc);
    } else {
      try {
        const Database = await import('better-sqlite3');
        const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
        const db = new (Database.default as any)(dbPath, { readonly: true });
        let query = 'SELECT * FROM notifications';
        if (unreadOnly) query += ' WHERE read = 0';
        query += ' ORDER BY created_at DESC LIMIT ?';
        notifications = db.prepare(query).all(limit) as any[];
        db.close();
      } catch {
        notifications = [];
      }
    }

    const unreadCount = notifications.filter((n: any) => !n.read).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, title, message, call_id, customer_id, campaign_id } = body;

    if (!type || !title) {
      return NextResponse.json({ error: "type and title are required" }, { status: 400 });
    }

    const notifRecord = {
      type,
      title,
      message: message || '',
      call_id: call_id || null,
      customer_id: customer_id || null,
      campaign_id: campaign_id || null,
      read: 0,
      created_at: new Date().toISOString(),
    };

    const notifCol = await getCollection('notifications');
    if (notifCol) {
      const result = await notifCol.insertOne(notifRecord);
      return NextResponse.json({ notification: normalizeDoc({ ...notifRecord, _id: result.insertedId }) });
    }

    try {
      const Database = await import('better-sqlite3');
      const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
      const db = new (Database.default as any)(dbPath);
      const info = db.prepare(
        'INSERT INTO notifications (type, title, message, call_id, customer_id, campaign_id, read, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)'
      ).run(type, title, message, call_id, customer_id, campaign_id, new Date().toISOString());
      db.close();
      return NextResponse.json({ notification: { ...notifRecord, id: info.lastInsertRowid } });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Error creating notification:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
