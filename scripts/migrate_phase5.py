"""Phase 5 schema migration: notifications, audit_logs, users, roles, webhook_events, campaign scheduling."""
import sqlite3, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(BASE, 'data', 'manas_group.db')
db = sqlite3.connect(DB)
cur = db.cursor()

# 1. Users table
cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'agent',
        password_hash TEXT,
        is_active INTEGER DEFAULT 1,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
print("  [OK] users table")

# 2. Roles table
cur.execute("""
    CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        permissions_json TEXT DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
print("  [OK] roles table")

# 3. Notifications table
cur.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        call_id INTEGER,
        customer_id INTEGER,
        campaign_id INTEGER,
        read INTEGER DEFAULT 0,
        dismissed INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
print("  [OK] notifications table")

# 4. Audit logs
cur.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        resource TEXT,
        resource_id TEXT,
        details_json TEXT DEFAULT '{}',
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
print("  [OK] audit_logs table")

# 5. Webhook events log
cur.execute("""
    CREATE TABLE IF NOT EXISTS webhook_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        room_name TEXT,
        participant_identity TEXT,
        payload_json TEXT DEFAULT '{}',
        processed INTEGER DEFAULT 0,
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
print("  [OK] webhook_events table")

# 6. WhatsApp delivery tracking
cur.execute("""
    CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        template_name TEXT,
        message_type TEXT DEFAULT 'text',
        content_json TEXT DEFAULT '{}',
        status TEXT DEFAULT 'pending',
        external_id TEXT,
        delivered_at TIMESTAMP,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
print("  [OK] whatsapp_messages table")

# 7. Add updated_at to calls
existing_calls = {r[1] for r in cur.execute("PRAGMA table_info(calls)")}
if 'updated_at' not in existing_calls:
    cur.execute("ALTER TABLE calls ADD COLUMN updated_at TIMESTAMP")
    print("  [OK] calls.updated_at")

# 8. Add webhook tracking to campaigns
existing_campaigns = {r[1] for r in cur.execute("PRAGMA table_info(campaigns)")}
if 'scheduled_at' not in existing_campaigns:
    cur.execute("ALTER TABLE campaigns ADD COLUMN scheduled_at TIMESTAMP")
    print("  [OK] campaigns.scheduled_at")
if 'recurrence_rule' not in existing_campaigns:
    cur.execute("ALTER TABLE campaigns ADD COLUMN recurrence_rule TEXT")
    print("  [OK] campaigns.recurrence_rule")

# 9. Add call_details for transcript indexing
existing_calls_cols = {r[1] for r in cur.execute("PRAGMA table_info(calls)")}
if 'sentiment' not in existing_calls_cols:
    cur.execute("ALTER TABLE calls ADD COLUMN sentiment TEXT")
    print("  [OK] calls.sentiment")
if 'topics_json' not in existing_calls_cols:
    cur.execute("ALTER TABLE calls ADD COLUMN topics_json TEXT DEFAULT '[]'")
    print("  [OK] calls.topics_json")
if 'recording_url' not in existing_calls_cols:
    cur.execute("ALTER TABLE calls ADD COLUMN recording_url TEXT")
    print("  [OK] calls.recording_url")

# 10. Add PDF tracking to quotes
existing_quotes = {r[1] for r in cur.execute("PRAGMA table_info(quotes)")}
if 'pdf_url' not in existing_quotes:
    cur.execute("ALTER TABLE quotes ADD COLUMN pdf_url TEXT")
    print("  [OK] quotes.pdf_url")

# 11. Seed default roles
now = __import__('datetime').datetime.now().isoformat()
for role, perms in [
    ("admin", '["*"]'),
    ("manager", '["calls:read","calls:write","campaigns:read","campaigns:write","customers:read","customers:write","reports:read","quotes:read","quotes:write"]'),
    ("agent", '["calls:read","calls:write","customers:read","leads:read","leads:write","quotes:read","appointments:read","appointments:write"]'),
    ("viewer", '["calls:read","customers:read","reports:read","quotes:read"]'),
]:
    cur.execute("INSERT OR IGNORE INTO roles (name, permissions_json) VALUES (?, ?)", (role, perms))
print("  [OK] Seeded 4 default roles")

# 12. Seed admin user
cur.execute("INSERT OR IGNORE INTO users (email, name, role) VALUES (?, ?, ?)", ("admin@agriforge.in", "Admin User", "admin"))
print("  [OK] Seeded admin user")

# 13. Indexes
indexes = [
    "CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource, resource_id)",
    "CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(event_type, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_webhook_events_room ON webhook_events(room_name)",
    "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
    "CREATE INDEX IF NOT EXISTS idx_whatsapp_phone ON whatsapp_messages(phone, created_at)",
]
for idx in indexes:
    cur.execute(idx)
print(f"  [OK] {len(indexes)} indexes created")

db.commit()
db.close()
print("\nPhase 5 migration complete.")
