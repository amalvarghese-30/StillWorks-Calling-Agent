import { NextResponse } from 'next/server';
import { getCollection, normalizeDoc } from '../../../db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const callsCol = await getCollection('calls');
    let call: any = null;
    let callMemory: any = null;

    if (callsCol) {
      const { ObjectId } = await import('mongodb');
      try { call = await callsCol.findOne({ _id: new ObjectId(id) }); } catch {
        call = await callsCol.findOne({ call_id: id });
      }
      if (!call) return NextResponse.json({ error: 'Call not found' }, { status: 404 });
      call = normalizeDoc(call);

      const callMemoryCol = await getCollection('call_memory');
      const callIdStr = call.call_id || call.id;
      callMemory = callMemoryCol
        ? await callMemoryCol.findOne({ call_id: callIdStr })
        : null;
      if (callMemory) callMemory = normalizeDoc(callMemory);
    } else {
      const Database = await import('better-sqlite3');
      const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
      const db = new (Database.default as any)(dbPath, { readonly: true });

      call = db.prepare('SELECT * FROM calls WHERE id = ?').get(id) as any;
      if (!call) {
        call = db.prepare('SELECT * FROM calls WHERE call_id = ?').get(id) as any;
      }
      if (!call) {
        db.close();
        return NextResponse.json({ error: 'Call not found' }, { status: 404 });
      }

      const callIdStr = call.call_id || call.id?.toString();
      callMemory = db.prepare('SELECT * FROM call_memory WHERE call_id = ? LIMIT 1').get(callIdStr) as any;
      db.close();
    }

    // Compute insights from call data
    const leadScore = callMemory?.lead_score || call?.lead_score || 0;
    const outcome = callMemory?.outcome || call?.outcome || 'unknown';
    const summary = callMemory?.summary || call?.summary || '';
    const transcript = callMemory?.transcript || '';
    const sentiment = call?.sentiment || 'neutral';

    // Score breakdown (factors contributing to lead score)
    const scoreFactors = {
      engagement: Math.min(100, Math.round((call?.duration_seconds || 0) / 3)),
      intent_clarity: outcome === 'inquiry' || outcome === 'lead_created' ? 80 : 40,
      budget_mentioned: /budget|price|cost|EMI|finance/i.test(summary + transcript) ? 75 : 30,
      timeline_urgency: /urgent|immediately|this week|ASAP/i.test(summary + transcript) ? 85 : 40,
      competitor_mention: /Mahindra|Sonalika|Eicher|Kubota|New Holland/i.test(summary + transcript) ? 25 : 60,
    };

    // Purchase probability
    const probabilityScore = Object.values(scoreFactors).reduce((a, b) => a + b, 0) / Object.keys(scoreFactors).length;
    let purchaseProbability: string;
    if (probabilityScore >= 70) purchaseProbability = 'high';
    else if (probabilityScore >= 45) purchaseProbability = 'medium';
    else purchaseProbability = 'low';

    // Detect topics
    const topics: string[] = [];
    const topicPatterns: Record<string, RegExp> = {
      pricing: /price|cost|budget|EMI|finance|loan|subsidy/i,
      service: /service|maintenance|repair|oil|filter/i,
      demo: /demo|test drive|trial|show/i,
      trade_in: /exchange|old tractor|trade|sell.*old/i,
      warranty: /warranty|guarantee|coverage|insurance/i,
      delivery: /delivery|transport|logistics|when.*get/i,
      comparison: /Mahindra|Sonalika|Kubota|vs|better than|compared/i,
    };
    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(summary + transcript)) topics.push(topic);
    }

    // Recommended next action
    let nextAction = 'follow_up';
    if (purchaseProbability === 'high' && topics.includes('pricing')) nextAction = 'send_quote';
    if (outcome === 'demo_requested' || topics.includes('demo')) nextAction = 'book_demo';
    if (topics.includes('service')) nextAction = 'book_service';
    if (purchaseProbability === 'low') nextAction = 'nurture';

    return NextResponse.json({
      callId: call.id,
      leadScore,
      purchaseProbability,
      sentiment,
      scoreFactors,
      topics,
      nextAction,
      transcriptAvailable: !!transcript,
      summary: summary || null,
    });
  } catch (error: any) {
    console.error("Error computing insights:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
