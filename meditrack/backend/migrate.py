import sqlite3

try:
    conn = sqlite3.connect('meditrack.db')
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE dose_logs ADD COLUMN delay_minutes INTEGER DEFAULT 0;")
    cursor.execute("ALTER TABLE dose_logs ADD COLUMN behavior_tag VARCHAR(50) DEFAULT 'unknown';")
    conn.commit()
    conn.close()
    print("Database Migrated successfully")
except Exception as e:
    print("Migration error:", e)
