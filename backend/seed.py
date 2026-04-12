"""
Seed the database with sample data.
Run: python seed.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, timedelta
from app.database import SessionLocal, engine, Base
from app.models import Customer, Technician, Job, Schedule

Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Clear existing seed data to allow re-running
print("Clearing existing data...")
db.query(Schedule).delete()
db.query(Job).delete()
db.query(Technician).delete()
db.query(Customer).delete()
db.commit()

print("Seeding WorkOrdr database...")

# Customers
customers = [
    Customer(name="Alice Johnson", email="alice@example.com", phone="555-1001", address="123 Main St, Austin TX"),
    Customer(name="Bob Martinez", email="bob@example.com", phone="555-1002", address="456 Oak Ave, Austin TX"),
    Customer(name="Carol Williams", email="carol@example.com", phone="555-1003", address="789 Pine Rd, Austin TX"),
]
db.add_all(customers)
db.flush()
print(f"  Created {len(customers)} customers")

# Technicians
technicians = [
    Technician(name="Mike Torres", email="mike@workordr.com", phone="555-2001", status="active"),
    Technician(name="Sarah Kim", email="sarah@workordr.com", phone="555-2002", status="active"),
]
db.add_all(technicians)
db.flush()
print(f"  Created {len(technicians)} technicians")

# Jobs
now = datetime.utcnow()
jobs_data = [
    Job(customer_id=customers[0].id, technician_id=technicians[0].id,
        title="AC Unit Repair", description="AC not cooling properly", status="scheduled"),
    Job(customer_id=customers[1].id, technician_id=technicians[1].id,
        title="Water Heater Installation", description="Replace 40-gallon unit", status="in_progress"),
    Job(customer_id=customers[2].id, technician_id=technicians[0].id,
        title="Electrical Panel Inspection", description="Annual safety inspection", status="completed",
        notes="Replaced two breakers, all clear"),
    Job(customer_id=customers[0].id,
        title="Plumbing Leak Fix", description="Kitchen sink drain leak", status="pending"),
    Job(customer_id=customers[1].id, technician_id=technicians[1].id,
        title="HVAC Filter Replacement", description="Quarterly maintenance", status="completed",
        notes="Replaced filters, system running well"),
]
db.add_all(jobs_data)
db.flush()
print(f"  Created {len(jobs_data)} jobs")

# Schedules
schedules = [
    Schedule(
        job_id=jobs_data[0].id,
        technician_id=technicians[0].id,
        scheduled_start=now + timedelta(hours=2),
        scheduled_end=now + timedelta(hours=4),
    ),
    Schedule(
        job_id=jobs_data[1].id,
        technician_id=technicians[1].id,
        scheduled_start=now - timedelta(hours=1),
        scheduled_end=now + timedelta(hours=2),
    ),
    Schedule(
        job_id=jobs_data[4].id,
        technician_id=technicians[1].id,
        scheduled_start=now - timedelta(days=1),
        scheduled_end=now - timedelta(days=1, hours=-2),
    ),
]
db.add_all(schedules)
db.commit()
print(f"  Created {len(schedules)} schedules")

print("\nSeed complete!")
print(f"\nTechnician IDs for mobile app testing:")
for t in technicians:
    print(f"  {t.name}: {t.id}")
db.close()
