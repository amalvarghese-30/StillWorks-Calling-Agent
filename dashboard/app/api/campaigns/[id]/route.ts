import { NextResponse } from 'next/server';
import { getCollection, normalizeDoc } from '../../db';
import { agentDispatchClient } from '@/lib/server-utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const campaignsCol = await getCollection('campaigns');
    let campaign: any = null;

    if (campaignsCol) {
      const { ObjectId } = await import('mongodb');
      try {
        campaign = await campaignsCol.findOne({ _id: new ObjectId(id) });
      } catch {
        campaign = null;
      }
      if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }
      campaign = normalizeDoc(campaign);

      const campaignCallsCol = await getCollection('campaign_calls');
      const calls = campaignCallsCol
        ? await campaignCallsCol.find({ campaign_id: id }).sort({ created_at: -1 }).toArray()
        : [];

      return NextResponse.json({
        campaign,
        calls: calls.map(normalizeDoc),
      });
    }

    // SQLite fallback
    const Database = await import('better-sqlite3');
    const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
    const db = new (Database.default as any)(dbPath, { readonly: true });

    campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as any;
    if (!campaign) {
      db.close();
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    let campaignCalls: any[] = [];
    try {
      campaignCalls = db.prepare('SELECT * FROM campaign_calls WHERE campaign_id = ? ORDER BY created_at DESC').all(id) as any[];
    } catch {}

    db.close();

    return NextResponse.json({
      campaign,
      calls: campaignCalls,
    });
  } catch (error: any) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { status } = body;

    const validStatuses = ['draft', 'scheduled', 'running', 'paused', 'completed', 'failed'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updateFields: Record<string, any> = { status };
    if (status === 'running') updateFields.started_at = now;
    if (status === 'paused') updateFields.paused_at = now;
    if (status === 'completed' || status === 'failed') updateFields.completed_at = now;

    const campaignsCol = await getCollection('campaigns');
    if (campaignsCol) {
      const { ObjectId } = await import('mongodb');
      let filter: any;
      try { filter = { _id: new ObjectId(id) }; } catch { filter = { _id: id }; }

      // Fetch campaign for metadata before execution
      const campaign = await campaignsCol.findOne(filter);
      if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }

      // If starting the campaign, execute pending calls
      if (status === 'running' && campaign.status !== 'running') {
        const campaignCallsCol = await getCollection('campaign_calls');
        const pendingCalls = campaignCallsCol
          ? await campaignCallsCol.find({ campaign_id: id, status: 'pending' }).toArray()
          : [];

        if (pendingCalls.length > 0) {
          const campaignPrompt = (campaign as any).prompt || '';
          const campaignLanguage = (campaign as any).language || 'ml';
          const campaignType = (campaign as any).campaign_type || 'follow_up';

          let dispatched = 0;
          let failed = 0;
          const callUpdates: Array<{ filter: any; update: any }> = [];

          for (const cc of pendingCalls) {
            try {
              const phone = (cc as any).phone;
              const roomName = `out-${phone.replace(/\+/g, '')}-${Math.floor(Math.random() * 10000)}`;

              const metadata = JSON.stringify({
                phone_number: phone,
                call_type: campaignType,
                language: campaignLanguage,
                user_prompt: campaignPrompt,
              });

              const dispatch = await agentDispatchClient.createDispatch(
                roomName,
                "manas-agent",
                { metadata }
              );

              callUpdates.push({
                filter: { _id: cc._id },
                update: {
                  $set: {
                    status: 'completed',
                    call_id: dispatch.id,
                    last_attempt_at: now,
                  },
                },
              });
              dispatched++;

              // Rate limiting between calls
              await new Promise(r => setTimeout(r, 200));
            } catch (e: any) {
              console.error(`Failed to dispatch campaign call ${(cc as any).phone}:`, e.message);
              callUpdates.push({
                filter: { _id: cc._id },
                update: {
                  $set: {
                    status: 'failed',
                    last_attempt_at: now,
                  },
                  $inc: { attempt_count: 1 },
                },
              });
              failed++;
            }
          }

          // Bulk-write campaign_calls updates
          if (callUpdates.length > 0 && campaignCallsCol) {
            const bulkOps = callUpdates.map(u => ({ updateOne: u }));
            await campaignCallsCol.bulkWrite(bulkOps);
          }

          // Update campaign counters
          const currentProcessed = (campaign as any).processed_count || 0;
          const currentDispatched = (campaign as any).calls_dispatched || 0;
          updateFields.processed_count = currentProcessed + dispatched + failed;
          updateFields.calls_dispatched = currentDispatched + dispatched;
          updateFields.no_answer_count = (campaign as any).no_answer_count || 0;
          (updateFields as any)._execResult = { dispatched, failed, total: pendingCalls.length };
        }
      }

      const execResult = (updateFields as any)._execResult;
      delete (updateFields as any)._execResult;

      await campaignsCol.updateOne(filter, { $set: updateFields });
      const updated = await campaignsCol.findOne(filter);
      return NextResponse.json({
        campaign: updated ? normalizeDoc(updated) : null,
        execution: execResult || null,
      });
    }

    // ── SQLite path ──
    const Database = await import('better-sqlite3');
    const dbPath = process.env.DATABASE_PATH || '../data/manas_group.db';
    const db = new (Database.default as any)(dbPath);

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as any;
    if (!campaign) {
      db.close();
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // If starting the campaign, execute pending campaign_calls
    if (status === 'running' && campaign.status !== 'running') {
      let pendingCalls: any[] = [];
      try {
        pendingCalls = db.prepare(
          "SELECT * FROM campaign_calls WHERE campaign_id = ? AND status = 'pending'"
        ).all(id) as any[];
      } catch {}

      if (pendingCalls.length > 0) {
        const campaignPrompt = campaign.prompt || '';
        const campaignLanguage = campaign.language || 'ml';
        const campaignType = campaign.campaign_type || 'follow_up';

        let dispatched = 0;
        let failed = 0;

        const updateStmt = db.prepare(
          'UPDATE campaign_calls SET status = ?, call_id = ?, last_attempt_at = ?, attempt_count = attempt_count + 1 WHERE id = ?'
        );
        const failStmt = db.prepare(
          'UPDATE campaign_calls SET status = ?, last_attempt_at = ?, attempt_count = attempt_count + 1 WHERE id = ?'
        );

        for (const cc of pendingCalls) {
          try {
            const phone = cc.phone;
            const roomName = `out-${phone.replace(/\+/g, '')}-${Math.floor(Math.random() * 10000)}`;

            const metadata = JSON.stringify({
              phone_number: phone,
              call_type: campaignType,
              language: campaignLanguage,
              user_prompt: campaignPrompt,
            });

            const dispatch = await agentDispatchClient.createDispatch(
              roomName,
              "manas-agent",
              { metadata }
            );

            updateStmt.run('completed', dispatch.id, now, cc.id);
            dispatched++;
            await new Promise(r => setTimeout(r, 200));
          } catch (e: any) {
            console.error(`Failed to dispatch campaign call ${cc.phone}:`, e.message);
            failStmt.run('failed', now, cc.id);
            failed++;
          }
        }

        const processed = dispatched + failed;
        updateFields.processed_count = (campaign.processed_count || 0) + processed;
        updateFields.calls_dispatched = (campaign.calls_dispatched || 0) + dispatched;
        (updateFields as any)._execResult = { dispatched, failed, total: pendingCalls.length };
      }
    }

    const execResult = (updateFields as any)._execResult;
    delete (updateFields as any)._execResult;

    const setClauses = Object.keys(updateFields).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updateFields);
    db.prepare(`UPDATE campaigns SET ${setClauses} WHERE id = ?`).run(...values, id);

    const updated = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as any;
    db.close();

    return NextResponse.json({ campaign: updated, execution: execResult || null });
  } catch (error: any) {
    console.error("Error updating campaign:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
