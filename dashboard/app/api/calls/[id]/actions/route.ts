import { NextResponse } from 'next/server';
import { getCollection, normalizeDoc } from '../../../db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const actionType = body.action || 'auto';

  try {
    const callsCol = await getCollection('calls');
    let call: any = null;

    if (callsCol) {
      const { ObjectId } = await import('mongodb');
      try { call = await callsCol.findOne({ _id: new ObjectId(id) }); } catch {
        call = await callsCol.findOne({ call_id: id });
      }
      if (!call) return NextResponse.json({ error: 'Call not found' }, { status: 404 });
      call = normalizeDoc(call);
    } else {
      const Database = await import('better-sqlite3');
      const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
      const db = new (Database.default as any)(dbPath, { readonly: true });
      call = db.prepare('SELECT * FROM calls WHERE id = ?').get(id) as any;
      if (!call) call = db.prepare('SELECT * FROM calls WHERE call_id = ?').get(id) as any;
      db.close();
      if (!call) return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    const phone = call.phone_number || '';
    const outcome = call.outcome || 'completed';
    const results: string[] = [];

    // Auto-generate quote if purchase intent detected
    if (outcome === 'inquiry' || outcome === 'lead_created' || actionType === 'generate_quote') {
      const quotesCol = await getCollection('quotes');
      const quoteId = `QTE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      const now = new Date().toISOString();
      const validUntil = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();

      const quoteRecord = {
        quote_id: quoteId,
        call_id: call.call_id || call.id,
        customer_name: call.customer_name || 'Customer',
        phone,
        brand: 'John Deere',
        model: '5050D',
        ex_showroom_price: 680000,
        total_price: 785000,
        financing_options_json: JSON.stringify({ emi_3yr: 24500, emi_5yr: 15800 }),
        valid_until: validUntil,
        status: 'draft',
        created_at: now,
      };

      if (quotesCol) {
        await quotesCol.insertOne(quoteRecord);
      } else {
        try {
          const Database = await import('better-sqlite3');
          const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
          const db = new (Database.default as any)(dbPath);
          db.prepare(
            `INSERT INTO quotes (quote_id, call_id, customer_name, phone, brand, model, ex_showroom_price, total_price, financing_options_json, valid_until, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(quoteId, quoteRecord.call_id, quoteRecord.customer_name, phone, 'John Deere', '5050D', 680000, 785000, quoteRecord.financing_options_json, validUntil, 'draft', now);
          db.close();
        } catch {}
      }
      results.push('quote_generated');
    }

    // Auto-create appointment if service/demo requested
    if (outcome === 'service' || outcome === 'demo_requested' || actionType === 'book_appointment') {
      const appointmentsCol = await getCollection('appointments');
      const bookingRef = `SRV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      const now = new Date().toISOString();
      const apptDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const appointmentRecord = {
        booking_ref: bookingRef,
        customer_name: call.customer_name || 'Customer',
        phone,
        model: 'John Deere 5050D',
        issue_description: outcome === 'service' ? 'Service requested via AI call' : 'Demo requested via AI call',
        service_type: outcome === 'service' ? 'repair' : 'demo',
        preferred_date: apptDate,
        time_slot: 'morning',
        location: call.customer_name ? 'Auto-scheduled' : 'Palakkad',
        status: 'confirmed',
        created_at: now,
      };

      if (appointmentsCol) {
        await appointmentsCol.insertOne(appointmentRecord);
      } else {
        try {
          const Database = await import('better-sqlite3');
          const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
          const db = new (Database.default as any)(dbPath);
          db.prepare(
            `INSERT INTO service_bookings (booking_ref, customer_name, phone, model, issue_description, service_type, preferred_date, time_slot, location, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(bookingRef, appointmentRecord.customer_name, phone, 'John Deere 5050D', appointmentRecord.issue_description, appointmentRecord.service_type, apptDate, 'morning', appointmentRecord.location, 'confirmed', now);
          db.close();
        } catch {}
      }
      results.push('appointment_created');
    }

    return NextResponse.json({
      success: true,
      callId: call.id,
      actions: results,
      message: results.length > 0 ? `Executed: ${results.join(', ')}` : 'No actions triggered',
    });
  } catch (error: any) {
    console.error("Error executing actions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
