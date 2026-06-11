"""
Inbound call handler for Manas Group India voice agent.
Handles calls where the SIP participant is already in the room (placed by LiveKit dispatch rule).

Phase 1: Language selection flow + call_memory integration + post-call processing.
"""

import asyncio
import logging
import time
from livekit import agents

import config

logger = logging.getLogger("manas-inbound")


async def handle_inbound_call(ctx: agents.JobContext, session, fnc_ctx, config_dict: dict):
    """
    Handle an inbound call where the SIP participant is already in the room.

    Flow:
    1. Detect caller identity
    2. Create call record + initialize CallMemory
    3. Generate language-selection greeting
    4. Register disconnect callback for post-call processing
    """
    logger.info(f"Handling inbound call in room {ctx.room.name}")

    # ------------------------------------------------------------------
    # 1. Detect the inbound caller's SIP identity
    # ------------------------------------------------------------------
    caller_identity = None
    caller_phone = None
    for p in ctx.room.remote_participants.values():
        if "sip_" in p.identity:
            caller_identity = p.identity
            caller_phone = p.identity.replace("sip_", "")
            logger.info(f"Detected inbound caller: {caller_phone}")
            break

    if caller_identity:
        fnc_ctx.inbound_caller_identity = caller_identity
    if caller_phone:
        fnc_ctx.phone_number = caller_phone

    # ------------------------------------------------------------------
    # 2. Create call record + CallMemory
    # ------------------------------------------------------------------
    language = config_dict.get("language", config.DEFAULT_OUTBOUND_LANGUAGE)
    call_type = config_dict.get("call_type", "general_inquiry")

    try:
        call_id = fnc_ctx.db.create_call(
            phone_number=caller_phone or "unknown",
            direction="inbound",
            call_type=call_type,
            room_name=ctx.room.name,
            language_used=language,
        )
        fnc_ctx.current_call_id = call_id
    except Exception as e:
        logger.warning(f"Could not log inbound call: {e}")
        call_id = 0

    from call_memory import CallMemory
    call_memory = CallMemory(
        call_id=call_id,
        phone_number=caller_phone or "unknown",
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
            outcome = classifier.classify(call_memory, duration_seconds, "inbound", transferred)

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
    # 4. Generate language-selection greeting
    # ------------------------------------------------------------------
    await asyncio.sleep(0.5)

    phone = caller_phone or "the caller"

    greeting_instructions = (
        f"The caller's phone number is {phone}. Call lookup_user({phone}) first.\n\n"
        f"Call context: inbound call to Manas Group India.\n"
    )
    await session.generate_reply(instructions=greeting_instructions)

    logger.info("Inbound greeting generated. Conversation loop is now active.")
