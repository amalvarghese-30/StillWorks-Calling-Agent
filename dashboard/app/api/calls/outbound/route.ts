import { NextResponse } from 'next/server';
import { agentDispatchClient } from '@/lib/server-utils';
import { getCollection, normalizeDoc } from '../../db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phoneNumber, customerName, language, reason } = body;

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const roomName = `out-${phoneNumber.replace(/\+/g, '')}-${Math.floor(Math.random() * 10000)}`;

    const metadata = JSON.stringify({
      phone_number: phoneNumber,
      call_type: 'manual_outbound',
      language: language || 'ml',
      user_prompt: reason || 'Manual outbound call',
    });

    const dispatch = await agentDispatchClient.createDispatch(
      roomName,
      "manas-agent",
      { metadata }
    );

    // Record the call in the database
    const callRecord = {
      phone_number: phoneNumber,
      customer_name: customerName || null,
      direction: 'outbound',
      call_type: 'manual_outbound',
      status: 'initiated',
      room_name: roomName,
      dispatch_id: dispatch.id,
      language_used: language || 'ml',
      summary: reason || 'Manual outbound call',
      created_at: new Date().toISOString(),
    };

    const callsCol = await getCollection('calls');
    let savedCall: any;
    if (callsCol) {
      const result = await callsCol.insertOne(callRecord);
      savedCall = normalizeDoc({ ...callRecord, _id: result.insertedId });
    } else {
      try {
        const Database = await import('better-sqlite3');
        const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
        const db = new (Database.default as any)(dbPath);
        const info = db.prepare(
          `INSERT INTO calls (phone_number, customer_name, direction, call_type, status, room_name, dispatch_id, language_used, summary, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          callRecord.phone_number,
          callRecord.customer_name,
          callRecord.direction,
          callRecord.call_type,
          callRecord.status,
          callRecord.room_name,
          callRecord.dispatch_id,
          callRecord.language_used,
          callRecord.summary,
          callRecord.created_at,
        );
        savedCall = { ...callRecord, id: info.lastInsertRowid };
        db.close();
      } catch {
        savedCall = callRecord;
      }
    }

    return NextResponse.json({
      success: true,
      roomName,
      dispatchId: dispatch.id,
      call: savedCall,
    });
  } catch (error: any) {
    console.error("Error dispatching outbound call:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
