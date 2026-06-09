"""Phase 4B schema migration: campaign_calls table + enhanced campaigns columns."""
import sqlite3, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(BASE, 'data', 'manas_group.db')
db = sqlite3.connect(DB)
cur = db.cursor()

# Add new columns to campaigns (ignore if they already exist)
new_columns = [
    ("started_at", "TIMESTAMP"),
    ("paused_at", "TIMESTAMP"),
    ("completed_at", "TIMESTAMP"),
    ("processed_count", "INTEGER DEFAULT 0"),
    ("no_answer_count", "INTEGER DEFAULT 0"),
    ("escalated_count", "INTEGER DEFAULT 0"),
    ("appointments_created", "INTEGER DEFAULT 0"),
    ("csv_filename", "TEXT"),
]

existing = {r[1] for r in cur.execute("PRAGMA table_info(campaigns)")}
for col_name, col_type in new_columns:
    if col_name not in existing:
        cur.execute(f"ALTER TABLE campaigns ADD COLUMN {col_name} {col_type}")
        print(f"  [OK] Added campaigns.{col_name} {col_type}")
    else:
        print(f"  [SKIP] campaigns.{col_name} already exists")

# Create campaign_calls table
cur.execute("""
    CREATE TABLE IF NOT EXISTS campaign_calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL,
        phone TEXT NOT NULL,
        customer_name TEXT,
        language TEXT DEFAULT 'ml',
        reason TEXT,
        status TEXT DEFAULT 'pending',
        call_id INTEGER,
        duration_seconds INTEGER DEFAULT 0,
        outcome TEXT,
        lead_score INTEGER,
        lead_generated INTEGER DEFAULT 0,
        appointment_created INTEGER DEFAULT 0,
        attempt_count INTEGER DEFAULT 1,
        last_attempt_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
    )
""")
print("  [OK] Created campaign_calls table")

# Create indexes
cur.execute("CREATE INDEX IF NOT EXISTS idx_campaign_calls_campaign ON campaign_calls(campaign_id)")
cur.execute("CREATE INDEX IF NOT EXISTS idx_campaign_calls_status ON campaign_calls(status)")
cur.execute("CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status)")
print("  [OK] Created indexes")

db.commit()
db.close()
print("\nPhase 4B migration complete.")
