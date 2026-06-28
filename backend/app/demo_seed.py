"""
Seed logic extracted so it can be called from seed_v2.py and the /admin/reset-demo endpoint.
"""
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import (
    Customer, Technician, Service, TechnicianService,
    Job, Schedule, Invoice, InvoiceItem,
    AvailabilitySlot, JobStatusHistory, User,
)


def reset_and_seed(db: Session, company_id: uuid.UUID | None = None) -> dict:
    # Clear in FK-safe order, scoped to company if provided
    if company_id:
        # Delete records belonging to this company only
        job_ids = [j.id for j in db.query(Job.id).filter(Job.company_id == company_id).all()]
        if job_ids:
            db.query(JobStatusHistory).filter(JobStatusHistory.job_id.in_(job_ids)).delete(synchronize_session=False)
            invoice_ids = [i.id for i in db.query(Invoice.id).filter(Invoice.job_id.in_(job_ids)).all()]
            if invoice_ids:
                db.query(InvoiceItem).filter(InvoiceItem.invoice_id.in_(invoice_ids)).delete(synchronize_session=False)
                db.query(Invoice).filter(Invoice.id.in_(invoice_ids)).delete(synchronize_session=False)
            db.query(Schedule).filter(Schedule.job_id.in_(job_ids)).delete(synchronize_session=False)
            db.query(Job).filter(Job.company_id == company_id).delete(synchronize_session=False)

        tech_ids = [t.id for t in db.query(Technician.id).filter(Technician.company_id == company_id).all()]
        if tech_ids:
            db.query(AvailabilitySlot).filter(AvailabilitySlot.technician_id.in_(tech_ids)).delete(synchronize_session=False)
            db.query(TechnicianService).filter(TechnicianService.technician_id.in_(tech_ids)).delete(synchronize_session=False)
            # Remove technician user accounts (non-admin)
            db.query(User).filter(User.technician_id.in_(tech_ids)).delete(synchronize_session=False)
            db.query(Technician).filter(Technician.company_id == company_id).delete(synchronize_session=False)

        db.query(Service).filter(Service.company_id == company_id).delete(synchronize_session=False)
        db.query(Customer).filter(Customer.company_id == company_id).delete(synchronize_session=False)
        db.commit()
    else:
        # Full wipe (legacy behaviour / no company context)
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
                description="Diagnose and repair air conditioning units", company_id=company_id),
        Service(name="AC Installation",       category="HVAC",       base_price=450.00, estimated_duration=180,
                description="Install new AC unit", company_id=company_id),
        Service(name="Fridge Repair",         category="Appliance",  base_price=100.00, estimated_duration=60,
                description="Diagnose and repair refrigerators", company_id=company_id),
        Service(name="Washer/Dryer Repair",   category="Appliance",  base_price=120.00, estimated_duration=75,
                description="Diagnose and repair washing machines and dryers", company_id=company_id),
        Service(name="Deep Cleaning",         category="Cleaning",   base_price=200.00, estimated_duration=240,
                description="Full home deep clean", company_id=company_id),
        Service(name="Regular Cleaning",      category="Cleaning",   base_price=100.00, estimated_duration=120,
                description="Standard home cleaning", company_id=company_id),
        Service(name="Plumbing — Leak Fix",   category="Plumbing",   base_price=130.00, estimated_duration=60,
                description="Fix water leaks in pipes and fixtures", company_id=company_id),
        Service(name="Water Heater Install",  category="Plumbing",   base_price=350.00, estimated_duration=150,
                description="Install or replace water heater", company_id=company_id),
        Service(name="Electrical Inspection", category="Electrical", base_price=80.00,  estimated_duration=60,
                description="Safety inspection of electrical panel and wiring", company_id=company_id),
        Service(name="Outlet/Switch Repair",  category="Electrical", base_price=90.00,  estimated_duration=45,
                description="Repair or replace outlets and switches", company_id=company_id),
    ]
    db.add_all(services)
    db.flush()

    # ── Technicians ───────────────────────────────────────────────────────────
    technicians = [
        Technician(name="Mike Torres",  email="mike@workordr.com",   phone="555-2001",
                   status="active",   skill_level="senior",     base_rate=65.00,
                   working_hours_start="08:00", working_hours_end="17:00", company_id=company_id),
        Technician(name="Sarah Kim",    email="sarah@workordr.com",  phone="555-2002",
                   status="active",   skill_level="senior",     base_rate=65.00,
                   working_hours_start="08:00", working_hours_end="17:00", company_id=company_id),
        Technician(name="James Rivera", email="james@workordr.com",  phone="555-2003",
                   status="active",   skill_level="junior",     base_rate=45.00,
                   working_hours_start="09:00", working_hours_end="18:00", company_id=company_id),
        Technician(name="Priya Patel",  email="priya@workordr.com",  phone="555-2004",
                   status="active",   skill_level="specialist", base_rate=85.00,
                   working_hours_start="08:00", working_hours_end="16:00", company_id=company_id),
        Technician(name="Carlos Diaz", email="carlos@workordr.com", phone="555-2005",
                   status="inactive", skill_level="junior",     base_rate=40.00,
                   working_hours_start="08:00", working_hours_end="17:00", company_id=company_id),
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
        Customer(name="Alice Johnson",  email="alice@example.com",  phone="555-1001", address="123 Main St, Austin TX 78701", company_id=company_id),
        Customer(name="Bob Martinez",   email="bob@example.com",    phone="555-1002", address="456 Oak Ave, Austin TX 78702", company_id=company_id),
        Customer(name="Carol Williams", email="carol@example.com",  phone="555-1003", address="789 Pine Rd, Austin TX 78703", company_id=company_id),
        Customer(name="David Chen",     email="david@example.com",  phone="555-1004", address="321 Elm St, Austin TX 78704", company_id=company_id),
        Customer(name="Emma Davis",     email="emma@example.com",   phone="555-1005", address="654 Maple Dr, Austin TX 78705", company_id=company_id),
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
            scheduled_end_at=now.replace(hour=10, minute=30, second=0, microsecond=0),
            company_id=company_id),

        Job(customer_id=customers[1].id, technician_id=tech["Sarah Kim"].id,
            service_id=svc["Fridge Repair"].id,
            title="Refrigerator Repair", description="Fridge not cooling, makes noise",
            address=customers[1].address, status="in_progress",
            notes="Compressor issue suspected",
            scheduled_at=now.replace(hour=10, minute=0, second=0, microsecond=0),
            scheduled_end_at=now.replace(hour=11, minute=0, second=0, microsecond=0),
            company_id=company_id),

        Job(customer_id=customers[2].id, technician_id=tech["James Rivera"].id,
            service_id=svc["Plumbing — Leak Fix"].id,
            title="Kitchen Sink Leak", description="Drain pipe leaking under sink",
            address=customers[2].address, status="en_route",
            scheduled_at=now.replace(hour=11, minute=0, second=0, microsecond=0),
            scheduled_end_at=now.replace(hour=12, minute=0, second=0, microsecond=0),
            company_id=company_id),

        Job(customer_id=customers[3].id,
            service_id=svc["Deep Cleaning"].id,
            title="Full Home Deep Clean", description="4-bedroom house",
            address=customers[3].address, status="requested",
            company_id=company_id),

        Job(customer_id=customers[4].id,
            service_id=svc["Electrical Inspection"].id,
            title="Electrical Panel Inspection", description="Annual safety check",
            address=customers[4].address, status="pending",
            company_id=company_id),

        Job(customer_id=customers[0].id, technician_id=tech["Priya Patel"].id,
            service_id=svc["AC Installation"].id,
            title="AC Installation — Master Bedroom",
            address=customers[0].address, status="paid",
            notes="Installed successfully, tested cooling",
            scheduled_at=now - timedelta(days=3),
            scheduled_end_at=now - timedelta(days=3) + timedelta(hours=3),
            company_id=company_id),

        Job(customer_id=customers[1].id, technician_id=tech["Sarah Kim"].id,
            service_id=svc["Regular Cleaning"].id,
            title="Monthly Cleaning", description="Standard monthly cleaning",
            address=customers[1].address, status="completed",
            scheduled_at=now - timedelta(days=1, hours=2),
            scheduled_end_at=now - timedelta(days=1),
            company_id=company_id),

        Job(customer_id=customers[3].id, technician_id=tech["Mike Torres"].id,
            service_id=svc["AC Repair"].id,
            title="AC Tune-Up", description="Annual tune-up",
            address=customers[3].address, status="assigned",
            scheduled_at=now + timedelta(days=1, hours=2),
            scheduled_end_at=now + timedelta(days=1, hours=4),
            company_id=company_id),
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

    # ── Admin user account (for web portal login) ─────────────────────────────
    if company_id:
        from app.auth import hash_password
        # Create admin user for web portal
        admin_user = User(
            company_id=company_id,
            email="demo@workordr.com",
            password_hash=hash_password("workordr2024"),
            role="admin",
        )
        existing_admin = db.query(User).filter(User.email == "demo@workordr.com").first()
        if not existing_admin:
            db.add(admin_user)

    # ── Technician user accounts (for mobile app login) ───────────────────────
    if company_id:
        tech_users = [
            User(
                company_id=company_id,
                technician_id=tech["Mike Torres"].id,
                email="mike.tech@workordr.com",
                password_hash=hash_password("tech1234"),
                role="technician",
            ),
            User(
                company_id=company_id,
                technician_id=tech["Sarah Kim"].id,
                email="sarah.tech@workordr.com",
                password_hash=hash_password("tech1234"),
                role="technician",
            ),
            User(
                company_id=company_id,
                technician_id=tech["James Rivera"].id,
                email="james.tech@workordr.com",
                password_hash=hash_password("tech1234"),
                role="technician",
            ),
        ]
        # Only add users whose email doesn't already exist
        for u in tech_users:
            exists = db.query(User).filter(User.email == u.email).first()
            if not exists:
                db.add(u)

    db.commit()

    return {
        "services": len(services),
        "technicians": len(technicians),
        "customers": len(customers),
        "jobs": len(jobs_data),
        "schedules": len(schedules),
        "invoices": 2,
    }
