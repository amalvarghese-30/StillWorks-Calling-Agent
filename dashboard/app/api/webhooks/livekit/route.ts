import { NextResponse } from 'next/server';
import { getCollection } from '../../db';
import crypto from 'crypto';

function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!secret) {
    console.error("LIVEKIT_API_SECRET not configured — rejecting webhook");
    return false;
  }

  const hash = crypto.createHmac('sha256', secret).update(body).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch {
    return false;
  }
}

const EVENT_STATUS_MAP: Record<string, string> = {
  participant_joined: 'answered',
  room_started: 'in_progress',
  room_finished: 'completed',
};

export async function POST(request: Request) {
  // Verify webhook signature before processing
  const rawBody = await request.text();
  const signature = request.headers.get('authorization') || request.headers.get('x-livekit-signature') || '';

  if (!signature) {
    console.warn("Webhook request missing signature header");
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("Webhook signature verification failed");
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  try {
    const body = JSON.parse(rawBody);
    const event = body.event || body.type || 'unknown';
    const roomName = body.room?.name || body.room_name || '';
    const participant = body.participant?.identity || body.participant_identity || '';

    // Log the webhook event
    const webhookCol = await getCollection('webhook_events');
    const eventRecord = {
      event_type: event,
      room_name: roomName,
      participant_identity: participant,
      payload_json: JSON.stringify(body),
      processed: 0,
      created_at: new Date().toISOString(),
    };

    if (webhookCol) {
      await webhookCol.insertOne(eventRecord);
    } else {
      try {
        const Database = await import('better-sqlite3');
        const dbPath = process.env.DATABASE_PATH || '../data/manas_group.db';
        const db = new (Database.default as any)(dbPath);
        db.prepare(
          'INSERT INTO webhook_events (event_type, room_name, participant_identity, payload_json, processed, created_at) VALUES (?, ?, ?, ?, 0, ?)'
        ).run(event, roomName, participant, JSON.stringify(body), new Date().toISOString());
        db.close();
      } catch {}
    }

    // Update call status based on event
    const newStatus = EVENT_STATUS_MAP[event];
    if (newStatus && roomName) {
      const now = new Date().toISOString();

      const callsCol = await getCollection('calls');
      if (callsCol) {
        const updateFields: Record<string, any> = { status: newStatus, updated_at: now };
        await callsCol.updateOne({ room_name: roomName }, { $set: updateFields });
      } else {
        try {
          const Database = await import('better-sqlite3');
          const dbPath = process.env.DATABASE_PATH || '../data/manas_group.db';
          const db = new (Database.default as any)(dbPath);
          db.prepare(
            'UPDATE calls SET status = ?, updated_at = ? WHERE room_name = ?'
          ).run(newStatus, now, roomName);
          db.close();
        } catch {}
      }
    }

    // Handle SIP-specific events
    if (event === 'sip_call_started' || event === 'sip_call_ended') {
      const sipStatus = event === 'sip_call_started' ? 'in_progress' : 'completed';
      const now = new Date().toISOString();

      const callsCol = await getCollection('calls');
      if (callsCol) {
        await callsCol.updateOne(
          { room_name: roomName },
          { $set: { status: sipStatus, updated_at: now } }
        );
      } else {
        try {
          const Database = await import('better-sqlite3');
          const dbPath = process.env.DATABASE_PATH || '../data/manas_group.db';
          const db = new (Database.default as any)(dbPath);
          db.prepare('UPDATE calls SET status = ?, updated_at = ? WHERE room_name = ?')
            .run(sipStatus, now, roomName);
          db.close();
        } catch {}
      }
    }

    // Mark webhook as processed
    if (webhookCol) {
      await webhookCol.updateOne(
        { room_name: roomName, event_type: event },
        { $set: { processed: 1, processed_at: new Date().toISOString() } }
      );
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
