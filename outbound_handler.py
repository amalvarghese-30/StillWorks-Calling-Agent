"""
Outbound call handler for Manas Group India voice agent.

Phase 1: Language selection flow + call_memory integration + post-call processing.
Handles both dashboard-dispatched calls and CLI-dispatched outbound calls.
"""

import asyncio
import logging
import time
from livekit import agents, api

import config

logger = logging.getLogger("manas-outbound")


async def handle_outbound_call(ctx: agents.JobContext, session, fnc_ctx,
                               phone_number: str, config_dict: dict):
    """
    Handle an outbound call:
    1. Check if SIP participant is already in the room (dashboard dispatch)
    2. If not, dial out via the SIP trunk
    3. Wait for answer, generate language-selection greeting
    4. Register disconnect callback for post-call processing
    """
    logger.info(f"Handling outbound call to {phone_number} in room {ctx.room.name}")

    should_dial = False
    user_already_here = False

    # ------------------------------------------------------------------
    # 1. Check for existing SIP participant
    # ------------------------------------------------------------------
    for p in ctx.room.remote_participants.values():
        if f"sip_{phone_number}" in p.identity or "sip_" in p.identity:
            user_already_here = True
            logger.info(f"SIP participant already in room: {p.identity}")
            break

    if not user_already_here:
        should_dial = True
        logger.info("User not in room. Agent will initiate dial-out.")
    else:
        logger.info("User already in room (dashboard-dispatched). Generating greeting only.")

    # ------------------------------------------------------------------
    # 2. Create call record + CallMemory
    # ------------------------------------------------------------------
    language = config_dict.get("language", config.DEFAULT_OUTBOUND_LANGUAGE)
    call_type = config_dict.get("call_type", "general")

    try:
        call_id = fnc_ctx.db.create_call(
            phone_number=phone_number,
            direction="outbound",
            call_type=call_type,
            room_name=ctx.room.name,
            language_used=language,
        )
        fnc_ctx.current_call_id = call_id
    except Exception as e:
        logger.warning(f"Could not log outbound call: {e}")
        call_id = 0

    from call_memory import CallMemory
    call_memory = CallMemory(
        call_id=call_id,
        phone_number=phone_number,
        language=language,
        db=fnc_ctx.db,
    )
    fnc_ctx.call_memory = call_memory
    call_start_time = time.time()

    # ------------------------------------------------------------------
    # 3. Register post-call processing callback
    # ------------------------------------------------------------------
    async def on_disconnect():
        """Runs when the room disconnects."""
        duration_seconds = int(time.time() - call_start_time)
        if not fnc_ctx.current_call_id:
            return

        try:
            fnc_ctx.db.update_call_duration(fnc_ctx.current_call_id, duration_seconds)

            call_memory.extract_and_set_intent()

            from call_outcome import CallOutcomeClassifier
            classifier = CallOutcomeClassifier()
            transferred = "transfer_call" in call_memory.get_tool_calls()
            outcome = classifier.classify(call_memory, duration_seconds, "outbound", transferred)

            fnc_ctx.db.set_call_outcome(
                fnc_ctx.current_call_id, outcome,
                escalation_tier=call_memory._data.get("escalation_tier", 1),
            )
            call_memory.set_outcome(outcome)

            from lead_scoring import LeadScoringEngine
            scorer = LeadScoringEngine()
            lead_result = scorer.calculate(call_memory)
            call_memory._data["lead_score"] = lead_result["score"]

            call_memory.set_summary(
                f"Call outcome: {outcome}. "
                f"Lead score: {lead_result['score']}/100 ({lead_result['category_label']}). "
                f"Intent: {call_memory._data.get('intent', 'unknown')}. "
                f"Duration: {duration_seconds}s."
            )

            call_memory.save()

            logger.info(
                f"Post-call processed: call_id={fnc_ctx.current_call_id}, "
                f"duration={duration_seconds}s, outcome={outcome}, "
                f"score={lead_result['score']}/{lead_result['category_label']}"
            )
        except Exception as e:
            logger.error(f"Post-call processing failed: {e}")

    ctx.add_shutdown_callback(on_disconnect)

    # ------------------------------------------------------------------
    # 4. Dial out (if needed)
    # ------------------------------------------------------------------
    if should_dial:
        logger.info(f"Initiating outbound SIP call to {phone_number}...")
        try:
            await ctx.api.sip.create_sip_participant(
                api.CreateSIPParticipantRequest(
                    room_name=ctx.room.name,
                    sip_trunk_id=config.SIP_TRUNK_ID,
                    sip_call_to=phone_number,
                    participant_identity=f"sip_{phone_number}",
                    wait_until_answered=True,
                )
            )
            logger.info("Call answered! Agent will now greet.")

            if fnc_ctx.current_call_id:
                fnc_ctx.db.update_call(fnc_ctx.current_call_id, status="answered")

        except Exception as e:
            logger.error(f"Failed to place outbound call: {e}")
            if fnc_ctx.current_call_id:
                fnc_ctx.db.update_call(fnc_ctx.current_call_id, status="failed")
            ctx.shutdown()
            return

    # ------------------------------------------------------------------
    # 5. Generate language-selection greeting
    # ------------------------------------------------------------------
    campaign_type = config_dict.get("call_type", "")
    campaign_config = config.CAMPAIGN_TYPES.get(campaign_type, {})
    user_prompt = config_dict.get("user_prompt", "")
    language_options = ", ".join(f"{v}" for v in config.LANGUAGE_OPTIONS.values())

    greeting_instructions = (
        f"You are calling {phone_number}. Call lookup_user({phone_number}) first.\n\n"
        f"CRITICAL — LANGUAGE SELECTION FLOW:\n"
        f"1. Introduce yourself: 'Hello, this is AgriForge AI from Manus Group India.'\n"
        f"2. Briefly state the reason for your call.\n"
        f"3. Ask: 'Which language would you prefer — {language_options}?'\n"
        f"4. Wait for their answer.\n"
        f"5. IMMEDIATELY call the lock_language() tool with their choice (en, hi, or ml).\n"
        f"6. The lock_language tool will confirm in their language.\n"
        f"7. Then proceed with the conversation.\n\n"
        f"NEVER switch language unless the customer explicitly asks to change.\n"
    )

    if user_prompt:
        greeting_instructions += (
            f"\n\nIMPORTANT CONTEXT FROM CRM: {user_prompt}. "
            "Reference this in your greeting.\n"
        )

    if campaign_config.get("prompt_override"):
        greeting_instructions += (
            f"\n\nCAMPAIGN TYPE: {campaign_config['prompt_override']}\n"
        )

    await session.generate_reply(instructions=greeting_instructions)

    logger.info("Outbound greeting generated. Conversation loop is now active.")
