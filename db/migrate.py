"""
SQLite → MongoDB migration script.

Usage:
    python -m db.migrate

Reads all data from the active SQLite database and migrates to MongoDB.
Builds an ID mapping table for referential integrity between collections.
Read-only on SQLite — never deletes source data.

Prerequisites:
    - MONGODB_URI and MONGODB_DATABASE set in .env
    - MongoDB instance running and accessible
"""

import os
import json
import logging
import sys
from datetime import datetime

# Ensure the project root is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrate")


def migrate():
    from db.sqlite import SQLiteDatabase
    from db.mongo import MongoDatabase
    from bson import ObjectId

    logger.info("Connecting to SQLite...")
    sqlite = SQLiteDatabase()

    logger.info("Connecting to MongoDB...")
    mongo = MongoDatabase()

    # ID mapping: {table_name: {old_int_id: new_ObjectId}}
    id_map = {}

    # ==================================================================
    # 1. customers
    # ==================================================================
    logger.info("Migrating customers...")
    id_map["customers"] = {}
    customer_rows = list(sqlite.conn.execute("SELECT * FROM customers"))
    for row in customer_rows:
        r = dict(row)
        old_id = r.pop("id")
        doc = {
            "name": r.get("name", ""),
            "phone": r.get("phone", ""),
            "alternate_phone": r.get("alternate_phone", ""),
            "email": r.get("email", ""),
            "address": r.get("address", ""),
            "district": r.get("district", "Palakkad"),
            "state": r.get("state", "Kerala"),
            "language_preference": r.get("language_preference", "ml"),
            "customer_type": r.get("customer_type", "farmer"),
            "created_at": r.get("created_at", datetime.utcnow()),
            "updated_at": r.get("updated_at", datetime.utcnow()),
        }
        result = mongo.db.customers.insert_one(doc)
        id_map["customers"][old_id] = result.inserted_id
    logger.info(f"  {len(customer_rows)} customers migrated")

    # ==================================================================
    # 2. calls
    # ==================================================================
    logger.info("Migrating calls...")
    id_map["calls"] = {}
    call_rows = list(sqlite.conn.execute("SELECT * FROM calls"))
    for row in call_rows:
        r = dict(row)
        old_id = r.pop("id")
        customer_id = id_map["customers"].get(r.get("customer_id"))

        doc = {
            "call_id": f"CALL-{r.get('created_at','20260609')[:10].replace('-','')}-{old_id:04d}",
            "customer_id": customer_id,
            "phone_number": r.get("phone_number", ""),
            "direction": r.get("direction", "inbound"),
            "call_type": r.get("call_type") or "general",
            "room_name": r.get("room_name"),
            "dispatch_id": r.get("dispatch_id"),
            "duration_seconds": r.get("duration_seconds") or 0,
            "status": r.get("status", "initiated"),
            "language_used": r.get("language_used") or "ml",
            "summary": r.get("summary") or "",
            "transcript": "",
            "transferred_to": r.get("transferred_to") or "",
            "outcome": r.get("outcome"),
            "escalation_tier": r.get("escalation_tier") or 1,
            "recording_url": r.get("recording_url") or "",
            "created_at": r.get("created_at", datetime.utcnow()),
        }
        result = mongo.db.calls.insert_one(doc)
        id_map["calls"][old_id] = result.inserted_id
    logger.info(f"  {len(call_rows)} calls migrated")

    # ==================================================================
    # 3. call_memory → call_memory + transcripts
    # ==================================================================
    logger.info("Migrating call_memory...")
    memory_rows = list(sqlite.conn.execute("SELECT * FROM call_memory"))
    memory_count = 0
    transcript_count = 0
    for row in memory_rows:
        r = dict(row)
        call_oid = id_map["calls"].get(r.get("call_id"))
        if not call_oid:
            continue

        # Parse the memory JSON
        memory_json = {}
        try:
            memory_json = json.loads(r.get("memory_json", "{}"))
        except (json.JSONDecodeError, TypeError):
            memory_json = {}

        # Store full call_memory document
        mongo.db.call_memory.update_one(
            {"call_id": call_oid},
            {"$set": {
                "call_id": call_oid,
                "memory_data": memory_json,
                "phone_number": memory_json.get("customer", {}).get("phone", ""),
                "language": memory_json.get("language", ""),
                "created_at": r.get("created_at", datetime.utcnow()),
                "updated_at": r.get("updated_at", datetime.utcnow()),
            }},
            upsert=True
        )
        memory_count += 1

        # Extract transcript into transcripts collection
        transcript_text = memory_json.get("transcript", "") or r.get("transcript", "")
        if transcript_text.strip():
            mongo.db.transcripts.update_one(
                {"call_id": call_oid},
                {"$set": {
                    "call_id": call_oid,
                    "full_text": transcript_text,
                    "created_at": r.get("created_at", datetime.utcnow()),
                    "updated_at": datetime.utcnow(),
                }},
                upsert=True
            )
            transcript_count += 1

        # Update calls with summary and intent
        summary = memory_json.get("call_summary", "") or r.get("summary", "")
        intent = memory_json.get("intent", "") or r.get("intent", "")
        if summary or intent:
            mongo.db.calls.update_one(
                {"_id": call_oid},
                {"$set": {
                    "summary": summary,
                    "transcript": transcript_text,
                    "intent": intent,
                }}
            )

    logger.info(f"  {memory_count} call_memory documents migrated")
    logger.info(f"  {transcript_count} transcripts migrated")

    # ==================================================================
    # 4. leads
    # ==================================================================
    logger.info("Migrating leads...")
    id_map["leads"] = {}
    lead_rows = list(sqlite.conn.execute("SELECT * FROM leads"))
    for row in lead_rows:
        r = dict(row)
        old_id = r.pop("id")
        call_oid = id_map["calls"].get(r.get("call_id"))

        doc = {
            "customer_name": r.get("customer_name", ""),
            "phone": r.get("phone", ""),
            "interest": r.get("interest", ""),
            "product_of_interest": r.get("product_of_interest"),
            "product_model": r.get("product_of_interest"),
            "source": r.get("source", "inbound_call"),
            "call_id": call_oid,
            "customer_id": id_map["customers"].get(
                dict(sqlite.conn.execute(
                    "SELECT id FROM customers WHERE phone=?", (r.get("phone", ""),)
                ).fetchone() or {}).get("id")
            ) if r.get("phone") else None,
            "status": r.get("status", "new"),
            "notes": r.get("notes") or "",
            "assigned_to": r.get("assigned_to") or "",
            "budget_min": r.get("budget_min"),
            "budget_max": r.get("budget_max"),
            "urgency": r.get("urgency", "medium"),
            "timeline": r.get("timeline") or "",
            "lead_score": r.get("lead_score") or 0,
            "intent": r.get("intent") or "",
            "created_at": r.get("created_at", datetime.utcnow()),
            "updated_at": r.get("updated_at", datetime.utcnow()),
        }
        result = mongo.db.leads.insert_one(doc)
        id_map["leads"][old_id] = result.inserted_id
    logger.info(f"  {len(lead_rows)} leads migrated")

    # ==================================================================
    # 5. service_bookings → appointments
    # ==================================================================
    logger.info("Migrating service_bookings → appointments...")
    booking_rows = list(sqlite.conn.execute("SELECT * FROM service_bookings"))
    for row in booking_rows:
        r = dict(row)
        customer_id = id_map["customers"].get(r.get("customer_id"))

        doc = {
            "booking_ref": r.get("booking_ref", ""),
            "customer_id": customer_id,
            "customer_name": r.get("customer_name", ""),
            "phone": r.get("phone", ""),
            "type": "demo" if r.get("service_type") == "demo" else "service",
            "product_model": r.get("model", ""),
            "issue_description": r.get("issue_description", ""),
            "date": r.get("preferred_date", ""),
            "time_slot": r.get("time_slot", ""),
            "location": r.get("location", ""),
            "status": r.get("status", "pending"),
            "technician_notes": r.get("technician_notes") or "",
            "created_at": r.get("created_at", datetime.utcnow()),
            "updated_at": r.get("updated_at", datetime.utcnow()),
        }
        mongo.db.appointments.insert_one(doc)
    logger.info(f"  {len(booking_rows)} appointments migrated")

    # ==================================================================
    # 6. escalations
    # ==================================================================
    logger.info("Migrating escalations...")
    esc_rows = list(sqlite.conn.execute("SELECT * FROM escalations"))
    for row in esc_rows:
        r = dict(row)
        call_oid = id_map["calls"].get(r.get("call_id"))
        doc = {
            "call_id": call_oid,
            "tier": r.get("tier", 1),
            "reason": r.get("reason", ""),
            "action_taken": r.get("action_taken", ""),
            "resolved_by": r.get("resolved_by"),
            "resolved_at": r.get("resolved_at"),
            "status": "resolved" if r.get("resolved_by") else "pending",
            "created_at": r.get("created_at", datetime.utcnow()),
        }
        mongo.db.escalations.insert_one(doc)
    logger.info(f"  {len(esc_rows)} escalations migrated")

    # ==================================================================
    # 7. quotes
    # ==================================================================
    logger.info("Migrating quotes...")
    quote_rows = list(sqlite.conn.execute("SELECT * FROM quotes"))
    for row in quote_rows:
        r = dict(row)
        call_oid = id_map["calls"].get(r.get("call_id"))
        customer_id = id_map["customers"].get(r.get("customer_id"))
        doc = {
            "quote_id": r.get("quote_id", ""),
            "call_id": call_oid,
            "customer_id": customer_id,
            "customer_name": r.get("customer_name", ""),
            "phone": r.get("phone", ""),
            "brand": r.get("brand", ""),
            "model": r.get("model", ""),
            "ex_showroom_price": r.get("ex_showroom_price", 0),
            "total_price": r.get("total_price", 0),
            "financing_options_json": r.get("financing_options_json", "[]"),
            "valid_until": r.get("valid_until", ""),
            "status": r.get("status", "draft"),
            "created_at": r.get("created_at", datetime.utcnow()),
        }
        mongo.db.quotes.insert_one(doc)
    logger.info(f"  {len(quote_rows)} quotes migrated")

    # ==================================================================
    # Report
    # ==================================================================
    print()
    print("=" * 50)
    print("MIGRATION COMPLETE")
    print("=" * 50)
    print(f"  Customers:    {len(customer_rows):>6} migrated")
    print(f"  Calls:        {len(call_rows):>6} migrated")
    print(f"  Call Memory:  {memory_count:>6} migrated")
    print(f"  Transcripts:  {transcript_count:>6} migrated")
    print(f"  Leads:        {len(lead_rows):>6} migrated")
    print(f"  Appointments: {len(booking_rows):>6} migrated")
    print(f"  Escalations:  {len(esc_rows):>6} migrated")
    print(f"  Quotes:       {len(quote_rows):>6} migrated")
    print(f"  Campaigns:          0 (no SQLite source)")
    print(f"  Analytics:          0 (no SQLite source)")
    print("=" * 50)
    print()
    print("Verification:")
    print(f"  MongoDB customers:    {mongo.db.customers.count_documents({})}")
    print(f"  MongoDB calls:        {mongo.db.calls.count_documents({})}")
    print(f"  MongoDB call_memory:  {mongo.db.call_memory.count_documents({})}")
    print(f"  MongoDB transcripts:  {mongo.db.transcripts.count_documents({})}")
    print(f"  MongoDB leads:        {mongo.db.leads.count_documents({})}")
    print(f"  MongoDB appointments: {mongo.db.appointments.count_documents({})}")
    print(f"  MongoDB escalations:  {mongo.db.escalations.count_documents({})}")
    print(f"  MongoDB quotes:       {mongo.db.quotes.count_documents({})}")
    print()
    print("SQLite data is preserved intact. MongoDB data is a copy.")
    print("To use MongoDB, set DB_BACKEND=mongodb in .env")

    sqlite.close()
    mongo.close()


if __name__ == "__main__":
    migrate()
