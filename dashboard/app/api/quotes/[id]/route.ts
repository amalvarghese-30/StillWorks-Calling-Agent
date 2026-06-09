import { NextResponse } from 'next/server';
import { getCollection, normalizeDoc } from '../../db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const quotesCol = await getCollection('quotes');
    if (quotesCol) {
      const { ObjectId } = await import('mongodb');
      let doc;
      try {
        doc = await quotesCol.findOne({ _id: new ObjectId(id) });
      } catch {
        doc = await quotesCol.findOne({ quote_id: id });
      }
      if (!doc) {
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
      }
      return NextResponse.json({ quote: normalizeDoc(doc) });
    } else {
      const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
      const Database = await import('better-sqlite3');
      const db = new (Database.default as any)(dbPath, { readonly: true });

      let quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(id);
      if (!quote) {
        quote = db.prepare('SELECT * FROM quotes WHERE quote_id = ?').get(id);
      }
      db.close();

      if (!quote) {
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
      }
      return NextResponse.json({ quote });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
