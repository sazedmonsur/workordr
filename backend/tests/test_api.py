"""
Basic API tests. Run: pytest tests/
Requires a running test database (set TEST_DATABASE_URL env var).
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
import os

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/workordr_test"
)

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ── Health ─────────────────────────────────────────────────────────────────

def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ── Customers ──────────────────────────────────────────────────────────────

def test_create_customer(client):
    r = client.post("/customers", json={
        "name": "Test Customer",
        "email": "test@example.com",
        "phone": "555-9999"
    })
    assert r.status_code == 201
    data = r.json()
    assert data["email"] == "test@example.com"
    return data


def test_create_duplicate_customer(client):
    client.post("/customers", json={"name": "Dupe", "email": "dupe@example.com"})
    r = client.post("/customers", json={"name": "Dupe2", "email": "dupe@example.com"})
    assert r.status_code == 400


def test_list_customers(client):
    r = client.get("/customers")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ── Technicians ────────────────────────────────────────────────────────────

def test_create_technician(client):
    r = client.post("/technicians", json={
        "name": "Test Tech",
        "email": "tech@workordr.com",
        "phone": "555-8888"
    })
    assert r.status_code == 201
    assert r.json()["status"] == "active"


# ── Jobs ───────────────────────────────────────────────────────────────────

def test_create_job(client):
    cust = client.post("/customers", json={"name": "Job Owner", "email": "jobowner@example.com"}).json()
    r = client.post("/jobs", json={
        "customer_id": cust["id"],
        "title": "Test Job",
        "description": "Test description"
    })
    assert r.status_code == 201
    assert r.json()["status"] == "pending"
    return r.json()


def test_update_job_status(client):
    cust = client.post("/customers", json={"name": "Status Owner", "email": "status@example.com"}).json()
    job = client.post("/jobs", json={"customer_id": cust["id"], "title": "Status Test"}).json()
    r = client.patch(f"/jobs/{job['id']}/status", json={"status": "in_progress"})
    assert r.status_code == 200
    assert r.json()["status"] == "in_progress"


def test_invalid_job_status(client):
    cust = client.post("/customers", json={"name": "Bad Status", "email": "badstatus@example.com"}).json()
    job = client.post("/jobs", json={"customer_id": cust["id"], "title": "Bad Status Job"}).json()
    r = client.patch(f"/jobs/{job['id']}/status", json={"status": "flying"})
    assert r.status_code == 400


# ── Dashboard ──────────────────────────────────────────────────────────────

def test_dashboard_stats(client):
    r = client.get("/dashboard/stats")
    assert r.status_code == 200
    data = r.json()
    assert "total_jobs" in data
    assert "total_revenue" in data
    assert "paid_invoices" in data
