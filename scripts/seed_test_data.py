"""
Insert test data into SQLite for Phase 4A validation.
Run with: python scripts/seed_test_data.py

Schema-adapted to actual table columns.
"""
import sqlite3
import os, sys, json
from datetime import datetime, timedelta

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE, "data", "manas_group.db")

def seed():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    now = datetime.utcnow().isoformat()
    today = datetime.utcnow().strftime("%Y-%m-%d")
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")

    # Update existing test customers' names to match our test data
    cur.execute("UPDATE customers SET name='Rajesh Kumar', email='rajesh@example.com', address='42 Farm Road', district='Palakkad' WHERE phone='+919876543210'")
    print(f"[OK] Updated Rajesh (rows={cur.rowcount})")

    # Add Thomas if not exists
    cur.execute("SELECT id FROM customers WHERE phone='+919988776655'")
    if not cur.fetchone():
        cur.execute("INSERT INTO customers (name, phone, email, address, district, language_preference, customer_type, created_at) VALUES ('Thomas Mathew', '+919988776655', 'thomas@example.com', '78 Rubber Estate', 'Kottayam', 'ml', 'estate_owner', ?)", (now,))
        print("[OK] Thomas Mathew inserted")
    else:
        cur.execute("UPDATE customers SET name='Thomas Mathew', email='thomas@example.com', address='78 Rubber Estate', district='Kottayam' WHERE phone='+919988776655'")
        print(f"[OK] Updated Thomas (rows={cur.rowcount})")

    # Add Abdul if not exists
    cur.execute("SELECT id FROM customers WHERE phone='+918877665544'")
    if not cur.fetchone():
        cur.execute("INSERT INTO customers (name, phone, email, address, district, language_preference, customer_type, created_at) VALUES ('Abdul Rahman', '+918877665544', 'abdul@example.com', '15 Spice Garden', 'Idukki', 'ml', 'farmer', ?)", (now,))
        print("[OK] Abdul Rahman inserted")
    else:
        cur.execute("UPDATE customers SET name='Abdul Rahman', email='abdul@example.com', address='15 Spice Garden', district='Idukki' WHERE phone='+918877665544'")
        print(f"[OK] Updated Abdul (rows={cur.rowcount})")

    # Get customer IDs
    cur.execute("SELECT id, phone FROM customers")
    cust_map = {row[1]: row[0] for row in cur.fetchall()}
    rajesh_phone = "+919876543210"
    thomas_phone = "+919988776655"
    abdul_phone = "+918877665544"

    # === 5 CALLS (calls table has NO lead_score column) ===
    calls_to_add = [
        (rajesh_phone, "inbound", "inquiry", 180, "completed", "Inquiry about John Deere 5050D tractor", None, today, "inquiry"),
        (thomas_phone, "outbound", "follow_up", 90, "completed", "Follow-up on demo request for ACE 45 HP", None, yesterday, "follow_up"),
        (abdul_phone, "inbound", "service", 240, "completed", "Service request for Kirloskar rotavator repair", None, today, "service"),
        (rajesh_phone, "outbound", "promotional", 45, "no_answer", None, None, today, "no_answer"),
        (thomas_phone, "inbound", "inquiry", 150, "transferred", "Complex financing query - needs manager", 2, today, "transferred"),
    ]
    for phone, direction, call_type, duration, status, summary, esc_tier, date, outcome in calls_to_add:
        cur.execute(
            "INSERT INTO calls (phone_number, direction, call_type, duration_seconds, status, summary, escalation_tier, created_at, outcome) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (phone, direction, call_type, duration, status, summary, esc_tier, date, outcome)
        )
    print(f"[OK] 5 calls inserted")

    # Get call IDs for FK refs
    cur.execute("SELECT id, summary FROM calls ORDER BY id DESC LIMIT 10")
    call_rows = cur.fetchall()
    inquiry_call_id = next((r[0] for r in call_rows if r[1] and "5050D" in r[1]), call_rows[0][0] if call_rows else None)
    transferred_call_id = next((r[0] for r in call_rows if r[1] and "financing" in r[1].lower()), call_rows[-1][0] if call_rows else None)
    demo_call_id = next((r[0] for r in call_rows if r[1] and "demo" in r[1].lower()), call_rows[0][0] if call_rows else None)

    # === 2 LEADS ===
    cur.execute(
        "INSERT INTO leads (customer_name, phone, interest, product_of_interest, source, call_id, status, notes, lead_score, budget_min, budget_max, urgency, timeline, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ("Rajesh Kumar", rajesh_phone, "Buying new tractor", "John Deere 5050D", "inbound_call", inquiry_call_id, "qualified", "High intent - needs financing", 75, 650000, 800000, "high", "1 month", now)
    )
    cur.execute(
        "INSERT INTO leads (customer_name, phone, interest, product_of_interest, source, call_id, status, notes, lead_score, budget_min, budget_max, urgency, timeline, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ("Thomas Mathew", thomas_phone, "Upgrade tractor", "ACE 45 HP", "outbound_call", demo_call_id, "demo_scheduled", "Demo booked for next week", 60, 350000, 450000, "medium", "3 months", now)
    )
    print("[OK] 2 leads inserted")

    # === 2 APPOINTMENTS (service_bookings) ===
    future = (datetime.utcnow() + timedelta(days=3)).strftime("%Y-%m-%d")
    cur.execute(
        "INSERT INTO service_bookings (booking_ref, customer_name, phone, model, issue_description, service_type, preferred_date, time_slot, location, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ("SRV-20260609-1001", "Abdul Rahman", abdul_phone, "Kirloskar 55 HP", "Engine overheating during field work", "repair", today, "10:00 AM - 12:00 PM", "Idukki", "confirmed", now)
    )
    cur.execute(
        "INSERT INTO service_bookings (booking_ref, customer_name, phone, model, issue_description, service_type, preferred_date, time_slot, location, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ("SRV-20260609-1002", "Rajesh Kumar", rajesh_phone, "John Deere 5050D", "Demo and test drive request", "demo", future, "02:00 PM - 04:00 PM", "Palakkad", "confirmed", now)
    )
    print("[OK] 2 appointments inserted")

    # === 1 QUOTE ===
    valid_until = (datetime.utcnow() + timedelta(days=15)).strftime("%Y-%m-%d")
    cur.execute(
        "INSERT INTO quotes (quote_id, customer_name, phone, brand, model, ex_showroom_price, total_price, financing_options_json, valid_until, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ("QTE-20260609-001", "Rajesh Kumar", rajesh_phone, "John Deere", "5050D", 680000, 785000, '{"emi_3yr": 24500, "emi_5yr": 15800}', valid_until, "draft", now)
    )
    print("[OK] 1 quote inserted")

    # === 1 ESCALATION ===
    cur.execute(
        "INSERT INTO escalations (call_id, tier, reason, action_taken, created_at) VALUES (?, ?, ?, ?, ?)",
        (transferred_call_id, 2, "Complex financing query - escalated to sales manager", "Transferred to sales team", now)
    )
    print("[OK] 1 escalation inserted")

    # === 1 CALL_MEMORY for Rajesh (inquiry call) ===
    memory = json.dumps({
        "farm_size": "5 acres",
        "crops": ["Paddy", "Banana"],
        "equipment": ["Power Tiller", "Thresher"],
        "soil_type": "Laterite",
        "irrigation": "Borewell",
    })
    cur.execute(
        "INSERT INTO call_memory (call_id, memory_json, lead_score, outcome, summary, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (inquiry_call_id, memory, 75, "inquiry", "High intent buyer for John Deere 5050D", now)
    )
    print("[OK] 1 call_memory inserted")

    conn.commit()

    # Print summary counts
    print("\n=== Final Database Counts ===")
    for tbl in ["customers", "calls", "leads", "service_bookings", "quotes", "escalations", "call_memory"]:
        cur.execute(f"SELECT COUNT(*) FROM {tbl}")
        print(f"  {tbl}: {cur.fetchone()[0]}")

    conn.close()
    print("\nSeed complete.")

if __name__ == "__main__":
    seed()
