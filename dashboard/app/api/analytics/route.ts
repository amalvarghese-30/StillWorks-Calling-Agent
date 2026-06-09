import { NextResponse } from 'next/server';
import { getCollection } from '../db';

export async function GET() {
  try {
    const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';

    // --- MongoDB path ---
    const callsCol = await getCollection('calls');
    if (callsCol) {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString();

      // Calls per day (last 7 days)
      const recentCalls = await callsCol.find({
        created_at: { $gte: sevenDaysAgo }
      }).toArray();

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const callsPerDay: { day: string; inbound: number; outbound: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayKey = d.toISOString().slice(0, 10);
        const inbound = recentCalls.filter((c: any) =>
          c.created_at?.startsWith(dayKey) && c.direction === 'inbound'
        ).length;
        const outbound = recentCalls.filter((c: any) =>
          c.created_at?.startsWith(dayKey) && c.direction === 'outbound'
        ).length;
        callsPerDay.push({ day: dayNames[d.getDay()], inbound, outbound });
      }

      // Outcome distribution
      const allCalls = await callsCol.find({}).toArray();
      const outcomeMap: Record<string, number> = {};
      allCalls.forEach((c: any) => {
        const o = c.outcome || 'unknown';
        outcomeMap[o] = (outcomeMap[o] || 0) + 1;
      });
      const outcomeDistribution = Object.entries(outcomeMap).map(([name, value]) => ({ name, value }));

      // Agent performance
      const totalCalls = allCalls.length || 1;
      const answered = allCalls.filter((c: any) => c.outcome && c.outcome !== 'no_answer' && c.outcome !== 'hung_up').length;
      const escalated = allCalls.filter((c: any) => c.status === 'transferred' || c.escalation_tier).length;
      const noAnswer = allCalls.filter((c: any) => c.outcome === 'no_answer').length;
      const hungUp = allCalls.filter((c: any) => c.outcome === 'hung_up').length;
      const agentPerformance = [
        { name: 'Answered', value: Math.round((answered / totalCalls) * 100) },
        { name: 'Escalated', value: Math.round((escalated / totalCalls) * 100) },
        { name: 'No Answer', value: Math.round((noAnswer / totalCalls) * 100) },
        { name: 'Hung Up', value: Math.round((hungUp / totalCalls) * 100) },
      ];

      // Lead funnel
      const leadsCol = await getCollection('leads');
      let leadFunnel: { name: string; value: number }[] = [];
      if (leadsCol) {
        const stages = ['new', 'contacted', 'qualified', 'demo_scheduled', 'negotiation', 'won'];
        const stageLabels = ['New', 'Contacted', 'Qualified', 'Demo', 'Negotiation', 'Won'];
        for (let i = 0; i < stages.length; i++) {
          const count = await leadsCol.countDocuments({ status: stages[i] });
          leadFunnel.push({ name: stageLabels[i], value: count });
        }
        const lost = await leadsCol.countDocuments({ status: 'lost' });
        leadFunnel.push({ name: 'Lost', value: lost });
      } else {
        leadFunnel = [
          { name: 'New', value: 0 }, { name: 'Contacted', value: 0 },
          { name: 'Qualified', value: 0 }, { name: 'Demo', value: 0 },
          { name: 'Negotiation', value: 0 }, { name: 'Won', value: 0 },
          { name: 'Lost', value: 0 },
        ];
      }

      // Revenue trend (last 4 weeks from quotes)
      const quotesCol = await getCollection('quotes');
      let revenueTrend: { week: string; revenue: number }[] = [];
      if (quotesCol) {
        for (let i = 3; i >= 0; i--) {
          const wStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString();
          const wEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000).toISOString();
          const accepted = await quotesCol.find({
            status: 'accepted',
            created_at: { $gte: wStart, $lt: wEnd },
          }).toArray();
          const revenue = accepted.reduce((sum: number, q: any) => sum + (q.total_price || 0), 0);
          revenueTrend.push({ week: `W${4 - i}`, revenue });
        }
      }

      // Conversion rate (leads won / total leads closed, per week)
      let conversionRate: { week: string; rate: number }[] = [];
      if (leadsCol) {
        const allLeads = await leadsCol.find({}).toArray();
        for (let i = 3; i >= 0; i--) {
          const wStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString();
          const wEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000).toISOString();
          const weekLeads = allLeads.filter((l: any) =>
            l.created_at >= wStart && l.created_at < wEnd
          );
          const won = weekLeads.filter((l: any) => l.status === 'won').length;
          const closed = weekLeads.filter((l: any) => l.status === 'won' || l.status === 'lost').length;
          conversionRate.push({ week: `W${4 - i}`, rate: closed > 0 ? Math.round((won / closed) * 100) : 0 });
        }
      }

      // Executive metrics
      const monthlyRevenue: { month: string; revenue: number }[] = [];
      if (quotesCol) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let i = 5; i >= 0; i--) {
          const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
          const accepted = await quotesCol.find({
            status: 'accepted',
            created_at: { $gte: m.toISOString(), $lt: mEnd.toISOString() },
          }).toArray();
          const revenue = accepted.reduce((sum: number, q: any) => sum + (q.total_price || 0), 0);
          monthlyRevenue.push({ month: months[m.getMonth()], revenue });
        }
      } else {
        monthlyRevenue.push(
          { month: 'Jan', revenue: 0 }, { month: 'Feb', revenue: 0 },
          { month: 'Mar', revenue: 0 }, { month: 'Apr', revenue: 0 },
          { month: 'May', revenue: 0 }, { month: 'Jun', revenue: 0 },
        );
      }

      // Lead source distribution
      const leadSource: { name: string; value: number }[] = [];
      if (leadsCol) {
        const sourceMap: Record<string, number> = {};
        const allLeadsSrc = await leadsCol.find({}).toArray();
        allLeadsSrc.forEach((l: any) => {
          const src = l.source || 'Inbound Call';
          sourceMap[src] = (sourceMap[src] || 0) + 1;
        });
        for (const [name, value] of Object.entries(sourceMap)) {
          leadSource.push({ name, value });
        }
      }
      if (leadSource.length === 0) {
        leadSource.push(
          { name: 'Inbound Call', value: 0 }, { name: 'Outbound', value: 0 },
          { name: 'Walk-in', value: 0 }, { name: 'Referral', value: 0 },
        );
      }

      // Campaign performance (last 30 days)
      const campaignsCol = await getCollection('campaigns');
      let campaignPerformance: { name: string; calls: number; leads: number; conversion: number }[] = [];
      if (campaignsCol) {
        const recentCampaigns = await campaignsCol.find({
          created_at: { $gte: thirtyDaysAgo }
        }).toArray();
        campaignPerformance = recentCampaigns.map((c: any) => ({
          name: c.name || c.campaign_type || 'Campaign',
          calls: c.total_calls || c.calls_dispatched || 0,
          leads: c.leads_generated || 0,
          conversion: c.total_calls > 0 ? Math.round(((c.leads_generated || 0) / c.total_calls) * 100) : 0,
        }));
      }

      // KPI totals
      let totalRevenue = 0;
      if (quotesCol) {
        const acceptedQuotes = await quotesCol.find({ status: 'accepted' }).toArray();
        totalRevenue = acceptedQuotes.reduce((s: number, q: any) => s + (q.total_price || 0), 0);
      }
      const totalCustomers = (await getCollection('customers'))?.countDocuments() || 0;
      const pipelineValue = leadFunnel.reduce((s, stage) => {
        if (stage.name === 'Lost') return s;
        return s + stage.value * 250000; // rough avg deal size
      }, 0);
      const campaignROI = campaignPerformance.length > 0
        ? (campaignPerformance.reduce((s, c) => s + c.conversion, 0) / campaignPerformance.length).toFixed(1)
        : '0';

      const overallConversionRate = leadFunnel.length > 1
        ? Math.round((leadFunnel.find(s => s.name === 'Won')?.value || 0) /
            Math.max(1, (leadFunnel.find(s => s.name === 'Won')?.value || 0) +
                        (leadFunnel.find(s => s.name === 'Lost')?.value || 0)) * 100)
        : 0;

      return NextResponse.json({
        callsPerDay,
        outcomeDistribution,
        agentPerformance,
        leadFunnel,
        revenueTrend,
        conversionRate,
        // Executive
        monthlyRevenue,
        leadSource,
        campaignPerformance,
        kpis: {
          totalRevenue,
          conversionRate: overallConversionRate,
          pipelineValue,
          totalCalls: allCalls.length,
          campaignROI: parseFloat(campaignROI),
          totalCustomers,
        },
      });
    }

    // --- SQLite path ---
    const Database = await import('better-sqlite3');
    const db = new (Database.default as any)(dbPath, { readonly: true });

    // Calls per day (last 7 days)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const callsPerDay: { day: string; inbound: number; outbound: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayKey = d.toISOString().slice(0, 10);
      const inbound = (db.prepare("SELECT COUNT(*) as c FROM calls WHERE date(created_at) = ? AND direction = 'inbound'").get(dayKey) as any).c || 0;
      const outbound = (db.prepare("SELECT COUNT(*) as c FROM calls WHERE date(created_at) = ? AND direction = 'outbound'").get(dayKey) as any).c || 0;
      callsPerDay.push({ day: dayNames[d.getDay()], inbound, outbound });
    }

    // Outcome distribution
    const outcomeRows = db.prepare("SELECT outcome, COUNT(*) as c FROM calls WHERE outcome IS NOT NULL GROUP BY outcome").all() as any[];
    const outcomeDistribution = outcomeRows.map((r: any) => ({ name: r.outcome, value: r.c }));

    // Agent performance
    const totalCalls = (db.prepare("SELECT COUNT(*) as c FROM calls").get() as any).c || 1;
    const answered = (db.prepare("SELECT COUNT(*) as c FROM calls WHERE outcome NOT IN ('no_answer','hung_up') AND outcome IS NOT NULL").get() as any).c || 0;
    const escalated = (db.prepare("SELECT COUNT(*) as c FROM calls WHERE status = 'transferred' OR escalation_tier IS NOT NULL").get() as any).c || 0;
    const noAnswer = (db.prepare("SELECT COUNT(*) as c FROM calls WHERE outcome = 'no_answer'").get() as any).c || 0;
    const hungUp = (db.prepare("SELECT COUNT(*) as c FROM calls WHERE outcome = 'hung_up'").get() as any).c || 0;
    const agentPerformance = [
      { name: 'Answered', value: Math.round((answered / totalCalls) * 100) },
      { name: 'Escalated', value: Math.round((escalated / totalCalls) * 100) },
      { name: 'No Answer', value: Math.round((noAnswer / totalCalls) * 100) },
      { name: 'Hung Up', value: Math.round((hungUp / totalCalls) * 100) },
    ];

    // Lead funnel
    const stages = ['new', 'contacted', 'qualified', 'demo_scheduled', 'negotiation', 'won', 'lost'];
    const stageLabels = ['New', 'Contacted', 'Qualified', 'Demo', 'Negotiation', 'Won', 'Lost'];
    const leadFunnel: { name: string; value: number }[] = [];
    for (let i = 0; i < stages.length; i++) {
      const count = (db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = ?").get(stages[i]) as any).c || 0;
      leadFunnel.push({ name: stageLabels[i], value: count });
    }

    // Revenue trend (last 4 weeks from quotes)
    const revenueTrend: { week: string; revenue: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const wStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const wEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      try {
        const rev = (db.prepare("SELECT COALESCE(SUM(total_price),0) as r FROM quotes WHERE status = 'accepted' AND date(created_at) >= ? AND date(created_at) < ?").get(wStart, wEnd) as any).r || 0;
        revenueTrend.push({ week: `W${4 - i}`, revenue: rev });
      } catch {
        revenueTrend.push({ week: `W${4 - i}`, revenue: 0 });
      }
    }

    // Conversion rate per week
    const conversionRate: { week: string; rate: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const wStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const wEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const won = (db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'won' AND date(created_at) >= ? AND date(created_at) < ?").get(wStart, wEnd) as any).c || 0;
      const lost = (db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'lost' AND date(created_at) >= ? AND date(created_at) < ?").get(wStart, wEnd) as any).c || 0;
      const closed = won + lost;
      conversionRate.push({ week: `W${4 - i}`, rate: closed > 0 ? Math.round((won / closed) * 100) : 0 });
    }

    // Executive: monthly revenue
    const monthlyRevenue: { month: string; revenue: number }[] = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      try {
        const rev = (db.prepare("SELECT COALESCE(SUM(total_price),0) as r FROM quotes WHERE status = 'accepted' AND created_at >= ? AND created_at < ?").get(m.toISOString(), mEnd.toISOString()) as any).r || 0;
        monthlyRevenue.push({ month: months[m.getMonth()], revenue: rev });
      } catch {
        monthlyRevenue.push({ month: months[m.getMonth()], revenue: 0 });
      }
    }

    // Lead source distribution
    try {
      const sourceRows = db.prepare("SELECT COALESCE(source,'Inbound Call') as src, COUNT(*) as c FROM leads GROUP BY src").all() as any[];
      const leadSource = sourceRows.map((r: any) => ({ name: r.src, value: r.c }));
    } catch {}

    // Campaign performance
    let campaignPerformance: { name: string; calls: number; leads: number; conversion: number }[] = [];
    try {
      const campRows = db.prepare("SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 10").all() as any[];
      campaignPerformance = campRows.map((c: any) => ({
        name: c.name || c.campaign_type || 'Campaign',
        calls: c.total_calls || c.calls_dispatched || 0,
        leads: c.leads_generated || 0,
        conversion: (c.total_calls || 1) > 0 ? Math.round(((c.leads_generated || 0) / (c.total_calls || 1)) * 100) : 0,
      }));
    } catch {}

    // KPI totals
    let totalRevenue = 0;
    try {
      totalRevenue = (db.prepare("SELECT COALESCE(SUM(total_price),0) as r FROM quotes WHERE status = 'accepted'").get() as any).r || 0;
    } catch {}
    const totalCustomers = (db.prepare("SELECT COUNT(*) as c FROM customers").get() as any).c || 0;
    const pipelineValue = leadFunnel.filter(s => s.name !== 'Lost').reduce((s, stage) => s + stage.value * 250000, 0);
    const campaignROI = campaignPerformance.length > 0
      ? (campaignPerformance.reduce((s, c) => s + c.conversion, 0) / campaignPerformance.length).toFixed(1)
      : '0';
    const overallConversionRate = leadFunnel.length > 1
      ? Math.round((leadFunnel.find(s => s.name === 'Won')?.value || 0) /
          Math.max(1, (leadFunnel.find(s => s.name === 'Won')?.value || 0) +
                      (leadFunnel.find(s => s.name === 'Lost')?.value || 0)) * 100)
      : 0;

    db.close();

    const leadSource: { name: string; value: number }[] = [];
    try {
      const db2 = new (Database.default as any)(dbPath, { readonly: true });
      const sourceRows = db2.prepare("SELECT COALESCE(source,'Inbound Call') as src, COUNT(*) as c FROM leads GROUP BY src").all() as any[];
      leadSource.push(...sourceRows.map((r: any) => ({ name: r.src, value: r.c })));
      db2.close();
    } catch {}

    return NextResponse.json({
      callsPerDay,
      outcomeDistribution,
      agentPerformance,
      leadFunnel,
      revenueTrend,
      conversionRate,
      monthlyRevenue,
      leadSource,
      campaignPerformance,
      kpis: {
        totalRevenue,
        conversionRate: overallConversionRate,
        pipelineValue,
        totalCalls,
        campaignROI: parseFloat(campaignROI),
        totalCustomers,
      },
    });
  } catch (error: any) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
