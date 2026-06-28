from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine, Base, get_db
from app.routers import (
    customers, technicians, jobs, schedules,
    invoices, payments, dashboard,
    services, bookings, availability,
    analytics, notifications_log, admin_demo,
)
from app.routers import auth as auth_router
from app.routers import superadmin as superadmin_router
from app.routers import quotes as quotes_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    import threading
    def run_startup():
        try:
            Base.metadata.create_all(bind=engine)
        except Exception as e:
            print(f"[startup] create_all warning: {e}")
        try:
            migration_sqls = [
                "ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id)",
                "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id)",
                "ALTER TABLE services ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id)",
                "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id)",
                "CREATE TABLE IF NOT EXISTS quotes (id UUID PRIMARY KEY, company_id UUID REFERENCES companies(id) NOT NULL, job_id UUID REFERENCES jobs(id) NOT NULL, technician_id UUID REFERENCES technicians(id), status VARCHAR(20) DEFAULT 'submitted', notes TEXT, subtotal NUMERIC(10,2) DEFAULT 0, total NUMERIC(10,2) DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), submitted_at TIMESTAMP)",
                "CREATE TABLE IF NOT EXISTS quote_items (id UUID PRIMARY KEY, quote_id UUID REFERENCES quotes(id) NOT NULL, description VARCHAR(255) NOT NULL, quantity NUMERIC(10,2) DEFAULT 1, unit_price NUMERIC(10,2) DEFAULT 0, total NUMERIC(10,2) DEFAULT 0)",
                "CREATE TABLE IF NOT EXISTS job_photos (id UUID PRIMARY KEY, company_id UUID REFERENCES companies(id) NOT NULL, job_id UUID REFERENCES jobs(id) NOT NULL, technician_id UUID REFERENCES technicians(id), caption VARCHAR(255), data TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW())",
            ]
            with engine.connect() as conn:
                for sql in migration_sqls:
                    try:
                        conn.execute(text(sql))
                    except Exception:
                        pass
                conn.commit()
        except Exception as e:
            print(f"[startup] migration warning: {e}")
        try:
            _bootstrap_demo()
        except Exception as e:
            print(f"[startup] bootstrap warning: {e}")
        print("[startup] done")
    threading.Thread(target=run_startup, daemon=True).start()
    yield


def _bootstrap_demo():
    """Backfill company_id for existing records."""
    from app.models import Company
    db = next(get_db())
    try:
        # Assign all null company_id records to first company (or create one)
        first_company = db.query(Company).first()
        if first_company:
            with engine.connect() as conn:
                company_id_str = str(first_company.id)
                for table in ("customers", "technicians", "services", "jobs"):
                    conn.execute(
                        text(f"UPDATE {table} SET company_id = :cid WHERE company_id IS NULL"),
                        {"cid": company_id_str},
                    )
                conn.commit()
    except Exception as e:
        print(f"[startup] Backfill warning: {e}")
    finally:
        db.close()


app = FastAPI(
    title="WorkOrdr API",
    description="Field Service Management — Phase 2",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth + multi-tenancy
app.include_router(auth_router.router)
app.include_router(superadmin_router.router)

# Core
app.include_router(customers.router)
app.include_router(technicians.router)
app.include_router(jobs.router)
app.include_router(schedules.router)
app.include_router(invoices.router)
app.include_router(payments.router)
app.include_router(dashboard.router)

# Phase 2
app.include_router(services.router)
app.include_router(bookings.router)
app.include_router(availability.router)
app.include_router(analytics.router)
app.include_router(notifications_log.router)
app.include_router(admin_demo.router)
app.include_router(quotes_router.router)


@app.get("/health")
def health():
    return {"status": "ok", "app": "WorkOrdr", "version": "2.0.1"}
