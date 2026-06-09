"""
WhatsApp Follow-Up — Architecture Notes (Phase 2 Implementation)

This module documents the WhatsApp Business API integration point.
It does NOT create database tables, queues, or send messages in Phase 1.

ARCHITECTURE:

Flow:
  1. Call ends → CallOutcomeClassifier determines outcome
  2. Evaluate if WhatsApp follow-up is appropriate for this outcome
  3. If yes → create a follow-up record in the follow_ups table
     (NOT in a separate whatsapp_messages table — deferred to Phase 2)
  4. Phase 2: A background worker/cron job will:
     a. Poll for pending follow-ups with outcome-driven types
     b. Format messages using templates
     c. Send via WhatsApp Business API (WABA)
     d. Record delivery/read status

WHEN WHATSAPP FOLLOW-UP IS TRIGGERED:
  - Service booking confirmed → service confirmation message
  - Demo booked → demo confirmation with location
  - Quote generated → quote summary (non-PDF in Phase 1)
  - Callback scheduled → reminder before callback time
  - Lead created → product brochure link / thank you
  - No answer → missed call message with "call us back" CTA

TEMPLATES (Phase 2 — WhatsApp Business API required):

  service_confirmation:
    "Your service for {model} is confirmed on {date} at {time}.
     Technician will call 30 min before arrival. Ref: {ref}"

  demo_confirmation:
    "Your demo for {product} is scheduled on {date} at {time}.
     Location: Manas Group India, {address}. Ref: {ref}"

  quote_summary:
    "Your quote for {product} is ready (Ref: {quote_id}).
     On-road price: Rs. {total}. Valid until {valid_until}.
     Call {phone} for details."

  callback_reminder:
    "Manas Group India will call you at {time} regarding {reason}.
     If this time doesn't work, reply to reschedule."

  missed_call:
    "We called regarding your {reason}. Call us back at {phone}
     or reply to this message to schedule a callback."

  payment_reminder:
    "Gentle reminder about your {type} payment for {product}.
     Contact {phone} for assistance with payment options."

PHASE 1 BEHAVIOR:
  - All follow-up is tracked via the existing follow_ups table
  - The 'type' field in follow_ups maps to the template name
  - No messages are sent; records are created for future processing
  - The dashboard API can read these records for manual follow-up

INTEGRATION POINT (Phase 2):
  - Add whatsapp_messages table to database.py
  - Implement WhatsAppMessageQueue class
  - Add WABA API client with template management
  - Create /api/whatsapp/send endpoint
  - Add webhook handler for delivery/read receipts
"""

import logging

logger = logging.getLogger("manas-whatsapp")


# ------------------------------------------------------------------
# Template definitions — reference only, not used in Phase 1
# ------------------------------------------------------------------

WHATSAPP_TEMPLATES = {
    "service_confirmation": {
        "template_name": "service_confirmation_v1",
        "language": "ml",
        "body": (
            "നിങ്ങളുടെ {model}-ന്റെ സർവീസ് {date} {time} സമയത്ത് ബുക്ക് ചെയ്തിരിക്കുന്നു. "
            "ടെക്നീഷ്യൻ വരുന്നതിന് 30 മിനിറ്റ് മുമ്പ് വിളിക്കും. Ref: {ref}"
        ),
    },
    "demo_confirmation": {
        "template_name": "demo_confirmation_v1",
        "language": "ml",
        "body": (
            "നിങ്ങളുടെ {product}-ന്റെ ഡെമോ {date} {time} സമയത്ത് ബുക്ക് ചെയ്തിരിക്കുന്നു. "
            "സ്ഥലം: മാനസ് ഗ്രൂപ്പ് ഇന്ത്യ, {address}. Ref: {ref}"
        ),
    },
    "quote_summary": {
        "template_name": "quote_summary_v1",
        "language": "ml",
        "body": (
            "നിങ്ങളുടെ {product}-ന്റെ ക്വോട്ട് തയ്യാറാണ്. Ref: {quote_id}. "
            "ഓൺ-റോഡ് വില: Rs. {total}. സാധുത: {valid_until}."
        ),
    },
    "callback_reminder": {
        "template_name": "callback_reminder_v1",
        "language": "ml",
        "body": (
            "മാനസ് ഗ്രൂപ്പ് ഇന്ത്യ {time} സമയത്ത് {reason} സംബന്ധിച്ച് വിളിക്കും."
        ),
    },
    "missed_call": {
        "template_name": "missed_call_v1",
        "language": "ml",
        "body": (
            "ഞങ്ങൾ {reason} സംബന്ധിച്ച് വിളിച്ചിരുന്നു. "
            "തിരികെ വിളിക്കാൻ {phone} എന്ന നമ്പറിൽ ബന്ധപ്പെടുക."
        ),
    },
}


# ------------------------------------------------------------------
# Stub — full implementation deferred to Phase 2
# ------------------------------------------------------------------

def evaluate_follow_up_need(outcome: str, call_memory) -> bool:
    """
    Determine if WhatsApp follow-up would be beneficial.
    Phase 1: returns True/False, does not queue messages.
    Phase 2: will create whatsapp_messages records.
    """
    outcomes_requiring_follow_up = {
        "demo_booked",
        "service_booked",
        "lead_created",
        "callback_scheduled",
        "complaint_logged",
    }
    return outcome in outcomes_requiring_follow_up


def get_template_for_outcome(outcome: str) -> str | None:
    """Map call outcome to WhatsApp template name."""
    mapping = {
        "demo_booked": "demo_confirmation",
        "service_booked": "service_confirmation",
        "lead_created": "quote_summary",
        "callback_scheduled": "callback_reminder",
    }
    return mapping.get(outcome)
