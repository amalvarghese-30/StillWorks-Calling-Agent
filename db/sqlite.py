"""
SQLite implementation of DatabaseBase.
Stores customers, calls, service bookings, products, leads, and follow-ups.
Relocated from root database.py into the package.
"""

import os
import sqlite3
import random
from datetime import datetime

from db.base import DatabaseBase


class SQLiteDatabase(DatabaseBase):
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_path = os.getenv("DATABASE_PATH", "data/manas_group.db")
        self.db_path = db_path

        # Ensure the data directory exists
        os.makedirs(os.path.dirname(db_path), exist_ok=True)

        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA foreign_keys=ON")
        self._migrate()

    def _migrate(self):
        cur = self.conn.cursor()

        cur.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT UNIQUE NOT NULL,
                alternate_phone TEXT,
                email TEXT,
                address TEXT,
                district TEXT DEFAULT 'Palakkad',
                state TEXT DEFAULT 'Kerala',
                language_preference TEXT DEFAULT 'ml',
                customer_type TEXT DEFAULT 'farmer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS calls (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER,
                phone_number TEXT NOT NULL,
                direction TEXT NOT NULL,
                call_type TEXT,
                room_name TEXT,
                dispatch_id TEXT,
                duration_seconds INTEGER,
                status TEXT DEFAULT 'initiated',
                language_used TEXT,
                summary TEXT,
                transferred_to TEXT,
                recording_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id)
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS service_bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_ref TEXT UNIQUE NOT NULL,
                customer_id INTEGER,
                customer_name TEXT NOT NULL,
                phone TEXT NOT NULL,
                model TEXT NOT NULL,
                registration_number TEXT,
                issue_description TEXT NOT NULL,
                service_type TEXT DEFAULT 'repair',
                preferred_date TEXT NOT NULL,
                time_slot TEXT NOT NULL,
                location TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                technician_notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id)
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                brand TEXT NOT NULL,
                model TEXT NOT NULL,
                category TEXT NOT NULL,
                subcategory TEXT,
                horsepower INTEGER,
                description TEXT,
                approximate_price_min REAL,
                approximate_price_max REAL,
                financing_available BOOLEAN DEFAULT 1,
                in_stock BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_products_brand_model
            ON products(brand, model)
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS leads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT NOT NULL,
                phone TEXT NOT NULL,
                interest TEXT NOT NULL,
                product_of_interest TEXT,
                source TEXT DEFAULT 'inbound_call',
                call_id INTEGER,
                status TEXT DEFAULT 'new',
                notes TEXT,
                assigned_to TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (call_id) REFERENCES calls(id)
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS follow_ups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER,
                phone TEXT NOT NULL,
                type TEXT NOT NULL,
                reason TEXT NOT NULL,
                preferred_time TEXT,
                status TEXT DEFAULT 'pending',
                call_id INTEGER,
                due_date TEXT,
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                FOREIGN KEY (call_id) REFERENCES calls(id)
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS call_memory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                call_id INTEGER UNIQUE NOT NULL,
                memory_json TEXT NOT NULL DEFAULT '{}',
                language_locked TEXT,
                lead_score INTEGER DEFAULT 0,
                outcome TEXT,
                intent TEXT,
                transcript TEXT DEFAULT '',
                summary TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (call_id) REFERENCES calls(id)
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS escalations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                call_id INTEGER NOT NULL,
                tier INTEGER NOT NULL DEFAULT 1,
                reason TEXT NOT NULL,
                action_taken TEXT NOT NULL,
                resolved_by TEXT,
                resolved_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (call_id) REFERENCES calls(id)
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS quotes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quote_id TEXT UNIQUE NOT NULL,
                call_id INTEGER,
                customer_id INTEGER,
                customer_name TEXT NOT NULL,
                phone TEXT NOT NULL,
                brand TEXT NOT NULL,
                model TEXT NOT NULL,
                ex_showroom_price REAL NOT NULL,
                total_price REAL NOT NULL,
                financing_options_json TEXT,
                valid_until TEXT NOT NULL,
                status TEXT DEFAULT 'draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (call_id) REFERENCES calls(id),
                FOREIGN KEY (customer_id) REFERENCES customers(id)
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS inventory_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER UNIQUE NOT NULL,
                brand TEXT NOT NULL,
                model TEXT NOT NULL,
                quantity_in_stock INTEGER DEFAULT 10,
                restock_eta_days INTEGER,
                last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        """)

        # --- Alter existing tables (idempotent: ignore if columns exist) ---
        alter_statements = [
            "ALTER TABLE leads ADD COLUMN lead_score INTEGER DEFAULT 0",
            "ALTER TABLE leads ADD COLUMN budget_min REAL",
            "ALTER TABLE leads ADD COLUMN budget_max REAL",
            "ALTER TABLE leads ADD COLUMN urgency TEXT DEFAULT 'medium'",
            "ALTER TABLE leads ADD COLUMN timeline TEXT",
            "ALTER TABLE leads ADD COLUMN intent TEXT",
            "ALTER TABLE calls ADD COLUMN outcome TEXT",
            "ALTER TABLE calls ADD COLUMN escalation_tier INTEGER DEFAULT 1",
        ]
        for stmt in alter_statements:
            try:
                cur.execute(stmt)
            except sqlite3.OperationalError:
                pass  # Column already exists

        self.conn.commit()

    # ------------------------------------------------------------------
    # Seed
    # ------------------------------------------------------------------

    def seed_products(self):
        """Populate products table from product_catalog.py. Idempotent."""
        from product_catalog import PRODUCT_DATA

        cur = self.conn.cursor()
        for p in PRODUCT_DATA:
            cur.execute(
                """
                INSERT OR IGNORE INTO products
                    (brand, model, category, subcategory, horsepower, description,
                     approximate_price_min, approximate_price_max)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    p["brand"], p["model"], p["category"], p["subcategory"],
                    p["horsepower"], p["description"],
                    p["price_min"], p["price_max"],
                ),
            )
        self.conn.commit()
        return len(PRODUCT_DATA)

    # ------------------------------------------------------------------
    # Customers
    # ------------------------------------------------------------------

    def get_or_create_customer(self, phone: str, name: str = None) -> dict:
        """Look up a customer by phone; create if not found."""
        phone = self._clean_phone(phone)
        cur = self.conn.cursor()
        row = cur.execute("SELECT * FROM customers WHERE phone = ?", (phone,)).fetchone()
        if row:
            if name:
                cur.execute(
                    "UPDATE customers SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (name, row["id"]),
                )
                self.conn.commit()
            return dict(row)

        # Create new customer
        cur.execute(
            "INSERT INTO customers (name, phone) VALUES (?, ?)",
            (name or "Unknown", phone),
        )
        self.conn.commit()
        return dict(cur.execute("SELECT * FROM customers WHERE id = ?", (cur.lastrowid,)).fetchone())

    def lookup_user(self, phone: str) -> dict | None:
        """Full customer profile with recent calls, bookings, and leads."""
        phone = self._clean_phone(phone)
        cur = self.conn.cursor()
        customer = cur.execute("SELECT * FROM customers WHERE phone = ?", (phone,)).fetchone()
        if not customer:
            return None

        result = dict(customer)

        result["recent_calls"] = [
            dict(r) for r in cur.execute(
                "SELECT * FROM calls WHERE customer_id = ? OR phone_number = ? ORDER BY created_at DESC LIMIT 5",
                (customer["id"], phone),
            ).fetchall()
        ]

        result["active_bookings"] = [
            dict(r) for r in cur.execute(
                "SELECT * FROM service_bookings WHERE customer_id = ? AND status IN ('pending','confirmed','in_progress') ORDER BY preferred_date DESC",
                (customer["id"],),
            ).fetchall()
        ]

        result["open_leads"] = [
            dict(r) for r in cur.execute(
                "SELECT * FROM leads WHERE phone = ? AND status IN ('new','contacted','qualified') ORDER BY created_at DESC",
                (phone,),
            ).fetchall()
        ]

        return result

    def format_customer_for_voice(self, phone: str) -> str:
        """Return a voice-friendly summary of a customer's profile."""
        profile = self.lookup_user(phone)
        if not profile:
            return f"No existing records found for phone number {phone}. This is a new customer."

        parts = [f"Customer: {profile['name']}"]
        if profile.get("address"):
            parts.append(f"Location: {profile['address']}, {profile.get('district', 'Palakkad')}")
        if profile.get("language_preference"):
            parts.append(f"Preferred language: {profile['language_preference']}")

        if profile.get("active_bookings"):
            parts.append(f"{len(profile['active_bookings'])} active service booking(s)")

        if profile.get("open_leads"):
            interests = [l["interest"].replace("_", " ") for l in profile["open_leads"]]
            parts.append(f"Open inquiries: {', '.join(interests)}")

        if profile.get("recent_calls"):
            last_call = profile["recent_calls"][0]
            parts.append(f"Last call: {last_call['direction']} on {last_call['created_at']}")

        return ". ".join(parts)

    def update_customer_language(self, phone: str, language: str):
        phone = self._clean_phone(phone)
        self.conn.execute(
            "UPDATE customers SET language_preference = ?, updated_at = CURRENT_TIMESTAMP WHERE phone = ?",
            (language, phone),
        )
        self.conn.commit()

    # ------------------------------------------------------------------
    # Calls
    # ------------------------------------------------------------------

    def create_call(self, phone_number: str, direction: str, call_type: str = None,
                    room_name: str = None, dispatch_id: str = None,
                    language_used: str = None) -> int:
        phone_number = self._clean_phone(phone_number)
        cur = self.conn.cursor()

        # Try to find customer
        customer = cur.execute("SELECT id FROM customers WHERE phone = ?", (phone_number,)).fetchone()

        cur.execute(
            """
            INSERT INTO calls (customer_id, phone_number, direction, call_type, room_name,
                               dispatch_id, status, language_used)
            VALUES (?, ?, ?, ?, ?, ?, 'initiated', ?)
            """,
            (customer["id"] if customer else None, phone_number, direction,
             call_type, room_name, dispatch_id, language_used),
        )
        self.conn.commit()
        return cur.lastrowid

    def update_call(self, call_id: int, **kwargs):
        allowed = {"status", "duration_seconds", "language_used", "summary", "transferred_to", "recording_url"}
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        if not updates:
            return
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [call_id]
        self.conn.execute(f"UPDATE calls SET {set_clause} WHERE id = ?", values)
        self.conn.commit()

    def get_call(self, call_id: int) -> dict | None:
        row = self.conn.execute("SELECT * FROM calls WHERE id = ?", (call_id,)).fetchone()
        return dict(row) if row else None

    def get_recent_calls(self, limit: int = 50, direction: str = None) -> list:
        if direction:
            rows = self.conn.execute(
                "SELECT * FROM calls WHERE direction = ? ORDER BY created_at DESC LIMIT ?",
                (direction, limit),
            ).fetchall()
        else:
            rows = self.conn.execute(
                "SELECT * FROM calls ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
        return [dict(r) for r in rows]

    # ------------------------------------------------------------------
    # Service Bookings
    # ------------------------------------------------------------------

    def create_service_booking(self, customer_name: str, phone: str, model: str,
                               issue_description: str, preferred_date: str,
                               time_slot: str, location: str,
                               service_type: str = "repair",
                               registration_number: str = None) -> str:
        phone = self._clean_phone(phone)
        booking_ref = self._generate_booking_ref()

        cur = self.conn.cursor()
        customer = cur.execute("SELECT id FROM customers WHERE phone = ?", (phone,)).fetchone()

        cur.execute(
            """
            INSERT INTO service_bookings
                (booking_ref, customer_id, customer_name, phone, model, registration_number,
                 issue_description, service_type, preferred_date, time_slot, location)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (booking_ref, customer["id"] if customer else None, customer_name, phone,
             model, registration_number, issue_description, service_type,
             preferred_date, time_slot, location),
        )
        self.conn.commit()
        return booking_ref

    def get_service_status(self, phone: str = None, booking_ref: str = None) -> list:
        cur = self.conn.cursor()
        if booking_ref:
            rows = cur.execute(
                "SELECT * FROM service_bookings WHERE booking_ref = ?", (booking_ref,)
            ).fetchall()
        elif phone:
            phone = self._clean_phone(phone)
            rows = cur.execute(
                "SELECT * FROM service_bookings WHERE phone = ? ORDER BY created_at DESC LIMIT 10",
                (phone,),
            ).fetchall()
        else:
            return []
        return [dict(r) for r in rows]

    def format_service_status_for_voice(self, phone: str = None, booking_ref: str = None) -> str:
        bookings = self.get_service_status(phone=phone, booking_ref=booking_ref)
        if not bookings:
            return "No service bookings found."

        parts = []
        for b in bookings:
            ref = b["booking_ref"]
            model = b["model"]
            status = b["status"].replace("_", " ")
            date = b["preferred_date"]
            slot = b["time_slot"]
            parts.append(
                f"Booking {ref}: {model}, {status}, scheduled for {date} ({slot})"
            )
        return "\n".join(parts)

    def update_service_booking(self, booking_ref: str, **kwargs):
        allowed = {"status", "technician_notes"}
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        if not updates:
            return
        set_clause = ", ".join(f"{k} = ?" for k in updates) + ", updated_at = CURRENT_TIMESTAMP"
        values = list(updates.values()) + [booking_ref]
        self.conn.execute(f"UPDATE service_bookings SET {set_clause} WHERE booking_ref = ?", values)
        self.conn.commit()

    def get_all_service_bookings(self, status: str = None, limit: int = 100) -> list:
        if status:
            rows = self.conn.execute(
                "SELECT * FROM service_bookings WHERE status = ? ORDER BY created_at DESC LIMIT ?",
                (status, limit),
            ).fetchall()
        else:
            rows = self.conn.execute(
                "SELECT * FROM service_bookings ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
        return [dict(r) for r in rows]

    # ------------------------------------------------------------------
    # Products
    # ------------------------------------------------------------------

    def search_products(self, query: str) -> list:
        q = f"%{query.lower().strip()}%"
        rows = self.conn.execute(
            """
            SELECT * FROM products
            WHERE LOWER(brand) LIKE ? OR LOWER(model) LIKE ?
               OR LOWER(category) LIKE ? OR LOWER(subcategory) LIKE ?
               OR LOWER(description) LIKE ?
            LIMIT 10
            """,
            (q, q, q, q, q),
        ).fetchall()
        return [dict(r) for r in rows]

    def get_product_by_model(self, model: str) -> dict | None:
        """Search product by model name. Handles natural-language input
        like 'John Deere 5050D' by searching both brand and model columns."""
        query = model.lower().strip()
        row = self.conn.execute(
            "SELECT * FROM products WHERE LOWER(model) LIKE ? OR LOWER(brand || ' ' || model) LIKE ? LIMIT 1",
            (f"%{query}%", f"%{query}%"),
        ).fetchone()
        return dict(row) if row else None

    def format_product_for_voice(self, product: dict) -> str:
        hp = f"{product['horsepower']} HP, " if product["horsepower"] else ""
        price = ""
        if product["approximate_price_min"] and product["approximate_price_max"]:
            min_l = f"{product['approximate_price_min']/100000:.1f}"
            max_l = f"{product['approximate_price_max']/100000:.1f}"
            if product["approximate_price_min"] == product["approximate_price_max"]:
                price = f"Approximately Rs. {min_l} lakhs. "
            else:
                price = f"Price range Rs. {min_l} to {max_l} lakhs. "
        stock = "Currently in stock." if product.get("in_stock") else "Currently out of stock."
        return f"{product['brand']} {product['model']} — {hp}{product['description']}. {price}{stock}"

    def format_product_list_for_voice(self, products: list, max_items: int = 5) -> str:
        if not products:
            return "No matching products found."
        if len(products) <= max_items:
            items = [self.format_product_for_voice(p) for p in products]
            return "\n".join(f"{i+1}. {item}" for i, item in enumerate(items))

        items = [self.format_product_for_voice(p) for p in products[:max_items]]
        summary = "\n".join(f"{i+1}. {item}" for i, item in enumerate(items))
        remaining = len(products) - max_items
        summary += f"\n\n...and {remaining} more. Would you like details on a specific model?"
        return summary

    # ------------------------------------------------------------------
    # Leads
    # ------------------------------------------------------------------

    def create_lead(self, customer_name: str, phone: str, interest: str,
                    product_of_interest: str = None, source: str = "inbound_call",
                    call_id: int = None, notes: str = None) -> int:
        phone = self._clean_phone(phone)
        cur = self.conn.cursor()
        cur.execute(
            """
            INSERT INTO leads (customer_name, phone, interest, product_of_interest,
                               source, call_id, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (customer_name, phone, interest, product_of_interest, source, call_id, notes),
        )
        self.conn.commit()
        return cur.lastrowid

    def get_leads(self, status: str = None, limit: int = 100) -> list:
        if status:
            rows = self.conn.execute(
                "SELECT * FROM leads WHERE status = ? ORDER BY created_at DESC LIMIT ?",
                (status, limit),
            ).fetchall()
        else:
            rows = self.conn.execute(
                "SELECT * FROM leads ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
        return [dict(r) for r in rows]

    def update_lead(self, lead_id: int, **kwargs):
        allowed = {"status", "notes", "assigned_to"}
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        if not updates:
            return
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [lead_id]
        self.conn.execute(f"UPDATE leads SET {set_clause} WHERE id = ?", values)
        self.conn.commit()

    # ------------------------------------------------------------------
    # Follow-ups
    # ------------------------------------------------------------------

    def create_follow_up(self, phone: str, reason: str, follow_up_type: str = "callback",
                         preferred_time: str = None, call_id: int = None) -> int:
        phone = self._clean_phone(phone)
        cur = self.conn.cursor()
        customer = cur.execute("SELECT id FROM customers WHERE phone = ?", (phone,)).fetchone()
        cur.execute(
            """
            INSERT INTO follow_ups (customer_id, phone, type, reason, preferred_time, call_id, due_date)
            VALUES (?, ?, ?, ?, ?, ?, date('now', '+1 day'))
            """,
            (customer["id"] if customer else None, phone, follow_up_type, reason,
             preferred_time, call_id),
        )
        self.conn.commit()
        return cur.lastrowid

    def get_pending_follow_ups(self, limit: int = 50) -> list:
        rows = self.conn.execute(
            "SELECT * FROM follow_ups WHERE status = 'pending' ORDER BY due_date ASC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]

    def complete_follow_up(self, follow_up_id: int, call_id: int = None):
        self.conn.execute(
            "UPDATE follow_ups SET status = 'completed', call_id = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
            (call_id, follow_up_id),
        )
        self.conn.commit()

    # ------------------------------------------------------------------
    # Statistics
    # ------------------------------------------------------------------

    def get_stats(self) -> dict:
        cur = self.conn.cursor()
        total_calls = cur.execute("SELECT COUNT(*) FROM calls").fetchone()[0]
        inbound = cur.execute("SELECT COUNT(*) FROM calls WHERE direction = 'inbound'").fetchone()[0]
        outbound = cur.execute("SELECT COUNT(*) FROM calls WHERE direction = 'outbound'").fetchone()[0]
        bookings = cur.execute("SELECT COUNT(*) FROM service_bookings WHERE status IN ('pending','confirmed')").fetchone()[0]
        open_leads = cur.execute("SELECT COUNT(*) FROM leads WHERE status IN ('new','contacted','qualified')").fetchone()[0]
        pending_follow_ups = cur.execute("SELECT COUNT(*) FROM follow_ups WHERE status = 'pending'").fetchone()[0]
        total_customers = cur.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
        return {
            "total_calls": total_calls,
            "inbound_calls": inbound,
            "outbound_calls": outbound,
            "active_bookings": bookings,
            "open_leads": open_leads,
            "pending_follow_ups": pending_follow_ups,
            "total_customers": total_customers,
        }

    # ------------------------------------------------------------------
    # Call Memory
    # ------------------------------------------------------------------

    def save_call_memory(self, call_id: int, memory_data: dict):
        """Persist conversation memory as JSON blob."""
        import json
        memory_json = json.dumps(memory_data, ensure_ascii=False)
        cur = self.conn.cursor()
        cur.execute(
            """
            INSERT INTO call_memory (call_id, memory_json, language_locked, lead_score, outcome, intent, transcript)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(call_id) DO UPDATE SET
                memory_json = excluded.memory_json,
                language_locked = excluded.language_locked,
                lead_score = excluded.lead_score,
                outcome = excluded.outcome,
                intent = excluded.intent,
                transcript = excluded.transcript,
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                call_id,
                memory_json,
                memory_data.get("language"),
                memory_data.get("lead_score", 0),
                memory_data.get("outcome"),
                memory_data.get("intent"),
                memory_data.get("transcript", ""),
            ),
        )
        self.conn.commit()

    def load_call_memory(self, call_id: int) -> dict | None:
        """Load conversation memory for a call."""
        import json
        row = self.conn.execute(
            "SELECT * FROM call_memory WHERE call_id = ?", (call_id,)
        ).fetchone()
        if not row:
            return None
        result = dict(row)
        result["memory"] = json.loads(result.get("memory_json", "{}"))
        return result

    def update_call_memory_summary(self, call_id: int, summary: str, intent: str):
        """Post-call: store AI-generated summary and intent."""
        self.conn.execute(
            "UPDATE call_memory SET summary = ?, intent = ?, updated_at = CURRENT_TIMESTAMP WHERE call_id = ?",
            (summary, intent, call_id),
        )
        self.conn.commit()

    def append_transcript(self, call_id: int, role: str, text: str):
        """Append a transcript line to call_memory. Accumulates in the transcript column."""
        row = self.conn.execute(
            "SELECT transcript FROM call_memory WHERE call_id = ?", (call_id,)
        ).fetchone()
        current = (row["transcript"] if row and row["transcript"] else "") + f"\n[{role}]: {text}"
        self.conn.execute(
            "UPDATE call_memory SET transcript = ?, updated_at = CURRENT_TIMESTAMP WHERE call_id = ?",
            (current.strip(), call_id),
        )
        self.conn.commit()

    # ------------------------------------------------------------------
    # Escalations
    # ------------------------------------------------------------------

    def create_escalation(self, call_id: int, tier: int, reason: str, action_taken: str) -> int:
        cur = self.conn.cursor()
        cur.execute(
            "INSERT INTO escalations (call_id, tier, reason, action_taken) VALUES (?, ?, ?, ?)",
            (call_id, tier, reason, action_taken),
        )
        self.conn.commit()
        return cur.lastrowid

    def get_pending_escalations(self, limit: int = 50) -> list:
        rows = self.conn.execute(
            "SELECT * FROM escalations WHERE resolved_by IS NULL ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]

    def resolve_escalation(self, escalation_id: int, resolved_by: str):
        self.conn.execute(
            "UPDATE escalations SET resolved_by = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?",
            (resolved_by, escalation_id),
        )
        self.conn.commit()

    # ------------------------------------------------------------------
    # Quotes
    # ------------------------------------------------------------------

    def create_quote(self, quote_id: str, call_id: int, customer_name: str, phone: str,
                     brand: str, model: str, ex_showroom_price: float, total_price: float,
                     financing_options_json: str, valid_until: str) -> int:
        cur = self.conn.cursor()
        customer = self.conn.execute("SELECT id FROM customers WHERE phone = ?", (self._clean_phone(phone),)).fetchone()
        cur.execute(
            """
            INSERT INTO quotes (quote_id, call_id, customer_id, customer_name, phone, brand, model,
                               ex_showroom_price, total_price, financing_options_json, valid_until)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (quote_id, call_id, customer["id"] if customer else None, customer_name,
             self._clean_phone(phone), brand, model, ex_showroom_price, total_price,
             financing_options_json, valid_until),
        )
        self.conn.commit()
        return cur.lastrowid

    def get_quote(self, quote_id: str) -> dict | None:
        row = self.conn.execute("SELECT * FROM quotes WHERE quote_id = ?", (quote_id,)).fetchone()
        return dict(row) if row else None

    def update_quote_status(self, quote_id: str, status: str):
        self.conn.execute("UPDATE quotes SET status = ? WHERE quote_id = ?", (status, quote_id))
        self.conn.commit()

    # ------------------------------------------------------------------
    # Inventory Cache
    # ------------------------------------------------------------------

    def seed_inventory_cache(self):
        """Initialize inventory cache from products table. Idempotent."""
        cur = self.conn.cursor()
        products = cur.execute("SELECT id, brand, model FROM products").fetchall()
        for p in products:
            cur.execute(
                """
                INSERT OR IGNORE INTO inventory_cache (product_id, brand, model, quantity_in_stock)
                VALUES (?, ?, ?, 10)
                """,
                (p["id"], p["brand"], p["model"]),
            )
        self.conn.commit()
        return len(products)

    def check_inventory(self, brand: str = None, model: str = None) -> list:
        """Check stock levels. Returns matching inventory records."""
        cur = self.conn.cursor()
        if model:
            rows = cur.execute(
                """
                SELECT ic.*, p.category, p.subcategory, p.approximate_price_min, p.approximate_price_max
                FROM inventory_cache ic
                JOIN products p ON ic.product_id = p.id
                WHERE LOWER(ic.model) LIKE ?
                """,
                (f"%{model.lower().strip()}%",),
            ).fetchall()
        elif brand:
            rows = cur.execute(
                """
                SELECT ic.*, p.category, p.subcategory, p.approximate_price_min, p.approximate_price_max
                FROM inventory_cache ic
                JOIN products p ON ic.product_id = p.id
                WHERE LOWER(ic.brand) LIKE ?
                """,
                (f"%{brand.lower().strip()}%",),
            ).fetchall()
        else:
            rows = []
        return [dict(r) for r in rows]

    def get_alternatives_in_stock(self, category: str, subcategory: str = None,
                                  budget_max: float = None, exclude_model: str = None) -> list:
        """Find in-stock alternatives in same category."""
        cur = self.conn.cursor()
        query = """
            SELECT ic.*, p.category, p.subcategory, p.approximate_price_min, p.approximate_price_max,
                   p.horsepower, p.description
            FROM inventory_cache ic
            JOIN products p ON ic.product_id = p.id
            WHERE ic.quantity_in_stock > 0 AND LOWER(p.category) = LOWER(?)
        """
        params = [category]
        if subcategory:
            query += " AND LOWER(p.subcategory) = LOWER(?)"
            params.append(subcategory)
        if exclude_model:
            query += " AND LOWER(ic.model) != LOWER(?)"
            params.append(exclude_model)
        if budget_max:
            query += " AND (p.approximate_price_min <= ? OR p.approximate_price_min IS NULL)"
            params.append(budget_max)
        query += " ORDER BY ic.quantity_in_stock DESC LIMIT 5"
        rows = cur.execute(query, params).fetchall()
        return [dict(r) for r in rows]

    def update_product_stock(self, product_id: int, quantity: int, restock_eta_days: int = None):
        self.conn.execute(
            "UPDATE inventory_cache SET quantity_in_stock = ?, restock_eta_days = ?, last_checked = CURRENT_TIMESTAMP WHERE product_id = ?",
            (quantity, restock_eta_days, product_id),
        )
        self.conn.commit()

    # ------------------------------------------------------------------
    # Lead Scoring helpers
    # ------------------------------------------------------------------

    def update_lead_score(self, lead_id: int, score: int, budget_min: float = None,
                          budget_max: float = None, urgency: str = None, timeline: str = None):
        cur = self.conn.cursor()
        cur.execute(
            """
            UPDATE leads SET lead_score = ?, budget_min = COALESCE(?, budget_min),
            budget_max = COALESCE(?, budget_max), urgency = COALESCE(?, urgency),
            timeline = COALESCE(?, timeline)
            WHERE id = ?
            """,
            (score, budget_min, budget_max, urgency, timeline, lead_id),
        )
        self.conn.commit()

    def get_hot_leads(self, limit: int = 20) -> list:
        rows = self.conn.execute(
            "SELECT * FROM leads WHERE lead_score >= 80 AND status IN ('new','contacted','qualified') ORDER BY lead_score DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]

    # ------------------------------------------------------------------
    # Call outcome helpers
    # ------------------------------------------------------------------

    def set_call_outcome(self, call_id: int, outcome: str, escalation_tier: int = 1):
        self.conn.execute(
            "UPDATE calls SET outcome = ?, escalation_tier = ? WHERE id = ?",
            (outcome, escalation_tier, call_id),
        )
        self.conn.commit()

    def update_call_duration(self, call_id: int, duration_seconds: int):
        self.conn.execute(
            "UPDATE calls SET duration_seconds = ?, status = 'completed' WHERE id = ? AND status NOT IN ('transferred','failed')",
            (duration_seconds, call_id),
        )
        self.conn.commit()

    # ------------------------------------------------------------------
    # Inventory helpers
    # ------------------------------------------------------------------

    def get_lead_by_id(self, lead_id: int) -> dict | None:
        row = self.conn.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
        return dict(row) if row else None

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _clean_phone(phone: str) -> str:
        return phone.strip().replace(" ", "").replace("-", "")

    @staticmethod
    def _generate_booking_ref() -> str:
        today = datetime.now().strftime("%Y%m%d")
        suffix = random.randint(1000, 9999)
        return f"SRV-{today}-{suffix}"

    def close(self):
        self.conn.close()


# ------------------------------------------------------------------
# Quick test / seed on direct execution
# ------------------------------------------------------------------
if __name__ == "__main__":
    db = SQLiteDatabase()
    count = db.seed_products()
    print(f"Seeded {count} products.")

    # Quick smoke test
    results = db.search_products("John Deere")
    print(f"Found {len(results)} John Deere products.")
    for r in results[:3]:
        print(f"  {r['brand']} {r['model']}")

    # Test customer + booking + lead
    db.get_or_create_customer("+919999000001", "Test Farmer")
    profile = db.lookup_user("+919999000001")
    print(f"\nCustomer: {profile['name']}")

    ref = db.create_service_booking(
        "Test Farmer", "+919999000001", "John Deere 5045D",
        "Engine making noise", "2026-06-15", "morning",
        "Near temple, Vellapara", service_type="repair"
    )
    print(f"Booking created: {ref}")

    lead_id = db.create_lead(
        "Test Farmer", "+919999000001", "product_purchase",
        product_of_interest="John Deere 5075E", source="inbound_call"
    )
    print(f"Lead created: {lead_id}")

    stats = db.get_stats()
    print(f"\nStats: {stats}")

    db.close()
    print("\nDatabase test complete.")
