import os
from dotenv import load_dotenv

load_dotenv()


# =============================================================================
#  SYSTEM PROMPT
# =============================================================================

def _load_system_prompt():
    prompt_path = os.path.join(os.path.dirname(__file__), "prompts", "system_prompt.txt")
    if os.path.exists(prompt_path):
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    # Fallback if prompt file is missing
    return """
You are ManasAI, the virtual voice assistant for Manas Group India,
an ISO 9001:2015 certified agricultural machinery dealer in Palakkad, Kerala.
You help farmers with tractors, harvesters, implements, spare parts,
service bookings, financing, and general inquiries.
Be polite, concise, and speak in the customer's language (Malayalam, English, or Hindi).
"""

SYSTEM_PROMPT = _load_system_prompt()


# =============================================================================
#  AGENT IDENTITY
# =============================================================================

AGENT_NAME = "manas-agent"

# =============================================================================
#  LANGUAGE SETTINGS
# =============================================================================

DEFAULT_OUTBOUND_LANGUAGE = "ml"  # Malayalam for Kerala farmers
SUPPORTED_LANGUAGES = ["ml", "en", "hi"]
LANGUAGE_DETECTION_ENABLED = False  # DISABLED — never auto-switch language

# Language locking — CRITICAL
LANGUAGE_LOCK_ENABLED = True
LANGUAGE_SWITCH_CONFIRMATION_REQUIRED = True
LANGUAGE_OPTIONS = {
    "en": "English",
    "hi": "Hindi - हिन्दी",
    "ml": "Malayalam - മലയാളം",
}
LANGUAGE_CONFIRMATION_MESSAGES = {
    "en": "You selected English. I will continue in English.",
    "hi": "आपने हिंदी चुनी है। मैं हिंदी में जारी रखूँगी।",
    "ml": "നിങ്ങൾ മലയാളം തിരഞ്ഞെടുത്തു. ഞാൻ മലയാളത്തിൽ തുടരും.",
}

# TTS voice mapping per language
LANGUAGE_TTS_MAP = {
    "ml": {"provider": "sarvam", "voice": "manisha", "model": "bulbul:v2", "language": "ml-IN"},
    "hi": {"provider": "sarvam", "voice": "manisha", "model": "bulbul:v2", "language": "hi-IN"},
    "en": {"provider": "openai", "voice": "alloy", "model": "tts-1-hd", "language": "en-US"},
}

# =============================================================================
#  CALL SETTINGS
# =============================================================================

INITIAL_GREETING = (
    "The user has picked up the call. Introduce yourself as ManasAI from Manas Group India. "
    "Start in Malayalam: 'നമസ്കാരം, ഇത് മാനസ് ഗ്രൂപ്പ് ഇന്ത്യയിൽ നിന്നുള്ള മാനസ്എഐ ആണ്. "
    "ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കാൻ കധിയും?' "
    "If the customer responds in English or Hindi, switch immediately. "
    "If this is a service reminder outbound call, mention the specific reason for calling."
)

INBOUND_GREETING = (
    "A customer has just connected on the inbound line. Greet them as ManasAI from Manas Group India. "
    "Start in Malayalam: 'നമസ്കാരം, മാനസ് ഗ്രൂപ്പ് ഇന്ത്യയിലേക്ക് സ്വാഗതം. ഞാൻ മാനസ്എഐ ആണ്. "
    "എനിക്ക് നിങ്ങളെ എങ്ങനെ സഹായിക്കാൻ കധിയും?' "
    "Listen carefully to the customer's first response to detect language and switch if needed."
)

fallback_greeting = (
    "Greet the caller as ManasAI from Manas Group India. Ask how you can help them today."
)

# Maximum outbound calls per hour (avoid spamming)
MAX_OUTBOUND_CALLS_PER_HOUR = int(os.getenv("MAX_OUTBOUND_CALLS_PER_HOUR", "50"))
OUTBOUND_CALL_WINDOW_START = os.getenv("OUTBOUND_CALL_WINDOW_START", "09:00")
OUTBOUND_CALL_WINDOW_END = os.getenv("OUTBOUND_CALL_WINDOW_END", "18:00")

# =============================================================================
#  SPEECH-TO-TEXT (STT) SETTINGS
# =============================================================================

STT_PROVIDER = "deepgram"
STT_MODEL = os.getenv("DEEPGRAM_STT_MODEL", "nova-3")
STT_LANGUAGE = os.getenv("DEEPGRAM_STT_LANGUAGE", "en")  # "en" supports multi-language code switching

# =============================================================================
#  TEXT-TO-SPEECH (TTS) SETTINGS
# =============================================================================

DEFAULT_TTS_PROVIDER = os.getenv("TTS_PROVIDER", "sarvam").lower()
DEFAULT_TTS_VOICE = "alloy"

# Sarvam AI (Indian voices — Malayalam, Hindi)
SARVAM_MODEL = os.getenv("SARVAM_TTS_MODEL", "bulbul:v2")
SARVAM_LANGUAGE = os.getenv("SARVAM_LANGUAGE", "en-IN")

# Cartesia
CARTESIA_MODEL = os.getenv("CARTESIA_TTS_MODEL", "sonic-2")
CARTESIA_VOICE = os.getenv("CARTESIA_TTS_VOICE", "f786b574-daa5-4673-aa0c-cbe3e8534c02")

# =============================================================================
#  LARGE LANGUAGE MODEL (LLM) SETTINGS
# =============================================================================

DEFAULT_LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq").lower()
DEFAULT_LLM_MODEL = os.getenv("GROQ_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")

# Groq
GROQ_MODEL = os.getenv("GROQ_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")
GROQ_TEMPERATURE = float(os.getenv("GROQ_TEMPERATURE", "0.7"))

# OpenAI
OPENAI_LLM_MODEL = os.getenv("OPENAI_LLM_MODEL", "gpt-4o-mini")

# =============================================================================
#  TELEPHONY & SIP
# =============================================================================

# Outbound SIP trunk (calls made by the agent)
SIP_TRUNK_ID = os.getenv("VOBIZ_SIP_TRUNK_ID") or os.getenv("OUTBOUND_TRUNK_ID")
SIP_DOMAIN = os.getenv("VOBIZ_SIP_DOMAIN")

# Inbound SIP trunk (calls received on the dedicated AI number)
INBOUND_TRUNK_ID = os.getenv("INBOUND_TRUNK_ID")

# Dedicated AI phone number
MANAS_AI_PHONE_NUMBER = os.getenv("MANAS_AI_PHONE_NUMBER")

# Transfer numbers — Manas Group human support lines
DEFAULT_TRANSFER_NUMBER = os.getenv("DEFAULT_TRANSFER_NUMBER") or ""
MANAS_SUPPORT_NUMBER_1 = os.getenv("MANAS_SUPPORT_NUMBER_1", "")
MANAS_SUPPORT_NUMBER_2 = os.getenv("MANAS_SUPPORT_NUMBER_2", "")

# =============================================================================
#  MANAS GROUP BUSINESS INFO
# =============================================================================

MANAS_EMAIL = os.getenv("MANAS_EMAIL", "mail@manasgroupindia.in")
MANAS_ADDRESS = os.getenv("MANAS_ADDRESS", "Vellapara, Chithali post, Palakkad Dist., Kerala")
MANAS_WEBSITE = "www.manasgroupindia.in"
MANAS_BUSINESS_HOURS = "Monday to Saturday, 9:00 AM to 6:00 PM"

# =============================================================================
#  SERVICE BOOKING DEFAULTS
# =============================================================================

SERVICE_TIME_SLOTS = {
    "morning": "9:00 AM — 1:00 PM",
    "afternoon": "2:00 PM — 6:00 PM",
}

SERVICE_TYPES = [
    "periodic",
    "repair",
    "emergency",
    "inspection",
]

# =============================================================================
#  FINANCING DEFAULTS
# =============================================================================

FINANCING_TENURE_OPTIONS = [12, 24, 36, 48, 60]  # months
FINANCING_DEFAULT_TENURE = 36
FINANCING_DEFAULT_RATE = 8.5  # percent per annum
FINANCING_DEFAULT_DOWN_PAYMENT_PCT = 0.25  # 25% down payment
FINANCING_PARTNER_BANKS = [
    "HDFC Bank",
    "ICICI Bank",
    "State Bank of India",
    "Federal Bank",
    "Kerala Gramin Bank",
]

# =============================================================================
#  VAD PROFILES (Voice Activity Detection)
# =============================================================================

VAD_PROFILES = {
    "balanced": {
        "label": "Balanced",
        "activation_threshold": 0.5,
        "min_silence_duration": 0.4,
        "padding_duration": 0.15,
    },
    "aggressive": {
        "label": "Aggressive (Responsive)",
        "activation_threshold": 0.8,
        "min_silence_duration": 0.3,
        "padding_duration": 0.1,
    },
    "conservative": {
        "label": "Conservative (Natural)",
        "activation_threshold": 0.35,
        "min_silence_duration": 0.6,
        "padding_duration": 0.25,
    },
}
DEFAULT_VAD_PROFILE = os.getenv("VAD_PROFILE", "balanced")

# Interruption control
INTERRUPTION_MIN_SPEECH_DURATION = 0.8

# =============================================================================
#  LEAD SCORING WEIGHTS
# =============================================================================

LEAD_SCORING_WEIGHTS = {
    "has_budget": 25,
    "has_timeline_30d": 20,
    "model_known": 15,
    "location_kerala": 10,
    "farm_size_5acres": 10,
    "multi_product_interest": 10,
    "asked_for_demo": 10,
}

LEAD_CATEGORIES = {
    "hot": {"min_score": 80, "label": "Hot Lead", "action": "notify_sales_immediately"},
    "warm": {"min_score": 40, "label": "Warm Lead", "action": "follow_up_48hrs"},
    "cold": {"min_score": 0, "label": "Cold Lead", "action": "add_to_nurture"},
}

# =============================================================================
#  ESCALATION FRAMEWORK
# =============================================================================

ESCALATION_TIERS = {
    1: {"label": "AI Handles", "action": "resolve_and_log"},
    2: {"label": "Flag for Review", "action": "create_record_notify"},
    3: {"label": "Immediate Transfer", "action": "transfer_to_human"},
}

ESCALATION_TRIGGERS = {
    "customer_anger": {"tier": 3, "action": "immediate_transfer"},
    "explicit_request": {"tier": 3, "action": "immediate_transfer"},
    "ai_confusion_2_attempts": {"tier": 3, "action": "immediate_transfer"},
    "legal_compliance": {"tier": 3, "action": "immediate_transfer"},
    "complex_technical": {"tier": 2, "action": "flag_for_review"},
    "callback_required": {"tier": 2, "action": "schedule_callback"},
}

ANGER_KEYWORDS = [
    "useless", "waste of time", "stupid", "manager", "supervisor",
    "complaint", "not helping", "rubbish", "nonsense", "ridiculous",
    "transfer me", "speak to human", "real person", "talk to someone",
]

# =============================================================================
#  CALL OUTCOMES
# =============================================================================

CALL_OUTCOMES = [
    "demo_booked",
    "service_booked",
    "lead_created",
    "callback_scheduled",
    "complaint_logged",
    "information_provided",
    "transferred_to_human",
    "no_answer",
    "wrong_number",
    "hung_up",
    "not_interested",
    "escalated",
]

# =============================================================================
#  QUOTE GENERATION
# =============================================================================

QUOTE_VALIDITY_DAYS = 7
QUOTE_DOWN_PAYMENT_OPTIONS = [0.20, 0.25, 0.30, 0.40, 0.50]
QUOTE_ON_ROAD_COSTS = {
    "insurance_pct": 0.08,
    "registration_pct": 0.05,
    "accessories_pct": 0.03,
}

# =============================================================================
#  DATABASE
# =============================================================================

DATABASE_PATH = os.getenv("DATABASE_PATH", "data/manas_group.db")

# MongoDB
DB_BACKEND = os.getenv("DB_BACKEND", "sqlite").lower()  # "sqlite" or "mongodb"
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "agriforge_voice")

# =============================================================================
#  CAMPAIGN TYPES
# =============================================================================

CAMPAIGN_TYPES = {
    "service_reminder": {
        "label": "Service Reminder",
        "prompt_override": "You are making a service reminder call. The customer's tractor is due for periodic service. Inform them and offer to book a service appointment.",
    },
    "follow_up": {
        "label": "Follow-up Call",
        "prompt_override": "You are following up on a previous sales inquiry. Reference their interest and ask if they have any questions or want to proceed.",
    },
    "promotional": {
        "label": "Promotional Offer",
        "prompt_override": "You are calling about a special promotional offer. Present the offer briefly and ask if they'd like more details.",
    },
    "payment_followup": {
        "label": "Payment Follow-up",
        "prompt_override": "You are calling regarding a pending EMI payment or financing application. Be polite and discreet — do not mention specific amounts unless the customer brings it up.",
    },
}
