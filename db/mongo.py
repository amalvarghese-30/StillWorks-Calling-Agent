"""
MongoDB implementation of DatabaseBase.
10 collections: customers, calls, leads, appointments, campaigns,
                call_memory, transcripts, quotes, escalations, analytics.

Uses pymongo (sync) to keep the interface contract unchanged.
Products and inventory_cache are delegated to an internal SQLite connection.
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Optional

from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

from db.base import DatabaseBase
from db.schemas import COLLECTIONS, INDEXES, create_indexes

logger = logging.getLogger("manas-mongo")


class MongoDatabase(DatabaseBase):
    def __init__(self, uri: str = None, database: str = None, **kwargs):
        uri = uri or os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        database = database or os.getenv("MONGODB_DATABASE", "agriforge_voice")

        self.client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        self.db = self.client[database]

        # Verify connectivity
        try:
            self.client.admin.command("ping")
            logger.info(f"MongoDB connected: {database} at {uri}")
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.error(f"MongoDB connection failed: {e}")
            raise

        create_indexes(self.db)

        # Internal SQLite for products + inventory (not migrated to MongoDB)
        self._sqlite = None

    def _get_sqlite(self):
        """Lazy-init internal SQLite connection for products/inventory."""
        if self._sqlite is None:
            from db.sqlite import SQLiteDatabase
            self._sqlite = SQLiteDatabase()
        return self._sqlite

    def _migrate(self):
        pass  # No migration needed; indexes created in __init__

    def close(self):
        self.client.close()
        if self._sqlite:
            self._sqlite.close()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _now():
        return datetime.utcnow()

    @staticmethod
    def _oid(id_val):
        """Convert int or str id to ObjectId if needed."""
        from bson import ObjectId
        if isinstance(id_val, ObjectId):
            return id_val
        if isinstance(id_val, str) and len(id_val) == 24:
            try:
                return ObjectId(id_val)
            except Exception:
                pass
        return id_val

    # ------------------------------------------------------------------
    # Customers
    # ------------------------------------------------------------------

    def get_or_create_customer(self, phone: str, name: str = None) -> dict:
        phone = self._clean_phone(phone)
        doc = self.db.customers.find_one({"phone": phone})
        if doc:
            return dict(doc)
        new_doc = {
            "phone": phone,
            "name": name or "",
            "alternate_phone": "",
            "email": "",
            "address": "",
            "district": "Palakkad",
            "state": "Kerala",
            "language_preference": "ml",
            "customer_type": "farmer",
            "created_at": self._now(),
            "updated_at": self._now(),
        }
        result = self.db.customers.insert_one(new_doc)
        new_doc["_id"] = result.inserted_id
        return new_doc

    def lookup_user(self, phone: str) -> Optional[dict]:
        phone = self._clean_phone(phone)
        customer = self.db.customers.find_one({"phone": phone})
        if not customer:
            return None
        customer = dict(customer)
        customer["id"] = str(customer["_id"])

        # Enrich: latest call
        latest_call = self.db.calls.find_one(
            {"phone_number": phone},
            sort=[("created_at", DESCENDING)]
        )
        if latest_call:
            customer["last_call_created_at"] = latest_call.get("created_at", "")
            customer["last_call_id"] = str(latest_call.get("_id", ""))

        # Enrich: active bookings
        bookings = list(self.db.appointments.find(
            {"phone": phone, "status": {"$ne": "completed"}}
        ))
        customer["total_active_bookings"] = len(bookings)

        # Enrich: open leads
        open_leads = list(self.db.leads.find(
            {"phone": phone, "status": {"$nin": ["converted", "lost"]}}
        ))
        customer["total_open_leads"] = len(open_leads)

        return customer

    def format_customer_for_voice(self, phone: str) -> str:
        profile = self.lookup_user(phone)
        if not profile:
            return "New caller — no previous records found."

        parts = [f"{profile.get('name', 'Caller')} from {profile.get('district', 'Kerala')}."]

        prev_calls = profile.get("total_calls", 0)
        if prev_calls > 0:
            parts.append(f"{prev_calls} previous interaction(s) with us.")

        if profile.get("total_active_bookings"):
            parts.append(
                f"{profile['total_active_bookings']} active service booking(s)."
            )

        return " ".join(parts)

    def update_customer_language(self, phone: str, language: str):
        self.db.customers.update_one(
            {"phone": phone},
            {"$set": {
                "language_preference": language,
                "updated_at": self._now(),
            }}
        )

    # ------------------------------------------------------------------
    # Calls
    # ------------------------------------------------------------------

    def create_call(self, phone_number: str, direction: str, call_type: str = None,
                    room_name: str = None, dispatch_id: str = None,
                    language_used: str = None) -> int:
        phone = self._clean_phone(phone_number)
        # Look up customer
        customer = self.db.customers.find_one({"phone": phone})

        call_id_str = f"CALL-{datetime.now().strftime('%Y%m%d')}-{datetime.now().strftime('%H%M%S')}"
        doc = {
            "call_id": call_id_str,
            "customer_id": customer["_id"] if customer else None,
            "phone_number": phone,
            "direction": direction,
            "call_type": call_type or "general",
            "room_name": room_name,
            "dispatch_id": dispatch_id,
            "duration_seconds": 0,
            "status": "initiated",
            "language_used": language_used or "ml",
            "summary": "",
            "transcript": "",
            "transferred_to": "",
            "outcome": None,
            "escalation_tier": 1,
            "recording_url": "",
            "created_at": self._now(),
        }
        result = self.db.calls.insert_one(doc)
        return str(result.inserted_id)

    def update_call(self, call_id: int, **kwargs):
        oid = self._oid(call_id)
        self.db.calls.update_one({"_id": oid}, {"$set": kwargs})

    def get_call(self, call_id: int) -> Optional[dict]:
        oid = self._oid(call_id)
        doc = self.db.calls.find_one({"_id": oid})
        return dict(doc) if doc else None

    def get_recent_calls(self, limit: int = 50, direction: str = None) -> list:
        filt = {}
        if direction:
            filt["direction"] = direction
        return list(self.db.calls.find(filt).sort("created_at", -1).limit(limit))

    # ------------------------------------------------------------------
    # Service Bookings → Appointments
    # ------------------------------------------------------------------

    def create_service_booking(self, customer_name: str, phone: str, model: str,
                               issue_description: str, preferred_date: str,
                               time_slot: str, location: str = None,
                               service_type: str = "repair",
                               registration_number: str = None) -> str:
        phone = self._clean_phone(phone)
        customer = self.db.customers.find_one({"phone": phone})
        booking_ref = self._generate_booking_ref()

        doc = {
            "booking_ref": booking_ref,
            "customer_id": customer["_id"] if customer else None,
            "customer_name": customer_name,
            "phone": phone,
            "type": "demo" if service_type == "demo" else "service",
            "product_model": model,
            "issue_description": issue_description,
            "date": preferred_date,
            "time_slot": time_slot,
            "location": location or "",
            "status": "pending",
            "technician_notes": "",
            "registration_number": registration_number,
            "created_at": self._now(),
            "updated_at": self._now(),
        }
        self.db.appointments.insert_one(doc)
        return booking_ref

    def get_service_status(self, phone: str = None, booking_ref: str = None) -> list:
        if booking_ref:
            docs = list(self.db.appointments.find({"booking_ref": booking_ref}))
        elif phone:
            docs = list(self.db.appointments.find({"phone": self._clean_phone(phone)}))
        else:
            docs = []
        return [dict(d) for d in docs]

    def format_service_status_for_voice(self, phone: str = None,
                                        booking_ref: str = None) -> str:
        bookings = self.get_service_status(phone=phone, booking_ref=booking_ref)
        if not bookings:
            return "No service bookings found."
        parts = []
        for b in bookings:
            parts.append(
                f"Booking {b['booking_ref']}: {b['type']} for {b['product_model']} "
                f"on {b['date']} ({b['time_slot']}). Status: {b['status']}."
            )
        return " ".join(parts)

    def update_service_booking(self, booking_ref: str, **kwargs):
        kwargs["updated_at"] = self._now()
        self.db.appointments.update_one(
            {"booking_ref": booking_ref},
            {"$set": kwargs}
        )

    def get_all_service_bookings(self, status: str = None, limit: int = 100) -> list:
        filt = {}
        if status:
            filt["status"] = status
        return list(self.db.appointments.find(filt).limit(limit))

    # ------------------------------------------------------------------
    # Products — delegated to internal SQLite
    # ------------------------------------------------------------------

    def search_products(self, query: str) -> list:
        return self._get_sqlite().search_products(query)

    def get_product_by_model(self, model: str) -> Optional[dict]:
        return self._get_sqlite().get_product_by_model(model)

    def format_product_for_voice(self, product: dict) -> str:
        return self._get_sqlite().format_product_for_voice(product)

    def format_product_list_for_voice(self, products: list, max_items: int = 5) -> str:
        return self._get_sqlite().format_product_list_for_voice(products, max_items)

    # ------------------------------------------------------------------
    # Leads
    # ------------------------------------------------------------------

    def create_lead(self, customer_name: str, phone: str, interest: str,
                    product_of_interest: str = None, source: str = "inbound_call",
                    call_id: int = None, notes: str = None) -> int:
        phone = self._clean_phone(phone)
        doc = {
            "customer_name": customer_name,
            "phone": phone,
            "interest": interest,
            "product_of_interest": product_of_interest,
            "product_model": product_of_interest,
            "source": source,
            "call_id": self._oid(call_id) if call_id else None,
            "customer_id": None,
            "status": "new",
            "notes": notes or "",
            "assigned_to": "",
            "budget_min": None,
            "budget_max": None,
            "urgency": "medium",
            "timeline": "",
            "lead_score": 0,
            "intent": "",
            "created_at": self._now(),
            "updated_at": self._now(),
        }
        # Link to customer if exists
        customer = self.db.customers.find_one({"phone": phone})
        if customer:
            doc["customer_id"] = customer["_id"]

        result = self.db.leads.insert_one(doc)
        return str(result.inserted_id)

    def get_leads(self, status: str = None, limit: int = 100) -> list:
        filt = {}
        if status:
            filt["status"] = status
        return list(self.db.leads.find(filt).sort("created_at", -1).limit(limit))

    def update_lead(self, lead_id: int, **kwargs):
        kwargs["updated_at"] = self._now()
        self.db.leads.update_one({"_id": self._oid(lead_id)}, {"$set": kwargs})

    # ------------------------------------------------------------------
    # Follow-ups
    # ------------------------------------------------------------------

    def create_follow_up(self, phone: str, reason: str, follow_up_type: str = "callback",
                         preferred_time: str = None, call_id: int = None) -> int:
        phone = self._clean_phone(phone)
        customer = self.db.customers.find_one({"phone": phone})
        doc = {
            "customer_id": customer["_id"] if customer else None,
            "phone": phone,
            "type": follow_up_type,
            "reason": reason,
            "preferred_time": preferred_time,
            "status": "pending",
            "call_id": self._oid(call_id) if call_id else None,
            "due_date": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
            "completed_at": None,
            "created_at": self._now(),
        }
        result = self.db.follow_ups.insert_one(doc) if "follow_ups" in self.db.list_collection_names() else None
        if result:
            return str(result.inserted_id)
        # Fallback: store in calls collection as embedded if follow_ups collection doesn't exist
        if call_id:
            self.db.calls.update_one(
                {"_id": self._oid(call_id)},
                {"$push": {"follow_ups": doc}}
            )
        return 0

    def get_pending_follow_ups(self, limit: int = 50) -> list:
        if "follow_ups" in self.db.list_collection_names():
            return list(self.db.follow_ups.find(
                {"status": "pending"}
            ).limit(limit))
        return []

    def complete_follow_up(self, follow_up_id: int, call_id: int = None):
        if "follow_ups" in self.db.list_collection_names():
            self.db.follow_ups.update_one(
                {"_id": self._oid(follow_up_id)},
                {"$set": {"status": "completed", "completed_at": self._now()}}
            )

    # ------------------------------------------------------------------
    # Statistics
    # ------------------------------------------------------------------

    def get_stats(self) -> dict:
        return {
            "total_calls": self.db.calls.count_documents({}),
            "inbound_calls": self.db.calls.count_documents({"direction": "inbound"}),
            "outbound_calls": self.db.calls.count_documents({"direction": "outbound"}),
            "active_bookings": self.db.appointments.count_documents(
                {"status": {"$nin": ["completed", "cancelled"]}}
            ),
            "open_leads": self.db.leads.count_documents(
                {"status": {"$nin": ["converted", "lost"]}}
            ),
            "pending_follow_ups": 0,
            "total_customers": self.db.customers.count_documents({}),
        }

    # ------------------------------------------------------------------
    # Call Memory — stored as a full JSON document in its own collection
    # ------------------------------------------------------------------

    def save_call_memory(self, call_id: int, memory_data: dict):
        """Store call memory as a complete JSON document."""
        oid = self._oid(call_id)
        self.db.call_memory.update_one(
            {"call_id": oid},
            {"$set": {
                "call_id": oid,
                "memory_data": memory_data,
                "phone_number": memory_data.get("customer", {}).get("phone", ""),
                "language": memory_data.get("language", ""),
                "updated_at": self._now(),
            },
             "$setOnInsert": {"created_at": self._now()}},
            upsert=True
        )

    def load_call_memory(self, call_id: int) -> Optional[dict]:
        oid = self._oid(call_id)
        doc = self.db.call_memory.find_one({"call_id": oid})
        if not doc:
            return None
        memory = doc.get("memory_data", {})
        return {"memory": memory, **memory}

    def update_call_memory_summary(self, call_id: int, summary: str, intent: str):
        oid = self._oid(call_id)
        # Update the summary in the call_memory document
        self.db.call_memory.update_one(
            {"call_id": oid},
            {"$set": {
                "memory_data.call_summary": summary,
                "memory_data.intent": intent,
                "updated_at": self._now(),
            }}
        )
        # Also update the calls collection for dashboard access
        self.db.calls.update_one(
            {"_id": oid},
            {"$set": {"summary": summary, "intent": intent}}
        )

    def append_transcript(self, call_id: int, role: str, text: str):
        """Append a conversation turn to the transcripts collection."""
        oid = self._oid(call_id)
        timestamp = datetime.now().strftime("%H:%M:%S")
        turn = f"[{timestamp}] {role}: {text}\n"

        # Append to transcripts collection
        self.db.transcripts.update_one(
            {"call_id": oid},
            {"$set": {
                "call_id": oid,
                "updated_at": self._now(),
            },
             "$push": {"turns": {
                 "timestamp": timestamp,
                 "role": role,
                 "text": text,
             }},
             "$setOnInsert": {"created_at": self._now()}},
            upsert=True
        )

        # Also update the calls.transcript field (full text for dashboard display)
        self.db.calls.update_one(
            {"_id": oid},
            {"$set": {
                "transcript": {"$concat": [
                    {"$ifNull": ["$transcript", ""]},
                    turn
                ]}
            }}
        )

    # ------------------------------------------------------------------
    # Escalations — standalone collection
    # ------------------------------------------------------------------

    def create_escalation(self, call_id: int, tier: int, reason: str,
                          action_taken: str) -> int:
        doc = {
            "call_id": self._oid(call_id),
            "tier": tier,
            "reason": reason,
            "action_taken": action_taken,
            "resolved_by": None,
            "resolved_at": None,
            "status": "pending" if tier >= 2 else "auto_resolved",
            "created_at": self._now(),
        }
        result = self.db.escalations.insert_one(doc)
        return str(result.inserted_id)

    def get_pending_escalations(self, limit: int = 50) -> list:
        return list(self.db.escalations.find(
            {"status": "pending"}
        ).sort("tier", -1).limit(limit))

    def resolve_escalation(self, escalation_id: int, resolved_by: str):
        self.db.escalations.update_one(
            {"_id": self._oid(escalation_id)},
            {"$set": {
                "status": "resolved",
                "resolved_by": resolved_by,
                "resolved_at": self._now(),
            }}
        )

    # ------------------------------------------------------------------
    # Quotes — standalone collection
    # ------------------------------------------------------------------

    def create_quote(self, quote_id: str, call_id: int, customer_name: str, phone: str,
                     brand: str, model: str, ex_showroom_price: float,
                     total_price: float, financing_options_json: str,
                     valid_until: str) -> int:
        phone = self._clean_phone(phone)
        customer = self.db.customers.find_one({"phone": phone})
        doc = {
            "quote_id": quote_id,
            "call_id": self._oid(call_id) if call_id else None,
            "customer_id": customer["_id"] if customer else None,
            "customer_name": customer_name,
            "phone": phone,
            "brand": brand,
            "model": model,
            "ex_showroom_price": ex_showroom_price,
            "total_price": total_price,
            "financing_options_json": financing_options_json,
            "valid_until": valid_until,
            "status": "draft",
            "created_at": self._now(),
        }
        result = self.db.quotes.insert_one(doc)
        return str(result.inserted_id)

    def get_quote(self, quote_id: str) -> Optional[dict]:
        doc = self.db.quotes.find_one({"quote_id": quote_id})
        return dict(doc) if doc else None

    def update_quote_status(self, quote_id: str, status: str):
        self.db.quotes.update_one(
            {"quote_id": quote_id},
            {"$set": {"status": status}}
        )

    # ------------------------------------------------------------------
    # Inventory Cache — delegated to internal SQLite
    # ------------------------------------------------------------------

    def seed_inventory_cache(self):
        return self._get_sqlite().seed_inventory_cache()

    def check_inventory(self, brand: str = None, model: str = None) -> list:
        return self._get_sqlite().check_inventory(brand=brand, model=model)

    def get_alternatives_in_stock(self, category: str, subcategory: str = None,
                                  budget_max: float = None,
                                  exclude_model: str = None) -> list:
        return self._get_sqlite().get_alternatives_in_stock(
            category=category, subcategory=subcategory,
            budget_max=budget_max, exclude_model=exclude_model,
        )

    def update_product_stock(self, product_id: int, quantity: int,
                             restock_eta_days: int = None):
        self._get_sqlite().update_product_stock(product_id, quantity, restock_eta_days)

    # ------------------------------------------------------------------
    # Lead Scoring helpers
    # ------------------------------------------------------------------

    def update_lead_score(self, lead_id: int, score: int, budget_min: float = None,
                          budget_max: float = None, urgency: str = None,
                          timeline: str = None):
        update = {"lead_score": score, "updated_at": self._now()}
        if budget_min is not None:
            update["budget_min"] = budget_min
        if budget_max is not None:
            update["budget_max"] = budget_max
        if urgency is not None:
            update["urgency"] = urgency
        if timeline is not None:
            update["timeline"] = timeline
        self.db.leads.update_one(
            {"_id": self._oid(lead_id)},
            {"$set": update}
        )

    def get_hot_leads(self, limit: int = 20) -> list:
        return list(self.db.leads.find(
            {"lead_score": {"$gte": 80}}
        ).sort("lead_score", -1).limit(limit))

    # ------------------------------------------------------------------
    # Call Outcome helpers
    # ------------------------------------------------------------------

    def set_call_outcome(self, call_id: int, outcome: str, escalation_tier: int = 1):
        self.db.calls.update_one(
            {"_id": self._oid(call_id)},
            {"$set": {
                "outcome": outcome,
                "escalation_tier": escalation_tier,
            }}
        )

    def update_call_duration(self, call_id: int, duration_seconds: int):
        self.db.calls.update_one(
            {"_id": self._oid(call_id)},
            {"$set": {
                "duration_seconds": duration_seconds,
                "status": "completed",
            }}
        )

    # ------------------------------------------------------------------
    # Misc
    # ------------------------------------------------------------------

    def get_lead_by_id(self, lead_id: int) -> Optional[dict]:
        doc = self.db.leads.find_one({"_id": self._oid(lead_id)})
        return dict(doc) if doc else None

    def seed_products(self):
        return self._get_sqlite().seed_products()
