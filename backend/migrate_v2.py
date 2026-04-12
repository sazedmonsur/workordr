"""
Phase 2 schema migration.
Adds new columns to existing tables and creates new tables.
Safe to run multiple times (uses IF NOT EXISTS / IF NOT EXISTS checks).

Run: python migrate_v2.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.database import engine, Base
from app.models import *  # ensure all new models are registered

print("Running Phase 2 schema migration...")

ADD_COLUMNS = [
    # technicians — new fields
    "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS skill_level VARCHAR(20) DEFAULT 'junior'",
    "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS base_rate NUMERIC(10,2)",
    "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS working_hours_start VARCHAR(5) DEFAULT '08:00'",
    "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS working_hours_end VARCHAR(5) DEFAULT '17:00'",

    # jobs — new fields
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id)",
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS address TEXT",
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP",
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMP",
]

with engine.connect() as conn:
    # 1. Create all NEW tables first (services, technician_services, availability_slots, etc.)
    Base.metadata.create_all(bind=engine)
    print("  New tables created (or already exist)")

    # 2. Add new columns to existing tables
    for stmt in ADD_COLUMNS:
        try:
            conn.execute(text(stmt))
            conn.commit()
            col = stmt.split("ADD COLUMN IF NOT EXISTS")[1].strip().split()[0]
            print(f"  Column OK: {col}")
        except Exception as e:
            print(f"  WARN: {e}")

print("\nMigration complete. Run 'python seed_v2.py' next.")
