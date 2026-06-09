import { NextResponse } from 'next/server';
import { agentDispatchClient } from '@/lib/server-utils';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { phoneNumber, prompt, modelProvider, voice, campaignType, language } = body;

        if (!phoneNumber) {
            return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
        }

        const roomName = `out-${phoneNumber.replace(/\+/g, '')}-${Math.floor(Math.random() * 10000)}`;

        console.log(`Dispatching ${campaignType || 'follow_up'} call to ${phoneNumber} in room ${roomName}`);

        const metadata = JSON.stringify({
            phone_number: phoneNumber,
            call_type: campaignType || 'follow_up',
            language: language || 'ml',
            user_prompt: prompt || '',
            model_provider: modelProvider || process.env.LLM_PROVIDER || 'groq',
            voice_id: voice || 'anushka',
        });

        const dispatch = await agentDispatchClient.createDispatch(
            roomName,
            "manas-agent",
            { metadata }
        );

        return NextResponse.json({
            success: true,
            roomName,
            dispatchId: dispatch.id,
            campaignType: campaignType || 'follow_up',
        });

    } catch (error: any) {
        console.error("Error dispatching call:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
