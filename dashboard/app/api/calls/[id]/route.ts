import { NextResponse } from 'next/server';
import { getCollection, normalizeDoc } from '../../db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const callsCol = await getCollection('calls');
    let call: any = null;

    if (callsCol) {
      const { ObjectId } = await import('mongodb');
      try {
        call = await callsCol.findOne({ _id: new ObjectId(id) });
      } catch {
        call = await callsCol.findOne({ call_id: id });
      }
      if (!call) {
        return NextResponse.json({ error: 'Call not found' }, { status: 404 });
      }
      call = normalizeDoc(call);

      // Fetch related data
      const callMemoryCol = await getCollection('call_memory');
      const quotesCol = await getCollection('quotes');
      const escalationsCol = await getCollection('escalations');
      const appointmentsCol = await getCollection('appointments');

      const callIdStr = call.call_id || call.id;
      const phone = call.phone_number || '';

      const [callMemory, quote, escalation, appointments] = await Promise.all([
        callMemoryCol
          ? callMemoryCol.findOne({ call_id: callIdStr })
          : Promise.resolve(null),
        quotesCol
          ? quotesCol.findOne({ call_id: callIdStr })
          : Promise.resolve(null),
        escalationsCol
          ? escalationsCol.findOne({ call_id: callIdStr })
          : Promise.resolve(null),
        appointmentsCol
          ? appointmentsCol.find({ phone }).sort({ created_at: -1 }).limit(5).toArray()
          : Promise.resolve([]),
      ]);

      return NextResponse.json({
        call,
        callMemory: callMemory ? normalizeDoc(callMemory) : null,
        quote: quote ? normalizeDoc(quote) : null,
        escalation: escalation ? normalizeDoc(escalation) : null,
        appointments: (appointments || []).map(normalizeDoc),
      });
    }

    // SQLite fallback
    const Database = await import('better-sqlite3');
    const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
    const db = new (Database.default as any)(dbPath, { readonly: true });

    call = db.prepare('SELECT * FROM calls WHERE id = ?').get(id) as any;
    if (!call) {
      // Try by call_id
      call = db.prepare('SELECT * FROM calls WHERE call_id = ?').get(id) as any;
    }
    if (!call) {
      db.close();
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    const callIdStr = call.call_id || call.id?.toString();
    const phone = call.phone_number || '';

    let callMemory: any = null;
    let quote: any = null;
    let escalation: any = null;
    let appointments: any[] = [];

    try { callMemory = db.prepare('SELECT * FROM call_memory WHERE call_id = ? LIMIT 1').get(callIdStr) as any; } catch {}
    try { quote = db.prepare('SELECT * FROM quotes WHERE call_id = ? LIMIT 1').get(callIdStr) as any; } catch {}
    try { escalation = db.prepare('SELECT * FROM escalations WHERE call_id = ? LIMIT 1').get(callIdStr) as any; } catch {}
    try { appointments = db.prepare('SELECT * FROM service_bookings WHERE phone = ? ORDER BY created_at DESC LIMIT 5').all(phone) as any[]; } catch {}

    db.close();

    return NextResponse.json({
      call,
      callMemory,
      quote,
      escalation,
      appointments,
    });
  } catch (error: any) {
    console.error("Error fetching call detail:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
