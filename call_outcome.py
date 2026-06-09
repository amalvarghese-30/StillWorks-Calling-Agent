"""
CallOutcomeClassifier — Determines call outcome based on tool calls,
conversation data, and call metadata.

Outcomes defined in config.CALL_OUTCOMES.
Classification is deterministic, based on observable signals during the call.
"""

import logging
from typing import Optional

import config

logger = logging.getLogger("manas-outcome")


class CallOutcomeClassifier:
    def __init__(self):
        self.outcomes = config.CALL_OUTCOMES

    def classify(self, call_memory, duration_seconds: int,
                 direction: str, transferred: bool = False) -> str:
        """
        Determine the primary call outcome.

        Priority order:
        1. Transferred to human
        2. Escalated (tier 3)
        3. Appointment booked (demo or service)
        4. Lead created
        5. Callback scheduled
        6. Complaint logged
        7. Information provided
        8. No answer / hung up / not interested
        """
        data = call_memory.to_dict()
        tools = data.get("tool_calls_made", [])
        outcome = data.get("outcome")
        appointment = data.get("appointment", {})
        transcript = (data.get("transcript") or "").lower()

        # 1. Explicit transfers
        if transferred or "transfer_call" in tools:
            if data.get("escalation_tier", 0) >= 3:
                return "escalated"
            return "transferred_to_human"

        # 2. Escalations
        if data.get("escalation_tier", 0) >= 3:
            return "escalated"

        # 3. Very short calls (no meaningful interaction)
        if duration_seconds < 10:
            return "no_answer" if direction == "outbound" else "hung_up"
        if duration_seconds < 20 and "lookup_user" not in tools:
            return "no_answer" if direction == "outbound" else "hung_up"

        # 4. Appointments — only if an appointment type was actually set
        if "book_service" in tools or (appointment.get("type") and appointment.get("status") in ("confirmed", "pending", "booked")):
            apt_type = appointment.get("type", "")
            if apt_type == "demo":
                return "demo_booked"
            return "service_booked"

        # 5. Quote generated → lead
        if "generate_quote" in tools or data.get("quote_generated"):
            return "lead_created"

        # 6. Lead created
        if "log_inquiry" in tools:
            return "lead_created"

        # 7. Callback
        if "request_callback" in tools:
            return "callback_scheduled"

        # 8. Complaint detection
        complaint_keywords = ["complaint", "not working", "broken", "issue with", "problem with",
                              "damaged", "defective", "faulty", "poor service", "disappointed"]
        if any(kw in transcript for kw in complaint_keywords):
            return "complaint_logged"

        # 9. Not interested
        reject_keywords = ["not interested", "don't call", "wrong number", "do not call",
                           "stop calling", "don't need", "not now"]
        if any(kw in transcript for kw in reject_keywords):
            if "wrong number" in transcript:
                return "wrong_number"
            return "not_interested"

        # 10. Information provided (default for answered calls)
        if "get_product_info" in tools or "check_financing" in tools:
            return "information_provided"

        # 11. Default: answered with interaction
        if duration_seconds > 15:
            return "information_provided"

        return "hung_up"

    def requires_follow_up(self, outcome: str) -> bool:
        """Determine if outcome warrants WhatsApp/callback follow-up."""
        follow_up_outcomes = {
            "demo_booked", "service_booked", "lead_created",
            "callback_scheduled", "complaint_logged",
        }
        return outcome in follow_up_outcomes

    def get_follow_up_priority(self, outcome: str) -> str:
        """Priority level for follow-up queue."""
        high = {"demo_booked", "service_booked", "complaint_logged"}
        medium = {"lead_created", "callback_scheduled"}
        if outcome in high:
            return "high"
        if outcome in medium:
            return "medium"
        return "low"
