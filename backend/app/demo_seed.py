"""
Seed logic extracted so it can be called from seed_v2.py and the /admin/reset-demo endpoint.
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import (
    Customer, Technician, Service, TechnicianService,
    Job, Schedule, Invoice, InvoiceItem,
    AvailabilitySlot, JobStatusHistory,
)


def reset_and_seed(db: Session) -> dict:
    # Clear in FK-safe order
    db.query(JobStatusHistory).delete()
    db.query(InvoiceItem).delete()
    db.query(Invoice).delete()
    db.query(Schedule).delete()
    db.query(AvailabilitySlot).delete()
    db.query(Job).delete()
    db.query(TechnicianService).delete()
    db.query(Technician).delete()
    db.query(Service).delete()
    db.query(Customer).delete()
    db.commit()

    # ── Services ──────────────────────────────────────────────────────────────
    services = [
        Service(name="AC Repair",             category="HVAC",       base_price=150.00, estimated_duration=90,
                description="Diagnose and repair air conditioning units"),
        Service(name="AC Installation",       category="HVAC",       base_price=450.00, estimated_duration=180,
                description="Install new AC unit"),
        Service(name="Fridge Repair",         category="Appliance",  base_price=100.00, estimated_duration=60,
                description="Diagnose and repair refrigerators"),
        Service(name="Washer/Dryer Repair",   category="Appliance",  base_price=120.00, estimated_duration=75,
                description="Diagnose and repair washing machines and dryers"),
        Service(name="Deep Cleaning",         category="Cleaning",   base_price=200.00, estimated_duration=240,
                description="Full home deep clean"),
        Service(name="Regular Cleaning",      category="Cleaning",   base_price=100.00, estimated_duration=120,
                description="Standard home cleaning"),
        Service(name="Plumbing — Leak Fix",   category="Plumbing",   base_price=130.00, estimated_duration=60,
                description="Fix water leaks in pipes and fixtures"),
        Service(name="Water Heater Install",  category="Plumbing",   base_price=350.00, estimated_duration=150,
                description="Install or replace water heater"),
        Service(name="Electrical Inspection", category="Electrical", base_price=80.00,  estimated_duration=60,
                description="Safety inspection of electrical panel and wiring"),
        Service(name="Outlet/Switch Repair",  category="Electrical", base_price=90.00,  estimated_duration=45,
                description="Repair or replace outlets and switches"),
    ]
    db.add_all(services)
    db.flush()

    # ── Technicians ───────────────────────────────────────────────────────────
    technicians = [
        Technician(name="Mike Torres",  email="mike@workordr.com",   phone="555-2001",
                   status="active",   skill_level="senior",     base_rate=65.00,
                   working_hours_start="08:00", working_hours_end="17:00"),
        Technician(name="Sarah Kim",    email="sarah@workordr.com",  phone="555-2002",
                   status="active",   skill_level="senior",     base_rate=65.00,
                   working_hours_start="08:00", working_hours_end="17:00"),
        Technician(name="James Rivera", email="james@workordr.com",  phone="555-2003",
                   status="active",   skill_level="junior",     base_rate=45.00,
                   working_hours_start="09:00", working_hours_end="18:00"),
        Technician(name="Priya Patel",  email="priya@workordr.com",  phone="555-2004",
                   status="active",   skill_level="specialist", base_rate=85.00,
                   working_hours_start="08:00", working_hours_end="16:00"),
        Technician(name="Carlos Diaz", email="carlos@workordr.com", phone="555-2005",
                   status="inactive", skill_level="junior",     base_rate=40.00,
                   working_hours_start="08:00", working_hours_end="17:00"),
    ]
    db.add_all(technicians)
    db.flush()

    svc  = {s.name: s for s in services}
    tech = {t.name: t for t in technicians}

    # ── Technician ↔ Service assignments ──────────────────────────────────────
    tech_services = [
        TechnicianService(technician_id=tech["Mike Torres"].id,  service_id=svc["AC Repair"].id),
        TechnicianService(technician_id=tech["Mike Torres"].id,  service_id=svc["AC Installation"].id),
        TechnicianService(technician_id=tech["Mike Torres"].id,  service_id=svc["Electrical Inspection"].id),
        TechnicianService(technician_id=tech["Mike Torres"].id,  service_id=svc["Outlet/Switch Repair"].id),
        TechnicianService(technician_id=tech["Sarah Kim"].id,    service_id=svc["Fridge Repair"].id),
        TechnicianService(technician_id=tech["Sarah Kim"].id,    service_id=svc["Washer/Dryer Repair"].id),
        TechnicianService(technician_id=tech["Sarah Kim"].id,    service_id=svc["Deep Cleaning"].id),
        TechnicianService(technician_id=tech["Sarah Kim"].id,    service_id=svc["Regular Cleaning"].id),
        TechnicianService(technician_id=tech["James Rivera"].id, service_id=svc["Plumbing — Leak Fix"].id),
        TechnicianService(technician_id=tech["James Rivera"].id, service_id=svc["Water Heater Install"].id),
        TechnicianService(technician_id=tech["Priya Patel"].id,  service_id=svc["AC Repair"].id),
        TechnicianService(technician_id=tech["Priya Patel"].id,  service_id=svc["AC Installation"].id),
        TechnicianService(technician_id=tech["Priya Patel"].id,  service_id=svc["Electrical Inspection"].id),
    ]
    db.add_all(tech_services)
    db.flush()

    # ── Customers ─────────────────────────────────────────────────────────────
    customers = [
        Customer(name="Alice Johnson",  email="alice@example.com",  phone="555-1001", address="123 Main St, Austin TX 78701"),
        Customer(name="Bob Martinez",   email="bob@example.com",    phone="555-1002", address="456 Oak Ave, Austin TX 78702"),
        Customer(name="Carol Williams", email="carol@example.com",  phone="555-1003", address="789 Pine Rd, Austin TX 78703"),
        Customer(name="David Chen",     email="david@example.com",  phone="555-1004", address="321 Elm St, Austin TX 78704"),
        Customer(name="Emma Davis",     email="emma@example.com",   phone="555-1005", address="654 Maple Dr, Austin TX 78705"),
    ]
    db.add_all(customers)
    db.flush()

    # ── Jobs ──────────────────────────────────────────────────────────────────
    now = datetime.utcnow()
    jobs_data = [
        Job(customer_id=customers[0].id, technician_id=tech["Mike Torres"].id,
            service_id=svc["AC Repair"].id,
            title="AC Unit Repair", description="AC not cooling properly — upstairs unit",
            address=customers[0].address, status="assigned",
            scheduled_at=now.replace(hour=9, minute=0, second=0, microsecond=0),
            scheduled_end_at=now.replace(hour=10, minute=30, second=0, microsecond=0)),

        Job(customer_id=customers[1].id, technician_id=tech["Sarah Kim"].id,
            service_id=svc["Fridge Repair"].id,
            title="Refrigerator Repair", description="Fridge not cooling, makes noise",
            address=customers[1].address, status="in_progress",
            notes="Compressor issue suspected",
            scheduled_at=now.replace(hour=10, minute=0, second=0, microsecond=0),
            scheduled_end_at=now.replace(hour=11, minute=0, second=0, microsecond=0)),

        Job(customer_id=customers[2].id, technician_id=tech["James Rivera"].id,
            service_id=svc["Plumbing — Leak Fix"].id,
            title="Kitchen Sink Leak", description="Drain pipe leaking under sink",
            address=customers[2].address, status="en_route",
            scheduled_at=now.replace(hour=11, minute=0, second=0, microsecond=0),
            scheduled_end_at=now.replace(hour=12, minute=0, second=0, microsecond=0)),

        Job(customer_id=customers[3].id,
            service_id=svc["Deep Cleaning"].id,
            title="Full Home Deep Clean", description="4-bedroom house",
            address=customers[3].address, status="requested"),

        Job(customer_id=customers[4].id,
            service_id=svc["Electrical Inspection"].id,
            title="Electrical Panel Inspection", description="Annual safety check",
            address=customers[4].address, status="pending"),

        Job(customer_id=customers[0].id, technician_id=tech["Priya Patel"].id,
            service_id=svc["AC Installation"].id,
            title="AC Installation — Master Bedroom",
            address=customers[0].address, status="paid",
            notes="Installed successfully, tested cooling",
            scheduled_at=now - timedelta(days=3),
            scheduled_end_at=now - timedelta(days=3) + timedelta(hours=3)),

        Job(customer_id=customers[1].id, technician_id=tech["Sarah Kim"].id,
            service_id=svc["Regular Cleaning"].id,
            title="Monthly Cleaning", description="Standard monthly cleaning",
            address=customers[1].address, status="completed",
            scheduled_at=now - timedelta(days=1, hours=2),
            scheduled_end_at=now - timedelta(days=1)),

        Job(customer_id=customers[3].id, technician_id=tech["Mike Torres"].id,
            service_id=svc["AC Repair"].id,
            title="AC Tune-Up", description="Annual tune-up",
            address=customers[3].address, status="assigned",
            scheduled_at=now + timedelta(days=1, hours=2),
            scheduled_end_at=now + timedelta(days=1, hours=4)),
    ]
    db.add_all(jobs_data)
    db.flush()

    # ── Schedules ─────────────────────────────────────────────────────────────
    schedules = []
    for j in jobs_data:
        if j.scheduled_at and j.technician_id:
            schedules.append(Schedule(
                job_id=j.id,
                technician_id=j.technician_id,
                scheduled_start=j.scheduled_at,
                scheduled_end=j.scheduled_end_at,
            ))
    db.add_all(schedules)
    db.flush()

    # ── Availability blocks ───────────────────────────────────────────────────
    db.add_all([
        AvailabilitySlot(
            technician_id=tech["Mike Torres"].id, slot_type="blocked",
            start_time=now + timedelta(days=2, hours=13),
            end_time=now + timedelta(days=2, hours=15),
            notes="Team meeting",
        ),
        AvailabilitySlot(
            technician_id=tech["Sarah Kim"].id, slot_type="time_off",
            start_time=(now + timedelta(days=4)).replace(hour=0, minute=0, second=0, microsecond=0),
            end_time=(now + timedelta(days=5)).replace(hour=0, minute=0, second=0, microsecond=0),
            notes="Vacation day",
        ),
    ])
    db.flush()

    # ── Invoices ──────────────────────────────────────────────────────────────
    paid_job = jobs_data[5]
    inv1 = Invoice(job_id=paid_job.id, customer_id=paid_job.customer_id,
                   subtotal=450.00, tax=36.00, total=486.00, status="paid")
    db.add(inv1)
    db.flush()
    db.add(InvoiceItem(invoice_id=inv1.id, description="AC Unit Installation",   quantity=1, unit_price=350.00, total=350.00))
    db.add(InvoiceItem(invoice_id=inv1.id, description="Refrigerant + Materials", quantity=1, unit_price=100.00, total=100.00))

    completed_job = jobs_data[6]
    inv2 = Invoice(job_id=completed_job.id, customer_id=completed_job.customer_id,
                   subtotal=100.00, tax=8.00, total=108.00, status="draft")
    db.add(inv2)
    db.flush()
    db.add(InvoiceItem(invoice_id=inv2.id, description="Regular Cleaning — 2BR", quantity=1, unit_price=100.00, total=100.00))

    db.commit()

    return {
        "services": len(services),
        "technicians": len(technicians),
        "customers": len(customers),
        "jobs": len(jobs_data),
        "schedules": len(schedules),
        "invoices": 2,
    }
