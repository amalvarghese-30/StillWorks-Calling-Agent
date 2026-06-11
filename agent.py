import os
import certifi

# Fix for macOS SSL Certificate errors - MUST be before other imports
os.environ['SSL_CERT_FILE'] = certifi.where()

import logging
import json
from dotenv import load_dotenv

from livekit import agents, api
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import (
    openai,
    cartesia,
    deepgram,
    noise_cancellation,
    silero,
    sarvam,
)
from livekit.agents import llm

# Load environment variables
load_dotenv(".env")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("manas-agent")

import config
from db import create_database
from tools import ManasAgentFunctions
from inbound_handler import handle_inbound_call
from outbound_handler import handle_outbound_call


def _build_tts(config_provider: str = None, config_voice: str = None,
               language: str = None):
    """Configure the Text-to-Speech provider based on config and language.

    Priority: language map > config > env var > default.
    Malayalam (ml) and Hindi (hi) → Sarvam for native-quality voices.
    English (en) → OpenAI TTS for real-time output.
    """
    # Check language-based mapping first
    if language and language in config.LANGUAGE_TTS_MAP:
        lang_config = config.LANGUAGE_TTS_MAP[language]
        provider = lang_config["provider"]
        voice = config_voice or lang_config["voice"]
        logger.info(f"Using TTS from language map: {provider} (voice={voice}, lang={language})")
    else:
        provider = (config_provider or os.getenv("TTS_PROVIDER", config.DEFAULT_TTS_PROVIDER)).lower()
        voice = config_voice

    # Sarvam voice names force Sarvam provider
    if voice in ["shubh", "ritu", "rahul", "pooja", "simran", "kavya", "amit", "ratan", "rohan",
                 "dev", "ishita", "shreya", "manan", "sumit", "priya", "aditya", "kabir", "neha",
                 "varun", "roopa", "aayan", "ashutosh", "advait", "amelia", "sophia", "suhani",
                 "rupali", "tanya", "shruti", "kavitha"]:
        provider = "sarvam"

    if provider == "cartesia":
        logger.info("Using Cartesia TTS")
        model = os.getenv("CARTESIA_TTS_MODEL", config.CARTESIA_MODEL)
        tts_voice = voice or os.getenv("CARTESIA_TTS_VOICE", config.CARTESIA_VOICE)
        return cartesia.TTS(model=model, voice=tts_voice)

    if provider == "sarvam":
        logger.info(f"Using Sarvam TTS (Voice: {voice})")
        model = os.getenv("SARVAM_TTS_MODEL", config.SARVAM_MODEL)
        tts_voice = voice or os.getenv("SARVAM_VOICE", "kavitha")
        VALID_SARVAM_SPEAKERS = {
            "shubh", "ritu", "rahul", "pooja", "simran", "kavya", "amit", "ratan", "rohan",
            "dev", "ishita", "shreya", "manan", "sumit", "priya", "aditya", "kabir", "neha",
            "varun", "roopa", "aayan", "ashutosh", "advait", "amelia", "sophia", "suhani",
            "rupali", "tanya", "shruti", "kavitha",
        }
        if tts_voice not in VALID_SARVAM_SPEAKERS:
            logger.warning(f"Voice '{tts_voice}' not valid for Sarvam, falling back to kavitha")
            tts_voice = "kavitha"
        if language and language in config.LANGUAGE_TTS_MAP:
            lang_code = config.LANGUAGE_TTS_MAP[language].get("language", "en-IN")
        else:
            lang_code = os.getenv("SARVAM_LANGUAGE", config.SARVAM_LANGUAGE)
        return sarvam.TTS(model=model, speaker=tts_voice, target_language_code=lang_code)

    if provider == "deepgram":
        logger.info("Using Deepgram TTS")
        model = os.getenv("DEEPGRAM_TTS_MODEL", "aura-asteria-en")
        return deepgram.TTS(model=model)

    # Default to OpenAI TTS for English
    if provider == "openai" or provider == "default":
        logger.info(f"Using OpenAI TTS (Voice: {voice or config.DEFAULT_TTS_VOICE})")
        model = os.getenv("OPENAI_TTS_MODEL", "tts-1")
        tts_voice = voice or os.getenv("OPENAI_TTS_VOICE", config.DEFAULT_TTS_VOICE)
        return openai.TTS(model=model, voice=tts_voice)

    # Fallback to OpenAI
    logger.info(f"Using OpenAI TTS (Voice: {voice or config.DEFAULT_TTS_VOICE})")
    model = os.getenv("OPENAI_TTS_MODEL", "tts-1")
    tts_voice = voice or os.getenv("OPENAI_TTS_VOICE", config.DEFAULT_TTS_VOICE)
    return openai.TTS(model=model, voice=tts_voice)


def _build_stt(language: str = None):
    """Configure STT with language awareness and nova-3 model.
    Deepgram nova-3 with 'en-IN' supports Indian-accented English and multi-language code switching.
    For Hindi-only, 'hi' provides better accuracy.
    For Malayalam, 'en-IN' with smart_format gives the best available code-switch detection.
    Deepgram does not have a dedicated Malayalam model.
    """
    stt_language = os.getenv("DEEPGRAM_STT_LANGUAGE", config.STT_LANGUAGE)
    if language == "hi":
        stt_language = "hi"
    elif language == "ml":
        stt_language = "en-IN"

    logger.info(f"Using Deepgram STT (model={config.STT_MODEL}, language={stt_language})")
    return deepgram.STT(
        model=config.STT_MODEL,
        language=stt_language,
        smart_format=True,
    )


def _build_vad():
    """Configure VAD using profile from config.
    Profile options: balanced (default), aggressive (responsive), conservative (natural).
    Configurable via VAD_PROFILE env var.
    """
    profile_name = os.getenv("VAD_PROFILE", config.DEFAULT_VAD_PROFILE)
    profile = config.VAD_PROFILES.get(profile_name, config.VAD_PROFILES["balanced"])
    logger.info(
        f"Using VAD profile: {profile_name} "
        f"(threshold={profile['activation_threshold']}, "
        f"min_silence={profile['min_silence_duration']}s, "
        f"padding={profile['padding_duration']}s)"
    )
    return silero.VAD.load(
        min_speech_duration=config.INTERRUPTION_MIN_SPEECH_DURATION,
        min_silence_duration=profile["min_silence_duration"],
        padding_duration=profile["padding_duration"],
    )


def _build_llm(config_provider: str = None):
    """Configure the LLM provider based on config or env vars."""
    provider = (config_provider or os.getenv("LLM_PROVIDER", config.DEFAULT_LLM_PROVIDER)).lower()

    if provider == "groq":
        logger.warning("Groq is deprecated — using OpenAI instead")
        logger.info("Using OpenAI LLM")
        return openai.LLM(model=config.OPENAI_LLM_MODEL)

    # Default to OpenAI
    logger.info("Using OpenAI LLM")
    return openai.LLM(model=config.OPENAI_LLM_MODEL)


class ManasAssistant(Agent):
    """
    AI agent for Manas Group India — agricultural machinery dealership.
    Handles inbound and outbound calls with full trilingual support
    (Malayalam, English, Hindi) and 12 function tools for customer service.
    """
    def __init__(self, tools: list) -> None:
        super().__init__(
            instructions=config.SYSTEM_PROMPT,
            tools=tools,
        )


async def entrypoint(ctx: agents.JobContext):
    """
    Main entrypoint for the Manas Group voice agent.

    Detects call direction:
    - INBOUND: SIP participant already in room (placed by LiveKit dispatch rule)
    - OUTBOUND: phone_number in metadata, agent dials out via SIP trunk
    """
    logger.info(f"Connecting to room: {ctx.room.name}")

    # ------------------------------------------------------------------
    # 1. Parse metadata for call context
    # ------------------------------------------------------------------
    phone_number = None
    config_dict = {}

    # Try job metadata (legacy / CLI dispatch)
    try:
        if ctx.job.metadata:
            data = json.loads(ctx.job.metadata)
            phone_number = data.get("phone_number")
            config_dict = data
            logger.info(f"Job metadata loaded: phone={phone_number}")
    except Exception:
        pass

    # Try room metadata (dashboard dispatch) — overrides job metadata
    try:
        if ctx.room.metadata:
            data = json.loads(ctx.room.metadata)
            if data.get("phone_number"):
                phone_number = data.get("phone_number")
            config_dict.update(data)
            logger.info(f"Room metadata loaded: phone={phone_number}")
    except Exception:
        logger.warning("No valid JSON metadata found in Room.")

    # ------------------------------------------------------------------
    # 2. Detect call direction
    # ------------------------------------------------------------------
    call_direction = config_dict.get("call_direction", "unknown")
    sip_participant_present = False
    inbound_identity = None

    for p in ctx.room.remote_participants.values():
        if "sip_" in p.identity:
            sip_participant_present = True
            inbound_identity = p.identity
            break

    # Determine direction
    if call_direction == "inbound":
        direction = "inbound"
    elif call_direction == "outbound":
        direction = "outbound"
    elif sip_participant_present and not phone_number:
        # SIP participant present, no outbound phone number → inbound
        direction = "inbound"
        phone_number = inbound_identity.replace("sip_", "") if inbound_identity else None
        logger.info(f"Detected INBOUND call from {phone_number}")
    elif phone_number and not sip_participant_present:
        direction = "outbound"
        logger.info(f"Detected OUTBOUND call to {phone_number}")
    elif phone_number and sip_participant_present:
        # Dashboard dispatch: phone_number + SIP participant → outbound (already connected)
        direction = "outbound"
        logger.info(f"Detected OUTBOUND call (dashboard dispatch) to {phone_number}")
    else:
        direction = "inbound"
        logger.warning("Could not determine call direction, defaulting to inbound")

    # ------------------------------------------------------------------
    # 3. Initialize database
    # ------------------------------------------------------------------
    db = create_database()

    # ------------------------------------------------------------------
    # 4. Build language-aware TTS
    # ------------------------------------------------------------------
    language = config_dict.get("language", config.DEFAULT_OUTBOUND_LANGUAGE)
    tts = _build_tts(
        config_provider=config_dict.get("model_provider"),
        config_voice=config_dict.get("voice_id"),
        language=language,
    )

    # ------------------------------------------------------------------
    # 5. Initialize function tools
    # ------------------------------------------------------------------
    fnc_ctx = ManasAgentFunctions(ctx, phone_number, db=db)

    # ------------------------------------------------------------------
    # 6. Build and start the agent session
    # ------------------------------------------------------------------
    session = AgentSession(
        vad=_build_vad(),
        stt=_build_stt(language),
        llm=_build_llm(config_dict.get("model_provider")),
        tts=tts,
    )

    # Wire fnc_ctx so lock_language() can rebuild STT/TTS when language changes
    fnc_ctx.session = session
    fnc_ctx._build_stt_fn = _build_stt
    fnc_ctx._build_tts_fn = _build_tts

    await session.start(
        room=ctx.room,
        agent=ManasAssistant(tools=list(fnc_ctx.function_tools.values())),
        room_input_options=RoomInputOptions(
            noise_cancellation=noise_cancellation.BVCTelephony(),
            close_on_disconnect=True,
        ),
    )

    # ------------------------------------------------------------------
    # 7. Delegate to direction-specific handler
    # ------------------------------------------------------------------
    if direction == "inbound":
        await handle_inbound_call(ctx, session, fnc_ctx, config_dict)
    else:
        await handle_outbound_call(ctx, session, fnc_ctx, phone_number, config_dict)


if __name__ == "__main__":
    # The agent name "manas-agent" is used by LiveKit dispatch rules
    # to route inbound calls and by make_call.py for outbound dispatch
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name=config.AGENT_NAME,
        )
    )
