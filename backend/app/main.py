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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create new tables (idempotent)
    Base.metadata.create_all(bind=engine)

    # 2. Add company_id columns to existing tables via ALTER TABLE IF NOT EXISTS
    migration_sqls = [
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id)",
        "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id)",
        "ALTER TABLE services ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id)",
        "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id)",
    ]
    with engine.connect() as conn:
        for sql in migration_sqls:
            try:
                conn.execute(text(sql))
            except Exception:
                pass  # column may already exist with correct type
        conn.commit()

    # 3. Create demo company + admin user if they don't exist, then seed records
    _bootstrap_demo()

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


@app.get("/health")
def health():
    return {"status": "ok", "app": "WorkOrdr", "version": "2.0.0"}
