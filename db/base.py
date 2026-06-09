"""
DatabaseBase — Interface contract for database backends.

Both SQLiteDatabase and MongoDatabase implement this interface.
All methods raise NotImplementedError on the base class.
"""

import logging
from typing import Optional

logger = logging.getLogger("manas-db")


class DatabaseBase:
    """Interface for database operations. Subclass and implement all methods."""

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def __init__(self, **kwargs):
        raise NotImplementedError

    def close(self):
        raise NotImplementedError

    def _migrate(self):
        raise NotImplementedError

    # ------------------------------------------------------------------
    # Seed
    # ------------------------------------------------------------------

    def seed_products(self):
        raise NotImplementedError

    # ------------------------------------------------------------------
    # Customers
    # ------------------------------------------------------------------

    def get_or_create_customer(self, phone: str, name: str = None) -> dict:
        raise NotImplementedError

    def lookup_user(self, phone: str) -> Optional[dict]:
        raise NotImplementedError

    def format_customer_for_voice(self, phone: str) -> str:
        raise NotImplementedError

    def update_customer_language(self, phone: str, language: str):
        raise NotImplementedError

    # ------------------------------------------------------------------
    # Calls
    # ------------------------------------------------------------------

    def create_call(self, phone_number: str, direction: str, call_type: str = None,
                    room_name: str = None, dispatch_id: str = None,
                    language_used: str = None) -> int:
        raise NotImplementedError

    def update_call(self, call_id: int, **kwargs):
        raise NotImplementedError

    def get_call(self, call_id: int) -> Optional[dict]:
        raise NotImplementedError

    def get_recent_calls(self, limit: int = 50, direction: str = None) -> list:
        raise NotImplementedError

    # ------------------------------------------------------------------
    # Service Bookings / Appointments
    # ------------------------------------------------------------------

    def create_service_booking(self, customer_name: str, phone: str, model: str,
                               issue_description: str, preferred_date: str,
                               time_slot: str, location: str = None,
                               service_type: str = "repair",
                               registration_number: str = None) -> str:
        raise NotImplementedError

    def get_service_status(self, phone: str = None, booking_ref: str = None) -> list:
        raise NotImplementedError

    def format_service_status_for_voice(self, phone: str = None,
                                        booking_ref: str = None) -> str:
        raise NotImplementedError

    def update_service_booking(self, booking_ref: str, **kwargs):
        raise NotImplementedError

    def get_all_service_bookings(self, status: str = None, limit: int = 100) -> list:
        raise NotImplementedError

    # ------------------------------------------------------------------
    # Products
    # ------------------------------------------------------------------

    def search_products(self, query: str) -> list:
        raise NotImplementedError

    def get_product_by_model(self, model: str) -> Optional[dict]:
        raise NotImplementedError

    def format_product_for_voice(self, product: dict) -> str:
        raise NotImplementedError

    def format_product_list_for_voice(self, products: list, max_items: int = 5) -> str:
        raise NotImplementedError

    # ------------------------------------------------------------------
    # Leads
    # ------------------------------------------------------------------

    def create_lead(self, customer_name: str, phone: str, interest: str,
                    product_of_interest: str = None, source: str = "inbound_call",
                    call_id: int = None, notes: str = None) -> int:
        raise NotImplementedError

    def get_leads(self, status: str = None, limit: int = 100) -> list:
        raise NotImplementedError

    def update_lead(self, lead_id: int, **kwargs):
        raise NotImplementedError

    # ------------------------------------------------------------------
    # Follow-ups
    # ------------------------------------------------------------------

    def create_follow_up(self, phone: str, reason: str, follow_up_type: str = "callback",
                         preferred_time: str = None, call_id: int = None) -> int:
        raise NotImplementedError

    def get_pending_follow_ups(self, limit: int = 50) -> list:
        raise NotImplementedError

    def complete_follow_up(self, follow_up_id: int, call_id: int = None):
        raise NotImplementedError

    # ------------------------------------------------------------------
    # Statistics
    # ------------------------------------------------------------------

    def get_stats(self) -> dict:
        raise NotImplementedError

    # ------------------------------------------------------------------
    # Call Memory
    # ------------------------------------------------------------------

    def save_call_memory(self, call_id: int, memory_data: dict):
        raise NotImplementedError

    def load_call_memory(self, call_id: int) -> Optional[dict]:
        raise NotImplementedError

    def update_call_memory_summary(self, call_id: int, summary: str, intent: str):
        raise NotImplementedError

    def append_transcript(self, call_id: int, role: str, text: str):
        raise NotImplementedError

    # ------------------------------------------------------------------
    # Escalations
    # ------------------------------------------------------------------

    def create_escalation(self, call_id: int, tier: int, reason: str,
                          action_taken: str) -> int:
        raise NotImplementedError

    def get_pending_escalations(self, limit: int = 50) -> list:
        raise NotImplementedError

    def resolve_escalation(self, escalation_id: int, resolved_by: str):
        raise NotImplementedError

    # ------------------------------------------------------------------
    # Quotes
    # ------------------------------------------------------------------

    def create_quote(self, quote_id: str, call_id: int, customer_name: str, phone: str,
                     brand: str, model: str, ex_showroom_price: float,
                     total_price: float, financing_options_json: str,
                     valid_until: str) -> int:
        raise NotImplementedError

    def get_quote(self, quote_id: str) -> Optional[dict]:
        raise NotImplementedError

    def update_quote_status(self, quote_id: str, status: str):
        raise NotImplementedError

    # ------------------------------------------------------------------
    # Inventory Cache
    # ------------------------------------------------------------------

    def seed_inventory_cache(self):
        raise NotImplementedError

    def check_inventory(self, brand: str = None, model: str = None) -> list:
        raise NotImplementedError

    def get_alternatives_in_stock(self, category: str, subcategory: str = None,
                                  budget_max: float = None,
                                  exclude_model: str = None) -> list:
        raise NotImplementedError

    def update_product_stock(self, product_id: int, quantity: int,
                             restock_eta_days: int = None):
        raise NotImplementedError

    # ------------------------------------------------------------------
    # Lead Scoring helpers
    # ------------------------------------------------------------------

    def update_lead_score(self, lead_id: int, score: int, budget_min: float = None,
                          budget_max: float = None, urgency: str = None,
                          timeline: str = None):
        raise NotImplementedError

    def get_hot_leads(self, limit: int = 20) -> list:
        raise NotImplementedError

    # ------------------------------------------------------------------
    # Call Outcome helpers
    # ------------------------------------------------------------------

    def set_call_outcome(self, call_id: int, outcome: str, escalation_tier: int = 1):
        raise NotImplementedError

    def update_call_duration(self, call_id: int, duration_seconds: int):
        raise NotImplementedError

    # ------------------------------------------------------------------
    # Misc
    # ------------------------------------------------------------------

    def get_lead_by_id(self, lead_id: int) -> Optional[dict]:
        raise NotImplementedError

    # ------------------------------------------------------------------
    # Static helpers (shared across backends)
    # ------------------------------------------------------------------

    @staticmethod
    def _clean_phone(phone: str) -> str:
        return "".join(c for c in str(phone) if c.isdigit() or c == "+")[-12:]

    @staticmethod
    def _generate_booking_ref() -> str:
        import random
        from datetime import datetime
        return f"SRV-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
