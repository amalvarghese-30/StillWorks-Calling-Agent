"""
EscalationFramework — Multi-tier human escalation system.

TIER 1: AI handles completely — resolve and log.
TIER 2: AI handles, flags for human review — create escalation record.
TIER 3: Immediate transfer to human — transfer call via SIP.

Trigger detection runs after each user turn.
"""

import logging
from typing import Optional

import config

logger = logging.getLogger("manas-escalation")


class EscalationFramework:
    def __init__(self, db, call_memory, fnc_ctx):
        self.db = db
        self.call_memory = call_memory
        self.fnc_ctx = fnc_ctx
        self._attempts_on_topic = {}
        self._current_topic = None
        self._current_tier = 1

    def check_escalation(self, last_user_message: str) -> int:
        """
        Evaluate escalation triggers after each user turn.
        Returns the escalation tier (1-3).
        """
        if not last_user_message:
            return 1

        msg_lower = last_user_message.lower().strip()

        # --- TIER 3 triggers ---

        # Customer anger
        if self._detect_anger(msg_lower):
            return self._set_tier(3, "customer_anger")

        # Explicit human request
        if self._detect_human_request(msg_lower):
            return self._set_tier(3, "explicit_request")

        # Legal / compliance
        if self._detect_legal_issue(msg_lower):
            return self._set_tier(3, "legal_compliance")

        # --- TIER 2 triggers ---

        # Complex technical description
        if self._detect_complex_technical(msg_lower):
            return self._set_tier(2, "complex_technical")

        # Callback required
        if self._detect_callback_need(msg_lower):
            return self._set_tier(2, "callback_required")

        # No triggers hit
        return self._current_tier

    def track_ai_attempt(self, topic: str):
        """Increment AI attempt counter for a topic."""
        if topic != self._current_topic:
            self._current_topic = topic
            self._attempts_on_topic[topic] = 1
        else:
            self._attempts_on_topic[topic] = self._attempts_on_topic.get(topic, 0) + 1

        # 2+ failed attempts → escalate
        if self._attempts_on_topic.get(topic, 0) >= 2:
            logger.warning(f"AI confusion on topic '{topic}' after 2 attempts")
            self._set_tier(3, "ai_confusion_2_attempts")

    def should_transfer(self) -> bool:
        return self._current_tier >= 3

    def get_tier(self) -> int:
        return self._current_tier

    def execute_escalation(self, tier: int, reason: str) -> str:
        """Execute the escalation action for the given tier."""
        tier_config = config.ESCALATION_TIERS.get(tier, config.ESCALATION_TIERS[1])

        if tier == 3:
            return self._transfer_to_human(reason)
        if tier == 2:
            return self._flag_for_review(reason)
        return "AI handled successfully."

    def create_record(self, tier: int, reason: str, action_taken: str) -> int:
        try:
            escalation_id = self.db.create_escalation(
                self.call_memory.call_id, tier, reason, action_taken
            )
            logger.info(f"Escalation record created: id={escalation_id}, tier={tier}")
            return escalation_id
        except Exception as e:
            logger.error(f"Failed to create escalation record: {e}")
            return 0

    # ------------------------------------------------------------------
    # Internal detection methods
    # ------------------------------------------------------------------

    def _detect_anger(self, msg: str) -> bool:
        keywords = config.ANGER_KEYWORDS
        # Strong signal: repeated words (all-caps or exclamation)
        if msg.isupper() and len(msg) > 10:
            return True
        if msg.count("!") >= 2:
            return True
        return any(kw in msg for kw in keywords)

    def _detect_human_request(self, msg: str) -> bool:
        patterns = [
            "speak to human", "talk to someone", "real person",
            "connect me to", "put me through", "transfer",
            "agent", "representative", "supervisor", "manager",
            "not a robot", "actual person",
        ]
        return any(p in msg for p in patterns)

    def _detect_legal_issue(self, msg: str) -> bool:
        keywords = [
            "lawyer", "legal", "court", "sue", "attorney",
            "consumer court", "fraud", "police", "complaint filed",
        ]
        return any(kw in msg for kw in keywords)

    def _detect_complex_technical(self, msg: str) -> bool:
        keywords = [
            "engine seized", "hydraulic failure", "transmission broken",
            "complete failure", "total breakdown", "major repair",
            "rebuild", "overhaul", "cracked block", "blown head gasket",
        ]
        return any(kw in msg for kw in keywords)

    def _detect_callback_need(self, msg: str) -> bool:
        keywords = [
            "call me back", "call later", "not now", "busy",
            "in a meeting", "driving", "call tomorrow", "another time",
        ]
        return any(kw in msg for kw in keywords)

    # ------------------------------------------------------------------
    # Tier actions
    # ------------------------------------------------------------------

    def _set_tier(self, tier: int, trigger: str) -> int:
        if tier > self._current_tier:
            self._current_tier = tier
            self.call_memory.set_escalation_tier(tier)
            trigger_config = config.ESCALATION_TRIGGERS.get(trigger, {})
            action = trigger_config.get("action", "resolve_and_log")
            self.create_record(tier, trigger, action)
            logger.info(f"Escalation tier set to {tier} (trigger: {trigger})")
        return self._current_tier

    def _transfer_to_human(self, reason: str) -> str:
        """Initiate transfer via the function context's transfer tool."""
        logger.info(f"Initiating transfer to human. Reason: {reason}")
        # The actual transfer is done via tools.transfer_call
        return f"Transferring to human support. Reason: {reason}"

    def _flag_for_review(self, reason: str) -> str:
        logger.info(f"Flagging for human review. Reason: {reason}")
        return f"Flagged for review. A team member will follow up. Reason: {reason}"
