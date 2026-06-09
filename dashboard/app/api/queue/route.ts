import { NextResponse } from 'next/server';
import { agentDispatchClient } from '@/lib/server-utils';
import { getCollection } from '../db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { numbers, prompt, campaignType, language } = body;

        if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
            return NextResponse.json({ error: "List of phone numbers is required" }, { status: 400 });
        }

        const results = [];
        let dispatchedCount = 0;

        for (const phoneNumber of numbers) {
            try {
                const roomName = `out-${phoneNumber.replace(/\+/g, '')}-${Math.floor(Math.random() * 10000)}`;

                const metadata = JSON.stringify({
                    phone_number: phoneNumber,
                    call_type: campaignType || 'follow_up',
                    language: language || 'ml',
                    user_prompt: prompt || '',
                });

                const dispatch = await agentDispatchClient.createDispatch(
                    roomName,
                    "manas-agent",
                    { metadata }
                );

                results.push({ phoneNumber, status: 'dispatched', id: dispatch.id });
                dispatchedCount++;

                // Rate limiting delay
                await new Promise(r => setTimeout(r, 200));

            } catch (e: any) {
                console.error(`Failed to dispatch ${phoneNumber}:`, e);
                results.push({ phoneNumber, status: 'failed', error: e.message });
            }
        }

        // Record the campaign in the database
        const campaignsCol = await getCollection('campaigns');
        const campaignName = `${campaignType || 'follow_up'} — ${new Date().toISOString().slice(0, 10)}`;
        let campaignId = 'local';

        if (campaignsCol) {
            const result = await campaignsCol.insertOne({
                campaign_type: campaignType || 'follow_up',
                name: campaignName,
                language: language || 'ml',
                prompt: prompt || '',
                numbers_count: numbers.length,
                calls_dispatched: dispatchedCount,
                answered_calls: 0,
                leads_generated: 0,
                total_calls: dispatchedCount,
                processed_count: dispatchedCount,
                no_answer_count: 0,
                escalated_count: 0,
                appointments_created: 0,
                status: 'completed',
                created_at: new Date().toISOString(),
            });
            campaignId = result.insertedId.toString();

            // Insert campaign_calls for each result
            const campaignCallsCol = await getCollection('campaign_calls');
            if (campaignCallsCol) {
                const now = new Date().toISOString();
                const callDocs = results.map((r: any) => ({
                    campaign_id: campaignId,
                    phone: r.phoneNumber,
                    customer_name: null,
                    language: language || 'ml',
                    reason: prompt || '',
                    status: r.status === 'dispatched' ? 'completed' : 'failed',
                    call_id: r.id || null,
                    attempt_count: 1,
                    created_at: now,
                    last_attempt_at: now,
                }));
                await campaignCallsCol.insertMany(callDocs);
            }
        } else {
            // SQLite path
            try {
                const dbPath = process.env.DATABASE_PATH || '../data/manas_group.db';
                const Database = await import('better-sqlite3');
                const db = new (Database.default as any)(dbPath);
                const info = db.prepare(
                    `INSERT INTO campaigns (campaign_type, name, language, prompt, numbers_count, calls_dispatched, total_calls, processed_count, status, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).run(
                    campaignType || 'follow_up',
                    campaignName,
                    language || 'ml',
                    prompt || '',
                    numbers.length,
                    dispatchedCount,
                    dispatchedCount,
                    dispatchedCount,
                    'completed',
                    new Date().toISOString()
                );
                campaignId = info.lastInsertRowid.toString();

                // Insert campaign_calls
                const now = new Date().toISOString();
                const insertStmt = db.prepare(
                    'INSERT INTO campaign_calls (campaign_id, phone, customer_name, language, reason, status, call_id, attempt_count, created_at, last_attempt_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
                );
                const bulkInsert = db.transaction((items: any[]) => {
                    for (const r of items) {
                        insertStmt.run(
                            campaignId,
                            r.phoneNumber,
                            null,
                            language || 'ml',
                            prompt || '',
                            r.status === 'dispatched' ? 'completed' : 'failed',
                            r.id || null,
                            1,
                            now,
                            now,
                        );
                    }
                });
                bulkInsert(results as any);
                db.close();
            } catch {}
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${numbers.length} numbers`,
            campaignType: campaignType || 'follow_up',
            campaignId,
            results,
        });

    } catch (error: any) {
        console.error("Queue error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
