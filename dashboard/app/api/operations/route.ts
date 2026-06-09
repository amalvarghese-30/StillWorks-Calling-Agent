import { NextResponse } from 'next/server';
import { getCollection } from '../db';

export async function GET() {
  try {
    const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';

    const Database = await import('better-sqlite3');
    const db = new (Database.default as any)(dbPath, { readonly: true });

    // Call metrics
    const totalCalls = (db.prepare('SELECT COUNT(*) as c FROM calls').get() as any)?.c || 0;
    const inboundCalls = (db.prepare("SELECT COUNT(*) as c FROM calls WHERE direction = 'inbound'").get() as any)?.c || 0;
    const outboundCalls = (db.prepare("SELECT COUNT(*) as c FROM calls WHERE direction = 'outbound'").get() as any)?.c || 0;
    const answeredCalls = (db.prepare("SELECT COUNT(*) as c FROM calls WHERE status IN ('completed','answered')").get() as any)?.c || 0;
    const transferredCalls = (db.prepare("SELECT COUNT(*) as c FROM calls WHERE status = 'transferred' OR outcome = 'transferred'").get() as any)?.c || 0;
    const failedCalls = (db.prepare("SELECT COUNT(*) as c FROM calls WHERE status IN ('failed','no_answer')").get() as any)?.c || 0;
    const avgDuration = (db.prepare('SELECT AVG(duration_seconds) as a FROM calls WHERE duration_seconds > 0').get() as any)?.a || 0;

    // Today's metrics
    const today = new Date().toISOString().slice(0, 10);
    const todayCalls = (db.prepare("SELECT COUNT(*) as c FROM calls WHERE date(created_at) = ?").get(today) as any)?.c || 0;
    const todayInbound = (db.prepare("SELECT COUNT(*) as c FROM calls WHERE direction = 'inbound' AND date(created_at) = ?").get(today) as any)?.c || 0;

    // Quote metrics
    const totalQuotes = (db.prepare('SELECT COUNT(*) as c FROM quotes').get() as any)?.c || 0;
    const acceptedQuotes = (db.prepare("SELECT COUNT(*) as c FROM quotes WHERE status = 'accepted'").get() as any)?.c || 0;

    // Lead metrics
    const totalLeads = (db.prepare('SELECT COUNT(*) as c FROM leads').get() as any)?.c || 0;
    const qualifiedLeads = (db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'qualified'").get() as any)?.c || 0;

    // Campaign metrics
    const totalCampaigns = (db.prepare('SELECT COUNT(*) as c FROM campaigns').get() as any)?.c || 0;
    const activeCampaigns = (db.prepare("SELECT COUNT(*) as c FROM campaigns WHERE status = 'running'").get() as any)?.c || 0;

    // Webhook metrics
    let webhookEvents = 0;
    let webhookFailures = 0;
    try {
      webhookEvents = (db.prepare('SELECT COUNT(*) as c FROM webhook_events').get() as any)?.c || 0;
      webhookFailures = (db.prepare('SELECT COUNT(*) as c FROM webhook_events WHERE processed = 0').get() as any)?.c || 0;
    } catch {}

    // Escalation metrics
    let totalEscalations = 0;
    try {
      totalEscalations = (db.prepare('SELECT COUNT(*) as c FROM escalations').get() as any)?.c || 0;
    } catch {}

    db.close();

    const answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;
    const transferRate = totalCalls > 0 ? Math.round((transferredCalls / totalCalls) * 100) : 0;
    const failureRate = totalCalls > 0 ? Math.round((failedCalls / totalCalls) * 100) : 0;
    const quoteConversionRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;
    const leadQualificationRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

    return NextResponse.json({
      calls: {
        total: totalCalls,
        inbound: inboundCalls,
        outbound: outboundCalls,
        today: todayCalls,
        todayInbound,
        answered: answeredCalls,
        transferred: transferredCalls,
        failed: failedCalls,
        answerRate,
        transferRate,
        failureRate,
        avgDuration: Math.round(avgDuration),
      },
      quotes: { total: totalQuotes, accepted: acceptedQuotes, conversionRate: quoteConversionRate },
      leads: { total: totalLeads, qualified: qualifiedLeads, qualificationRate: leadQualificationRate },
      campaigns: { total: totalCampaigns, active: activeCampaigns },
      escalations: { total: totalEscalations },
      webhooks: { total: webhookEvents, failures: webhookFailures },
      system: {
        dbBackend: process.env.DB_BACKEND || 'sqlite',
        llmProvider: process.env.LLM_PROVIDER || 'groq',
        ttsProvider: process.env.TTS_PROVIDER || 'deepgram',
        sttProvider: process.env.DEEPGRAM_STT_MODEL ? 'deepgram' : 'unknown',
      },
    });
  } catch (error: any) {
    console.error("Error fetching operations:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
