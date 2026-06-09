import { NextResponse } from 'next/server';
import { getCollection, normalizeDoc } from '../db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  try {
    let quotes: any[] = [];

    const quotesCol = await getCollection('quotes');
    if (quotesCol) {
      const filter: any = {};
      if (status) filter.status = status;
      if (search) {
        filter.$or = [
          { quote_id: { $regex: search, $options: 'i' } },
          { customer_name: { $regex: search, $options: 'i' } },
        ];
      }
      const docs = await quotesCol
        .find(filter)
        .sort({ created_at: -1 })
        .limit(100)
        .toArray();
      quotes = docs.map(normalizeDoc);
    } else {
      const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
      try {
        const Database = await import('better-sqlite3');
        const db = new (Database.default as any)(dbPath, { readonly: true });

        let query = 'SELECT * FROM quotes WHERE 1=1';
        const params: any[] = [];

        if (status) {
          query += ' AND status = ?';
          params.push(status);
        }
        if (search) {
          query += ' AND (quote_id LIKE ? OR customer_name LIKE ?)';
          const term = `%${search}%`;
          params.push(term, term);
        }

        query += ' ORDER BY created_at DESC LIMIT 100';
        quotes = db.prepare(query).all(...params) as any[];
        db.close();
      } catch {
        quotes = [];
      }
    }

    return NextResponse.json({ quotes });
  } catch (error: any) {
    console.error("Error fetching quotes:", error);
    return NextResponse.json({ quotes: [], error: error.message });
  }
}
