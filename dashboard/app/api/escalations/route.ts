import { NextResponse } from 'next/server';
import { getCollection, normalizeDoc } from '../db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  try {
    let escalations: any[] = [];

    const escCol = await getCollection('escalations');
    if (escCol) {
      const filter: any = {};
      if (status) filter.status = status;
      const docs = await escCol
        .find(filter)
        .sort({ created_at: -1 })
        .limit(100)
        .toArray();
      escalations = docs.map(normalizeDoc);
    } else {
      const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
      try {
        const Database = await import('better-sqlite3');
        const db = new (Database.default as any)(dbPath, { readonly: true });

        let query = 'SELECT * FROM escalations WHERE 1=1';
        const params: any[] = [];

        if (status) {
          query += ' AND status = ?';
          params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT 100';
        escalations = db.prepare(query).all(...params) as any[];
        db.close();
      } catch {
        // Fallback: read from calls with transferred status
        const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
        const Database = await import('better-sqlite3');
        const db = new (Database.default as any)(dbPath, { readonly: true });
        escalations = db.prepare("SELECT id, call_id, escalation_tier as tier, summary as reason, created_at, 'pending' as status FROM calls WHERE status = 'transferred' OR escalation_tier IS NOT NULL ORDER BY created_at DESC LIMIT 100").all() as any[];
        db.close();
      }
    }

    return NextResponse.json({ escalations });
  } catch (error: any) {
    console.error("Error fetching escalations:", error);
    return NextResponse.json({ escalations: [], error: error.message });
  }
}
