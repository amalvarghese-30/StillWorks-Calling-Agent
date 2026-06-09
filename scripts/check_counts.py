import sqlite3, os
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
db = sqlite3.connect(os.path.join(BASE, 'data', 'manas_group.db'))
cur = db.cursor()
for tbl in ['customers','calls','leads','service_bookings','quotes','escalations','call_memory',]:
    try:
        cur.execute(f'SELECT COUNT(*) FROM {tbl}')
        print(f'{tbl}: {cur.fetchone()[0]}')
    except Exception as e:
        print(f'{tbl}: ERROR - {e}')
db.close()
