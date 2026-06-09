import { NextResponse } from 'next/server';
import { getCollection, normalizeDoc } from '../../db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';

    const customersCol = await getCollection('customers');
    if (customersCol) {
      const { ObjectId } = await import('mongodb');
      let customer;
      try {
        customer = await customersCol.findOne({ _id: new ObjectId(id) });
      } catch {
        customer = null;
      }
      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }

      const phone = (customer as any).phone || '';

      // Fetch related data in parallel
      const callsCol = await getCollection('calls');
      const quotesCol = await getCollection('quotes');
      const appointmentsCol = await getCollection('appointments');
      const leadsCol = await getCollection('leads');
      const callMemoryCol = await getCollection('call_memory');

      const [
        calls,
        quotes,
        appointments,
        lead,
        callMemory,
      ] = await Promise.all([
        callsCol
          ? callsCol.find({ phone_number: phone }).sort({ created_at: -1 }).limit(50).toArray()
          : Promise.resolve([]),
        quotesCol
          ? quotesCol.find({ phone: phone }).sort({ created_at: -1 }).limit(20).toArray()
          : Promise.resolve([]),
        appointmentsCol
          ? appointmentsCol.find({ phone: phone }).sort({ created_at: -1 }).limit(20).toArray()
          : Promise.resolve([]),
        leadsCol
          ? leadsCol.findOne({ phone: phone }, { sort: { created_at: -1 } })
          : Promise.resolve(null),
        // call_memory is linked via call_id, not phone; find via the customer's most recent call
        (async () => {
          if (!callMemoryCol) return null;
          const recentCall = callsCol
            ? await callsCol.findOne({ phone_number: phone }, { sort: { created_at: -1 } })
            : null;
          if (!recentCall) return null;
          return callMemoryCol.findOne({ call_id: (recentCall as any).call_id || (recentCall as any)._id?.toString() });
        })(),
      ]);

      return NextResponse.json({
        customer: normalizeDoc(customer),
        calls: (calls || []).map(normalizeDoc),
        quotes: (quotes || []).map(normalizeDoc),
        appointments: (appointments || []).map(normalizeDoc),
        lead: lead ? normalizeDoc(lead) : null,
        callMemory: callMemory ? normalizeDoc(callMemory) : null,
      });
    }

    // SQLite fallback
    const Database = await import('better-sqlite3');
    const db = new (Database.default as any)(dbPath, { readonly: true });

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
    if (!customer) {
      db.close();
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const phone = customer.phone || '';

    let calls: any[] = [];
    let quotes: any[] = [];
    let appointments: any[] = [];
    let lead: any = null;
    let callMemory: any = null;

    try {
      calls = db.prepare("SELECT * FROM calls WHERE phone_number = ? ORDER BY created_at DESC LIMIT 50").all(phone) as any[];
    } catch {}
    try {
      quotes = db.prepare("SELECT * FROM quotes WHERE phone = ? ORDER BY created_at DESC LIMIT 20").all(phone) as any[];
    } catch {}
    try {
      appointments = db.prepare("SELECT * FROM service_bookings WHERE phone = ? ORDER BY created_at DESC LIMIT 20").all(phone) as any[];
    } catch {}
    try {
      lead = db.prepare("SELECT * FROM leads WHERE phone = ? ORDER BY created_at DESC LIMIT 1").get(phone) as any;
    } catch {}
    try {
      // call_memory is linked via calls.call_id, not directly by phone
      const latestCall = db.prepare("SELECT id FROM calls WHERE phone_number = ? ORDER BY created_at DESC LIMIT 1").get(phone) as any;
      if (latestCall) {
        callMemory = db.prepare("SELECT * FROM call_memory WHERE call_id = ? LIMIT 1").get(latestCall.id) as any;
      }
    } catch {}

    db.close();

    return NextResponse.json({
      customer,
      calls,
      quotes,
      appointments,
      lead,
      callMemory,
    });
  } catch (error: any) {
    console.error("Error fetching customer:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
