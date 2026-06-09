import { NextResponse } from 'next/server';
import { getCollection } from '../db';

function expandRecurrence(recurrenceRule: string): Date | null {
  if (!recurrenceRule) return null;
  const parts = recurrenceRule.split(' ');
  if (parts.length < 1) return null;

  const now = new Date();
  const interval = parts[0].toLowerCase();

  switch (interval) {
    case 'hourly': {
      const next = new Date(now);
      next.setHours(next.getHours() + 1, 0, 0, 0);
      return next;
    }
    case 'daily': {
      const hour = parseInt(parts[1]) || 9;
      const next = new Date(now);
      next.setHours(hour, 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      return next;
    }
    case 'weekly': {
      const days: Record<string, number> = {
        sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
      };
      const targetDay = days[parts[1]?.toLowerCase()] ?? 1;
      const hour = parseInt(parts[2]) || 9;
      const next = new Date(now);
      next.setHours(hour, 0, 0, 0);
      const currentDay = next.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      next.setDate(next.getDate() + daysUntil);
      return next;
    }
    case 'monthly': {
      const dayOfMonth = parseInt(parts[1]) || 1;
      const hour = parseInt(parts[2]) || 9;
      const next = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, hour, 0, 0);
      if (next <= now) next.setMonth(next.getMonth() + 1);
      return next;
    }
    default:
      return null;
  }
}

export async function GET() {
  try {
    const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
    const Database = await import('better-sqlite3');
    const db = new (Database.default as any)(dbPath, { readonly: true });

    const scheduledCampaigns = db.prepare(
      "SELECT * FROM campaigns WHERE status = 'scheduled' AND scheduled_at IS NOT NULL ORDER BY scheduled_at ASC"
    ).all() as any[];

    db.close();

    const now = new Date();
    const due: any[] = [];
    const upcoming: any[] = [];

    for (const c of scheduledCampaigns) {
      const scheduledAt = new Date(c.scheduled_at);
      if (scheduledAt <= now) {
        due.push({ id: c.id, campaign_id: c.campaign_id, name: c.name, scheduled_at: c.scheduled_at, csv_filename: c.csv_filename });
      } else {
        upcoming.push({ id: c.id, campaign_id: c.campaign_id, name: c.name, scheduled_at: c.scheduled_at });
      }
    }

    return NextResponse.json({
      due,
      upcoming,
      count: { due: due.length, upcoming: upcoming.length },
      checkedAt: now.toISOString(),
    });
  } catch (error: any) {
    console.error("Error checking scheduler:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, campaign_id } = body;

    if (action === 'check') {
      // Check scheduled campaigns and dispatch due ones
      const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
      const Database = await import('better-sqlite3');
      const db = new (Database.default as any)(dbPath);

      const dueCampaigns = db.prepare(
        "SELECT * FROM campaigns WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND datetime(scheduled_at) <= datetime('now')"
      ).all() as any[];

      let dispatched = 0;
      let failed = 0;
      const results: any[] = [];

      for (const campaign of dueCampaigns) {
        try {
          // Start the campaign
          db.prepare(
            "UPDATE campaigns SET status = 'running', started_at = ? WHERE id = ?"
          ).run(new Date().toISOString(), campaign.id);

          // Get pending campaign calls
          const pendingCalls = db.prepare(
            "SELECT * FROM campaign_calls WHERE campaign_id = ? AND status = 'pending'"
          ).all(campaign.id) as any[];

          // Try LiveKit dispatch
          const livekitUrl = process.env.LIVEKIT_URL || '';
          const apiKey = process.env.LIVEKIT_API_KEY || '';
          const apiSecret = process.env.LIVEKIT_API_SECRET || '';

          if (livekitUrl && apiKey && apiSecret) {
            for (const cc of pendingCalls) {
              try {
                const roomName = `campaign-${campaign.id}-${cc.id}-${Date.now()}`;
                const dispatchBody = {
                  room: roomName,
                  agentName: "manas-agent",
                  metadata: JSON.stringify({
                    call_id: cc.id,
                    campaign_id: campaign.id,
                    customer_name: cc.customer_name,
                    phone: cc.customer_phone,
                    language: cc.language || 'ml',
                    reason: cc.reason || campaign.reason || 'campaign_call',
                    customer_id: cc.customer_id || '',
                  }),
                };

                const token = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
                const res = await fetch(`${livekitUrl}/twirp/livekit.AgentDispatchService/CreateDispatch`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${token}`,
                  },
                  body: JSON.stringify(dispatchBody),
                });

                if (res.ok) {
                  db.prepare(
                    "UPDATE campaign_calls SET status = 'initiated', dispatched_at = ? WHERE id = ?"
                  ).run(new Date().toISOString(), cc.id);
                  dispatched++;
                } else {
                  db.prepare(
                    "UPDATE campaign_calls SET status = 'failed', error_message = ? WHERE id = ?"
                  ).run(`LiveKit dispatch failed: ${res.status}`, cc.id);
                  failed++;
                }
              } catch (e: any) {
                db.prepare(
                  "UPDATE campaign_calls SET status = 'failed', error_message = ? WHERE id = ?"
                ).run(e.message, cc.id);
                failed++;
              }
            }
          }

          // Update campaign counters
          db.prepare(
            "UPDATE campaigns SET processed_count = ?, no_answer_count = ? WHERE id = ?"
          ).run(dispatched, failed, campaign.id);

          results.push({
            campaign_id: campaign.campaign_id || campaign.id,
            name: campaign.name,
            dispatched,
            failed,
            total: pendingCalls.length,
          });
        } catch (e: any) {
          failed++;
          results.push({
            campaign_id: campaign.campaign_id || campaign.id,
            name: campaign.name,
            error: e.message,
          });
        }
      }

      db.close();

      return NextResponse.json({
        processed: dueCampaigns.length,
        results,
        summary: { dispatched, failed },
      });
    }

    if (action === 'schedule' && campaign_id) {
      const { scheduled_at, recurrence_rule } = body;
      if (!scheduled_at) {
        return NextResponse.json({ error: 'scheduled_at required' }, { status: 400 });
      }

      const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
      const Database = await import('better-sqlite3');
      const db = new (Database.default as any)(dbPath);

      db.prepare(
        "UPDATE campaigns SET status = 'scheduled', scheduled_at = ?, recurrence_rule = ? WHERE id = ? OR campaign_id = ?"
      ).run(scheduled_at, recurrence_rule || null, campaign_id, campaign_id);

      const nextRun = recurrence_rule ? expandRecurrence(recurrence_rule) : null;

      db.close();

      return NextResponse.json({
        scheduled: true,
        campaign_id,
        scheduled_at,
        recurrence_rule: recurrence_rule || null,
        next_run: nextRun?.toISOString() || null,
      });
    }

    if (action === 'reschedule' && campaign_id) {
      const nextDate = expandRecurrence(body.recurrence_rule || '');
      if (!nextDate) {
        return NextResponse.json({ error: 'Invalid recurrence rule' }, { status: 400 });
      }

      const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
      const Database = await import('better-sqlite3');
      const db = new (Database.default as any)(dbPath);

      db.prepare(
        "UPDATE campaigns SET status = 'scheduled', scheduled_at = ?, completed_at = NULL WHERE id = ? OR campaign_id = ?"
      ).run(nextDate.toISOString(), campaign_id, campaign_id);

      db.close();

      return NextResponse.json({
        rescheduled: true,
        campaign_id,
        next_run: nextDate.toISOString(),
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use check, schedule, or reschedule.' }, { status: 400 });
  } catch (error: any) {
    console.error("Error in scheduler:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
