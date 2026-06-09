"""
CallMemory — Per-call conversation state manager.

Maintains the full conversation context for a single call as a JSON structure.
Persisted to SQLite call_memory table. Used by tools, scoring, and outcome modules.

Structure aligns with PROJECT_VISION.md specification.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

import config

logger = logging.getLogger("manas-memory")


class CallMemory:
    def __init__(self, call_id: int, phone_number: str, language: str, db):
        self.call_id = call_id
        self.db = db
        self._data = {
            "call_id": f"CALL-{datetime.now().strftime('%Y%m%d')}-{call_id:04d}",
            "customer": {
                "name": "",
                "phone": phone_number,
                "alternate_phone": "",
                "email": "",
                "district": "",
                "state": "Kerala",
                "farm_size_acres": None,
                "crop_types": [],
            },
            "language": language,
            "language_locked": False,
            "language_confirmed": False,
            "interest": {
                "product_category": "",
                "specific_model": "",
                "budget_min": None,
                "budget_max": None,
                "urgency": "low",
                "purchase_timeline": "",
            },
            "products_discussed": [],
            "appointment": {
                "type": "",
                "date": None,
                "time": None,
                "status": "",
            },
            "lead_score": 0,
            "call_summary": "",
            "transcript": "",
            "intent": "",
            "follow_up_required": False,
            "follow_up_date": None,
            "outcome": None,
            "escalation_tier": 0,
            "quote_generated": False,
            "tool_calls_made": [],
        }
        # Load existing customer profile
        self._load_customer_profile(phone_number)
        # Persist initial state
        self.save()

    # ------------------------------------------------------------------
    # Customer profile enrichment
    # ------------------------------------------------------------------

    def _load_customer_profile(self, phone: str):
        profile = self.db.lookup_user(phone)
        if profile:
            self._data["customer"].update({
                "name": profile.get("name", ""),
                "alternate_phone": profile.get("alternate_phone", ""),
                "email": profile.get("email", ""),
                "address": profile.get("address", ""),
                "district": profile.get("district", ""),
                "state": profile.get("state", "Kerala"),
                "language_preference": profile.get("language_preference", ""),
            })

    def update_customer_field(self, field: str, value):
        if field in self._data["customer"]:
            self._data["customer"][field] = value
            self.save()

    # ------------------------------------------------------------------
    # Language locking
    # ------------------------------------------------------------------

    def lock_language(self, language: str):
        self._data["language"] = language
        self._data["language_locked"] = True
        self._data["language_confirmed"] = True
        logger.info(f"Language locked: {language}")

        # Update customer preference
        phone = self._data["customer"]["phone"]
        if phone:
            try:
                self.db.update_customer_language(phone, language)
            except Exception:
                pass
        self.save()

    def is_language_locked(self) -> bool:
        return self._data["language_locked"]

    def get_language(self) -> str:
        return self._data["language"]

    # ------------------------------------------------------------------
    # Budget & Timeline tracking
    # ------------------------------------------------------------------

    def set_budget(self, min_amount: float, max_amount: float):
        self._data["interest"]["budget_min"] = min_amount
        self._data["interest"]["budget_max"] = max_amount
        if max_amount > 0:
            self._data["interest"]["urgency"] = "high" if max_amount < 500000 else "medium"
        logger.info(f"Budget captured: {min_amount} - {max_amount}")
        self.save()

    def set_timeline(self, timeline: str, urgency: str = "medium"):
        self._data["interest"]["purchase_timeline"] = timeline
        self._data["interest"]["urgency"] = urgency
        logger.info(f"Timeline captured: {timeline} (urgency={urgency})")
        self.save()

    # ------------------------------------------------------------------
    # Product tracking
    # ------------------------------------------------------------------

    def add_product_discussed(self, product: dict):
        entry = {
            "brand": product.get("brand", ""),
            "model": product.get("model", ""),
            "category": product.get("category", ""),
            "price_range": f"{product.get('approximate_price_min', 0)}-{product.get('approximate_price_max', 0)}",
        }
        if entry not in self._data["products_discussed"]:
            self._data["products_discussed"].append(entry)
            if len(self._data["products_discussed"]) == 1:
                self._data["interest"]["product_category"] = product.get("category", "")
                self._data["interest"]["specific_model"] = product.get("model", "")
        self.save()

    # ------------------------------------------------------------------
    # Appointment tracking
    # ------------------------------------------------------------------

    def set_appointment(self, appointment_type: str, date: str = None,
                        time: str = None, status: str = "pending"):
        self._data["appointment"] = {
            "type": appointment_type,
            "date": date,
            "time": time,
            "status": status,
        }
        self.save()

    # ------------------------------------------------------------------
    # Transcript
    # ------------------------------------------------------------------

    def append_transcript(self, role: str, text: str):
        """Append a conversation turn to the transcript."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        self._data["transcript"] += f"[{timestamp}] {role}: {text}\n"
        # Persist to DB for real-time access
        try:
            self.db.append_transcript(self.call_id, role, text)
        except Exception:
            pass

    def get_transcript(self) -> str:
        return self._data["transcript"]

    # ------------------------------------------------------------------
    # Tool call tracking
    # ------------------------------------------------------------------

    def record_tool_call(self, tool_name: str):
        self._data["tool_calls_made"].append(tool_name)

    def get_tool_calls(self) -> list:
        return self._data["tool_calls_made"]

    # ------------------------------------------------------------------
    # Outcome & Escalation
    # ------------------------------------------------------------------

    def set_outcome(self, outcome: str):
        self._data["outcome"] = outcome
        self.save()

    def set_escalation_tier(self, tier: int):
        self._data["escalation_tier"] = tier
        self.save()

    # ------------------------------------------------------------------
    # Quote tracking
    # ------------------------------------------------------------------

    def mark_quote_generated(self):
        self._data["quote_generated"] = True
        self.save()

    # ------------------------------------------------------------------
    # Post-call: intent extraction
    # ------------------------------------------------------------------

    def extract_and_set_intent(self):
        """
        Extract customer intent from transcript and tool calls.
        Rules-based extraction — does NOT call an LLM (post-call processing).
        """
        transcript_lower = self._data["transcript"].lower()
        tools = self._data["tool_calls_made"]

        # Detect primary intent from tool calls + transcript
        if "book_service" in tools:
            svc_type = self._data["appointment"].get("type", "")
            if svc_type == "demo":
                self._data["intent"] = "demo_booking"
            else:
                self._data["intent"] = "service_booking"
        elif "generate_quote" in tools:
            self._data["intent"] = "purchase_inquiry"
        elif "log_inquiry" in tools:
            self._data["intent"] = "product_inquiry"
        elif "request_callback" in tools:
            self._data["intent"] = "callback_request"
        elif "transfer_call" in tools:
            self._data["intent"] = "human_escalation"
        elif any(kw in transcript_lower for kw in ["complaint", "not working", "issue", "problem"]):
            self._data["intent"] = "complaint"
        elif any(kw in transcript_lower for kw in ["price", "cost", "emi", "loan", "finance"]):
            self._data["intent"] = "financing_inquiry"
        elif any(kw in transcript_lower for kw in ["demo", "test drive", "see", "visit showroom"]):
            self._data["intent"] = "demo_request"
        elif "get_product_info" in tools:
            self._data["intent"] = "information_request"
        else:
            self._data["intent"] = "general_inquiry"

        logger.info(f"Intent extracted: {self._data['intent']}")
        self.save()
        return self._data["intent"]

    # ------------------------------------------------------------------
    # Post-call: AI summary generation input
    # ------------------------------------------------------------------

    def build_summary_context(self) -> str:
        """Build a structured context string for post-call summary generation."""
        customer = self._data["customer"]
        interest = self._data["interest"]
        tools = self._data["tool_calls_made"]

        parts = [
            f"Call ID: {self._data['call_id']}",
            f"Language: {self._data['language']}",
            f"Customer: {customer.get('name', 'Unknown')} | Phone: {customer.get('phone', '')}",
            f"District: {customer.get('district', 'Unknown')}",
            f"Interest: {interest.get('product_category', 'N/A')} | Model: {interest.get('specific_model', 'N/A')}",
            f"Budget: {interest.get('budget_min', 'N/A')} - {interest.get('budget_max', 'N/A')}",
            f"Timeline: {interest.get('purchase_timeline', 'N/A')} (urgency: {interest.get('urgency', 'N/A')})",
            f"Products discussed: {len(self._data['products_discussed'])}",
            f"Tools used: {', '.join(tools) if tools else 'none'}",
            f"Appointment: {self._data['appointment']}",
            f"Intent: {self._data.get('intent', 'unknown')}",
            f"Follow-up required: {self._data['follow_up_required']}",
            f"\nTranscript:\n{self._data['transcript'][-2000:]}",  # Last 2000 chars
        ]
        return "\n".join(parts)

    def set_summary(self, summary: str):
        self._data["call_summary"] = summary
        self.db.update_call_memory_summary(self.call_id, summary, self._data.get("intent", ""))
        self.save()

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        return self._data

    def save(self):
        try:
            self.db.save_call_memory(self.call_id, self._data)
        except Exception as e:
            logger.warning(f"Failed to persist call memory: {e}")

    @classmethod
    def load(cls, call_id: int, db) -> Optional["CallMemory"]:
        record = db.load_call_memory(call_id)
        if not record or not record.get("memory"):
            return None
        instance = cls.__new__(cls)
        instance.call_id = call_id
        instance.db = db
        instance._data = record["memory"]
        return instance
