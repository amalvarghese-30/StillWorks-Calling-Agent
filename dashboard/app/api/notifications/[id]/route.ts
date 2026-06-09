import { NextResponse } from 'next/server';
import { getCollection } from '../../db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const read = body.read !== undefined ? body.read : true;

  try {
    const notifCol = await getCollection('notifications');
    if (notifCol) {
      const { ObjectId } = await import('mongodb');
      try {
        await notifCol.updateOne(
          { _id: new ObjectId(id) },
          { $set: { read: read ? 1 : 0 } }
        );
      } catch {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    const Database = await import('better-sqlite3');
    const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
    const db = new (Database.default as any)(dbPath);
    db.prepare('UPDATE notifications SET read = ? WHERE id = ?').run(read ? 1 : 0, id);
    db.close();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
