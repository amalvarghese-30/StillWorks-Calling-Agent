import { NextResponse } from 'next/server';
import { getCollection } from '../db';

export async function GET() {
  try {
    const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';

    // Read agent config from env
    const model = process.env.LLM_MODEL || process.env.OPENAI_LLM_MODEL || 'GPT-4o';
    const stt = process.env.DEEPGRAM_STT_LANGUAGE
      ? `Deepgram Nova-3 (${process.env.DEEPGRAM_STT_LANGUAGE})`
      : 'Deepgram Nova-3';
    const tts = process.env.TTS_PROVIDER || 'OpenAI TTS / Sarvam';

    const callsCol = await getCollection('calls');
    if (callsCol) {
      const today = new Date().toISOString().slice(0, 10);

      const activeCalls = await callsCol.countDocuments({ status: 'in_progress' });
      const todayCalls = await callsCol.find({
        created_at: { $gte: today },
      }).toArray();
      const allCalls = await callsCol.find({}).toArray();

      const avgDuration = todayCalls.length > 0
        ? Math.round(todayCalls.reduce((sum: number, c: any) => sum + (c.duration_seconds || 0), 0) / todayCalls.length)
        : 0;

      const scoredCalls = todayCalls.filter((c: any) => c.lead_score != null && c.lead_score > 0);
      const avgLeadScore = scoredCalls.length > 0
        ? Math.round(scoredCalls.reduce((sum: number, c: any) => sum + c.lead_score, 0) / scoredCalls.length)
        : 0;

      const escalated = todayCalls.filter((c: any) => c.status === 'transferred' || c.escalation_tier);
      const escalationRate = todayCalls.length > 0
        ? Math.round((escalated.length / todayCalls.length) * 1000) / 10
        : 0;

      return NextResponse.json({
        status: 'online',
        model,
        stt,
        tts,
        activeCalls,
        todayCalls: todayCalls.length,
        avgDuration,
        avgLeadScore,
        escalationRate,
      });
    }

    // SQLite fallback
    const Database = await import('better-sqlite3');
    const db = new (Database.default as any)(dbPath, { readonly: true });

    const today = new Date().toISOString().slice(0, 10);

    const activeCalls = (db.prepare("SELECT COUNT(*) as c FROM calls WHERE status = 'in_progress'").get() as any).c || 0;
    const todayCalls = db.prepare("SELECT * FROM calls WHERE date(created_at) = ?").all(today) as any[];

    const avgDuration = todayCalls.length > 0
      ? Math.round(todayCalls.reduce((sum: number, c: any) => sum + (c.duration_seconds || 0), 0) / todayCalls.length)
      : 0;

    const scoredCalls = todayCalls.filter((c: any) => c.lead_score != null && c.lead_score > 0);
    const avgLeadScore = scoredCalls.length > 0
      ? Math.round(scoredCalls.reduce((sum: number, c: any) => sum + c.lead_score, 0) / scoredCalls.length)
      : 0;

    const escalated = todayCalls.filter((c: any) => c.status === 'transferred' || c.escalation_tier);
    const escalationRate = todayCalls.length > 0
      ? Math.round((escalated.length / todayCalls.length) * 1000) / 10
      : 0;

    db.close();

    return NextResponse.json({
      status: 'online',
      model,
      stt,
      tts,
      activeCalls,
      todayCalls: todayCalls.length,
      avgDuration,
      avgLeadScore,
      escalationRate,
    });
  } catch (error: any) {
    console.error("Agent health error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
