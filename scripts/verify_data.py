import sqlite3, os
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
db = sqlite3.connect(os.path.join(BASE, 'data', 'manas_group.db'))
cur = db.cursor()

print("=== Leads for +919876543210 (Rajesh) ===")
for r in cur.execute("SELECT id, customer_name, product_of_interest, lead_score, status, budget_min, budget_max FROM leads WHERE phone='+919876543210' ORDER BY created_at DESC"):
    print(f"  id={r[0]} name={r[1]} product={r[2]} score={r[3]} status={r[4]} budget={r[5]}-{r[6]}")

print("\n=== Call Memory via Rajesh calls ===")
for r in cur.execute("""
    SELECT cm.id, c.id, cm.lead_score, cm.summary
    FROM call_memory cm JOIN calls c ON cm.call_id = c.id
    WHERE c.phone_number = '+919876543210'
"""):
    print(f"  cm_id={r[0]} call_id={r[1]} score={r[2]} summary={r[3]}")

# Check Rajesh calls
print("\n=== Rajesh calls ===")
for r in cur.execute("SELECT id, summary, status, outcome FROM calls WHERE phone_number='+919876543210' ORDER BY created_at DESC"):
    print(f"  id={r[0]} summary={r[1]} status={r[2]} outcome={r[3]}")

# Check quotes
print("\n=== Quotes ===")
for r in cur.execute("SELECT id, quote_id, customer_name, brand, model, total_price, status FROM quotes"):
    print(f"  id={r[0]} quote={r[1]} customer={r[2]} {r[3]} {r[4]} price={r[5]} status={r[6]}")

# Check escalations
print("\n=== Escalations ===")
for r in cur.execute("SELECT id, call_id, tier, reason, action_taken FROM escalations"):
    print(f"  id={r[0]} call_id={r[1]} tier={r[2]} reason={r[3]} action={r[4]}")

db.close()
