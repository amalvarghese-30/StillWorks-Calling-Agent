import { NextResponse } from 'next/server';
import { getCollection, normalizeDoc } from '../../db';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const campaignName = (formData.get('name') as string) || 'CSV Campaign';
    const campaignType = (formData.get('campaignType') as string) || 'csv_upload';
    const language = (formData.get('language') as string) || 'ml';
    const prompt = (formData.get('prompt') as string) || '';

    if (!file) {
      return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const dataRows = lines.slice(1);

    const entries: Array<{
      phone: string;
      customer_name: string;
      language: string;
      reason: string;
    }> = [];
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < dataRows.length; i++) {
      const values = dataRows[i].split(',').map(v => v.trim());
      const phoneIdx = headers.indexOf('phone');
      const nameIdx = headers.indexOf('name');
      const langIdx = headers.indexOf('language');
      const reasonIdx = headers.indexOf('reason');

      const phone = phoneIdx >= 0 ? values[phoneIdx] : '';
      const name = nameIdx >= 0 ? values[nameIdx] : '';
      const lang = langIdx >= 0 ? values[langIdx] : language;
      const reason = reasonIdx >= 0 ? values[reasonIdx] : '';

      if (!phone) {
        errors.push({ row: i + 2, error: 'Phone number is required' });
        continue;
      }

      entries.push({
        phone,
        customer_name: name,
        language: lang || language,
        reason: reason || 'Campaign call',
      });
    }

    if (entries.length === 0) {
      return NextResponse.json({ error: "No valid entries found in CSV", validationErrors: errors }, { status: 400 });
    }

    // Create campaign
    const now = new Date().toISOString();
    const campaignRecord = {
      campaign_type: campaignType,
      name: `${campaignName} — ${now.slice(0, 10)}`,
      language,
      prompt,
      numbers_count: entries.length,
      calls_dispatched: 0,
      answered_calls: 0,
      leads_generated: 0,
      total_calls: entries.length,
      processed_count: 0,
      no_answer_count: 0,
      escalated_count: 0,
      appointments_created: 0,
      status: 'draft',
      csv_filename: file.name || 'upload.csv',
      created_at: now,
    };

    const campaignsCol = await getCollection('campaigns');
    let campaignId: string;

    if (campaignsCol) {
      const result = await campaignsCol.insertOne(campaignRecord);
      campaignId = result.insertedId.toString();

      // Insert campaign calls
      const campaignCallsCol = await getCollection('campaign_calls');
      if (campaignCallsCol) {
        const callDocs = entries.map(e => ({
          campaign_id: campaignId,
          phone: e.phone,
          customer_name: e.customer_name,
          language: e.language,
          reason: e.reason,
          status: 'pending',
          created_at: now,
        }));
        await campaignCallsCol.insertMany(callDocs);
      }
    } else {
      const Database = await import('better-sqlite3');
      const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
      const db = new (Database.default as any)(dbPath);

      const info = db.prepare(
        `INSERT INTO campaigns (campaign_type, name, language, prompt, numbers_count, total_calls, status, csv_filename, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(campaignType, campaignRecord.name, language, prompt, entries.length, entries.length, 'draft', file.name, now);
      campaignId = info.lastInsertRowid.toString();

      // Insert campaign calls
      const insertStmt = db.prepare(
        'INSERT INTO campaign_calls (campaign_id, phone, customer_name, language, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      const insertMany = db.transaction((items: any[]) => {
        for (const e of items) {
          insertStmt.run(campaignId, e.phone, e.customer_name, e.language, e.reason, 'pending', now);
        }
      });
      insertMany(entries as any);
      db.close();
    }

    return NextResponse.json({
      success: true,
      campaign: { ...campaignRecord, id: campaignId },
      entriesCount: entries.length,
      validationErrors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Error uploading campaign CSV:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
