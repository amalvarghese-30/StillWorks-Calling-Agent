import { NextResponse } from 'next/server';
import { getCollection, normalizeDoc } from '../db';

export async function GET() {
  try {
    let campaigns: any[] = [];

    const campaignsCol = await getCollection('campaigns');
    if (campaignsCol) {
      const docs = await campaignsCol
        .find({})
        .sort({ created_at: -1 })
        .limit(50)
        .toArray();
      campaigns = docs.map(normalizeDoc);
    } else {
      const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
      try {
        const Database = await import('better-sqlite3');
        const db = new (Database.default as any)(dbPath, { readonly: true });

        campaigns = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 50').all() as any[];
        db.close();
      } catch {
        campaigns = [];
      }
    }

    // Compute aggregate performance
    const totalCampaigns = campaigns.length;
    const totalCalls = campaigns.reduce((sum: number, c: any) => sum + (c.total_calls || c.calls_dispatched || 0), 0);
    const totalLeads = campaigns.reduce((sum: number, c: any) => sum + (c.leads_generated || 0), 0);
    const answeredRate = totalCalls > 0
      ? Math.round((campaigns.reduce((sum: number, c: any) => sum + (c.answered_calls || c.answered || 0), 0) / totalCalls) * 100)
      : 0;

    return NextResponse.json({
      campaigns,
      performance: {
        totalCampaigns,
        callsDispatched: totalCalls,
        answeredRate,
        leadsGenerated: totalLeads,
      },
    });
  } catch (error: any) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json({ campaigns: [], performance: { totalCampaigns: 0, callsDispatched: 0, answeredRate: 0, leadsGenerated: 0 } });
  }
}
