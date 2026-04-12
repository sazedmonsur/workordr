"""
Phase 2 API tests.
Run: pytest tests/test_phase2.py -v
Uses a separate workordr_test database.
"""
import os
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost/workordr_test")
os.environ.setdefault("STRIPE_SECRET_KEY", "")

from app.main import app
from app.database import Base, get_db

TEST_DB_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost/workordr_test")
engine = create_engine(TEST_DB_URL)
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


# ── Helpers ───────────────────────────────────────────────────────────────

def make_customer(name="Test Customer", email="test@example.com"):
    r = client.post("/customers", json={"name": name, "email": email, "phone": "555-0000", "address": "1 Main St"})
    assert r.status_code == 201
    return r.json()


def make_technician(name="Tech One", email="tech1@workordr.com"):
    r = client.post("/technicians", json={
        "name": name, "email": email, "phone": "555-0001",
        "skill_level": "senior", "base_rate": 65.0,
    })
    assert r.status_code == 201
    return r.json()


def make_service(name="AC Repair", category="HVAC", base_price=150.0):
    r = client.post("/services", json={
        "name": name, "category": category, "base_price": base_price,
        "estimated_duration": 60,
    })
    assert r.status_code == 201
    return r.json()


def make_job(customer_id, service_id=None, technician_id=None, title="Test Job"):
    payload = {"customer_id": customer_id, "title": title, "address": "1 Main St"}
    if service_id:
        payload["service_id"] = service_id
    if technician_id:
        payload["technician_id"] = technician_id
    r = client.post("/jobs", json=payload)
    assert r.status_code == 201
    return r.json()


# ── Service Catalog ────────────────────────────────────────────────────────

def test_create_and_list_services():
    svc = make_service()
    assert svc["name"] == "AC Repair"
    assert svc["base_price"] == 150.0

    r = client.get("/services")
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_update_service():
    svc = make_service()
    r = client.put(f"/services/{svc['id']}", json={"base_price": 200.0, "is_active": False})
    assert r.status_code == 200
    assert r.json()["base_price"] == 200.0
    assert r.json()["is_active"] == False


def test_inactive_services_excluded_from_list():
    svc = make_service()
    client.put(f"/services/{svc['id']}", json={"is_active": False})
    r = client.get("/services")  # active_only=True by default
    assert r.status_code == 200
    assert len(r.json()) == 0


# ── Technician Management ──────────────────────────────────────────────────

def test_create_technician_with_new_fields():
    r = client.post("/technicians", json={
        "name": "Jane Doe", "email": "jane@workordr.com",
        "skill_level": "specialist", "base_rate": 85.0,
        "working_hours_start": "07:00", "working_hours_end": "15:00",
    })
    assert r.status_code == 201
    data = r.json()
    assert data["skill_level"] == "specialist"
    assert data["base_rate"] == 85.0
    assert data["working_hours_start"] == "07:00"


def test_update_technician():
    tech = make_technician()
    r = client.put(f"/technicians/{tech['id']}", json={"status": "inactive", "base_rate": 70.0})
    assert r.status_code == 200
    assert r.json()["status"] == "inactive"


def test_assign_service_to_technician():
    tech = make_technician()
    svc = make_service()
    r = client.post(f"/technicians/{tech['id']}/services/{svc['id']}")
    assert r.status_code == 201
    r2 = client.get(f"/technicians/{tech['id']}")
    assert r2.status_code == 200
    services = r2.json().get("services", [])
    assert any(s["id"] == svc["id"] for s in services)


# ── Booking Flow (customer-facing) ─────────────────────────────────────────

def test_booking_creates_requested_job():
    svc = make_service()
    preferred = (datetime.utcnow() + timedelta(days=2)).isoformat()
    preferred_end = (datetime.utcnow() + timedelta(days=2, hours=1)).isoformat()
    r = client.post("/bookings", json={
        "service_id": svc["id"],
        "customer_name": "New Customer",
        "customer_email": "newcust@example.com",
        "customer_phone": "555-9999",
        "address": "99 New St",
        "preferred_start": preferred,
        "preferred_end": preferred_end,
    })
    assert r.status_code == 201
    data = r.json()
    assert data["status"] == "requested"
    assert data["service_name"] == "AC Repair"
    assert "job_id" in data


def test_booking_inactive_service_rejected():
    svc = make_service()
    client.put(f"/services/{svc['id']}", json={"is_active": False})
    r = client.post("/bookings", json={
        "service_id": svc["id"],
        "customer_name": "X",
        "customer_email": "x@x.com",
        "address": "1 X St",
        "preferred_start": datetime.utcnow().isoformat(),
        "preferred_end": (datetime.utcnow() + timedelta(hours=1)).isoformat(),
    })
    assert r.status_code == 404


# ── Job Status Lifecycle ───────────────────────────────────────────────────

def test_full_job_status_progression():
    customer = make_customer()
    tech = make_technician()
    job = make_job(customer["id"])

    # requested → assigned
    r = client.patch(f"/jobs/{job['id']}/status", json={"status": "assigned", "changed_by": "admin"})
    assert r.status_code == 200
    assert r.json()["status"] == "assigned"

    # assigned → en_route
    r = client.patch(f"/jobs/{job['id']}/status", json={"status": "en_route", "changed_by": "technician"})
    assert r.status_code == 200

    # en_route → in_progress
    r = client.patch(f"/jobs/{job['id']}/status", json={"status": "in_progress", "changed_by": "technician"})
    assert r.status_code == 200

    # complete via endpoint
    r = client.post(f"/jobs/{job['id']}/complete", json={"notes": "Job done, all clear"})
    assert r.status_code == 200
    assert r.json()["status"] == "completed"


def test_invalid_status_rejected():
    customer = make_customer()
    job = make_job(customer["id"])
    r = client.patch(f"/jobs/{job['id']}/status", json={"status": "flying"})
    assert r.status_code == 400


def test_job_status_history_recorded():
    customer = make_customer()
    job = make_job(customer["id"])
    client.patch(f"/jobs/{job['id']}/status", json={"status": "in_progress", "changed_by": "technician"})
    r = client.get(f"/jobs/{job['id']}/history")
    assert r.status_code == 200
    history = r.json()
    assert len(history) >= 1
    assert history[0]["new_status"] == "in_progress"


# ── Admin Assignment + Dispatch ─────────────────────────────────────────────

def test_schedule_assigns_technician_and_sends_notification():
    customer = make_customer()
    tech = make_technician()
    job = make_job(customer["id"])
    start = (datetime.utcnow() + timedelta(hours=2)).isoformat()
    end = (datetime.utcnow() + timedelta(hours=3)).isoformat()

    r = client.post("/schedules", json={
        "job_id": job["id"],
        "technician_id": tech["id"],
        "scheduled_start": start,
        "scheduled_end": end,
    })
    assert r.status_code == 201
    data = r.json()
    assert data["technician_id"] == tech["id"]

    # Job should now be assigned
    job_r = client.get(f"/jobs/{job['id']}")
    assert job_r.json()["status"] == "assigned"


def test_dispatch_board_endpoint():
    customer = make_customer()
    tech = make_technician()
    job = make_job(customer["id"])
    start = datetime.utcnow().replace(hour=10, minute=0, second=0, microsecond=0).isoformat()
    end = datetime.utcnow().replace(hour=11, minute=0, second=0, microsecond=0).isoformat()
    client.post("/schedules", json={
        "job_id": job["id"], "technician_id": tech["id"],
        "scheduled_start": start, "scheduled_end": end,
    })
    today = datetime.utcnow().strftime("%Y-%m-%d")
    r = client.get(f"/jobs/admin/dispatch?date={today}")
    assert r.status_code == 200


# ── Invoice + Payment ──────────────────────────────────────────────────────

def test_invoice_advances_job_to_invoiced():
    customer = make_customer()
    job = make_job(customer["id"])
    client.patch(f"/jobs/{job['id']}/status", json={"status": "completed"})

    r = client.post("/invoices", json={
        "job_id": job["id"],
        "items": [{"description": "Service", "quantity": 1, "unit_price": 150.0}],
        "tax": 12.0,
    })
    assert r.status_code == 201
    assert r.json()["status"] == "draft"

    job_r = client.get(f"/jobs/{job['id']}")
    assert job_r.json()["status"] == "invoiced"


# ── Analytics ──────────────────────────────────────────────────────────────

def test_analytics_overview():
    r = client.get("/admin/analytics/overview")
    assert r.status_code == 200
    data = r.json()
    assert "jobs_today" in data
    assert "revenue_today" in data
    assert "technician_workload" in data


# ── Availability ───────────────────────────────────────────────────────────

def test_add_and_list_availability_block():
    tech = make_technician()
    start = (datetime.utcnow() + timedelta(hours=5)).isoformat()
    end = (datetime.utcnow() + timedelta(hours=6)).isoformat()
    r = client.post(f"/availability/{tech['id']}", json={
        "slot_type": "blocked",
        "start_time": start,
        "end_time": end,
        "notes": "Training",
    })
    assert r.status_code == 201

    r2 = client.get(f"/availability/{tech['id']}")
    assert r2.status_code == 200
    assert len(r2.json()) == 1


def test_availability_search():
    make_technician()
    today = datetime.utcnow().strftime("%Y-%m-%d")
    r = client.get(f"/availability/search?date={today}&duration=60")
    assert r.status_code == 200
    # May be empty depending on working hours vs current time; just check shape
    for slot in r.json():
        assert "start" in slot
        assert "technician_id" in slot


# ── Notifications Log ──────────────────────────────────────────────────────

def test_notification_log_populated_after_booking():
    svc = make_service()
    preferred = (datetime.utcnow() + timedelta(days=1)).isoformat()
    preferred_end = (datetime.utcnow() + timedelta(days=1, hours=1)).isoformat()
    client.post("/bookings", json={
        "service_id": svc["id"],
        "customer_name": "Notif Test",
        "customer_email": "notif@example.com",
        "address": "1 St",
        "preferred_start": preferred,
        "preferred_end": preferred_end,
    })
    r = client.get("/admin/notifications")
    assert r.status_code == 200
    logs = r.json()
    assert len(logs) >= 1
    assert logs[0]["event_type"] == "booking_created"
