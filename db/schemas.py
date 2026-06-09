"""MongoDB collection schemas and index definitions for agriforge_voice."""

import logging

logger = logging.getLogger("manas-db-schemas")

COLLECTIONS = [
    "customers",
    "calls",
    "leads",
    "appointments",
    "campaigns",
    "call_memory",
    "transcripts",
    "quotes",
    "escalations",
    "analytics",
]

INDEXES = {
    "customers": [
        {"keys": [("phone", 1)], "unique": True, "name": "idx_customers_phone"},
        {"keys": [("district", 1)], "name": "idx_customers_district"},
        {"keys": [("status", 1)], "name": "idx_customers_status"},
        {"keys": [("language_preference", 1)], "name": "idx_customers_lang"},
    ],
    "calls": [
        {"keys": [("call_id", 1)], "unique": True, "name": "idx_calls_call_id"},
        {"keys": [("customer_id", 1)], "name": "idx_calls_customer"},
        {"keys": [("phone_number", 1)], "name": "idx_calls_phone"},
        {"keys": [("direction", 1)], "name": "idx_calls_direction"},
        {"keys": [("status", 1)], "name": "idx_calls_status"},
        {"keys": [("created_at", -1)], "name": "idx_calls_created"},
        {"keys": [("outcome", 1)], "name": "idx_calls_outcome"},
    ],
    "leads": [
        {"keys": [("customer_id", 1)], "name": "idx_leads_customer"},
        {"keys": [("call_id", 1)], "name": "idx_leads_call"},
        {"keys": [("phone", 1)], "name": "idx_leads_phone"},
        {"keys": [("status", 1)], "name": "idx_leads_status"},
        {"keys": [("lead_score", -1)], "name": "idx_leads_score"},
        {"keys": [("created_at", -1)], "name": "idx_leads_created"},
    ],
    "appointments": [
        {"keys": [("booking_ref", 1)], "unique": True, "name": "idx_appointments_booking_ref"},
        {"keys": [("customer_id", 1)], "name": "idx_appointments_customer"},
        {"keys": [("date", 1)], "name": "idx_appointments_date"},
        {"keys": [("status", 1)], "name": "idx_appointments_status"},
        {"keys": [("type", 1)], "name": "idx_appointments_type"},
    ],
    "campaigns": [
        {"keys": [("status", 1)], "name": "idx_campaigns_status"},
        {"keys": [("type", 1)], "name": "idx_campaigns_type"},
        {"keys": [("schedule_start", 1)], "name": "idx_campaigns_schedule"},
    ],
    "call_memory": [
        {"keys": [("call_id", 1)], "unique": True, "name": "idx_call_memory_call_id"},
        {"keys": [("phone_number", 1)], "name": "idx_call_memory_phone"},
        {"keys": [("language", 1)], "name": "idx_call_memory_lang"},
    ],
    "transcripts": [
        {"keys": [("call_id", 1)], "unique": True, "name": "idx_transcripts_call_id"},
    ],
    "quotes": [
        {"keys": [("quote_id", 1)], "unique": True, "name": "idx_quotes_quote_id"},
        {"keys": [("call_id", 1)], "name": "idx_quotes_call"},
        {"keys": [("phone", 1)], "name": "idx_quotes_phone"},
        {"keys": [("created_at", -1)], "name": "idx_quotes_created"},
    ],
    "escalations": [
        {"keys": [("call_id", 1)], "name": "idx_escalations_call"},
        {"keys": [("status", 1)], "name": "idx_escalations_status"},
        {"keys": [("tier", 1)], "name": "idx_escalations_tier"},
        {"keys": [("created_at", -1)], "name": "idx_escalations_created"},
    ],
    "analytics": [
        {"keys": [("date", 1)], "unique": True, "name": "idx_analytics_date"},
        {"keys": [("category", 1)], "name": "idx_analytics_category"},
    ],
}


def create_indexes(db):
    """Create all indexes on the MongoDB database. Idempotent."""
    for coll_name, idx_list in INDEXES.items():
        try:
            existing = db[coll_name].index_information()
            for idx in idx_list:
                idx_name = idx.get("name", "")
                if idx_name and idx_name not in existing:
                    keys = idx.pop("keys")
                    db[coll_name].create_index(keys, **idx)
                    idx["keys"] = keys
                elif not idx_name:
                    keys = idx.pop("keys")
                    db[coll_name].create_index(keys, **idx)
                    idx["keys"] = keys
            logger.info(f"Indexes ready for '{coll_name}'")
        except Exception as e:
            logger.warning(f"Failed to create indexes for '{coll_name}': {e}")
