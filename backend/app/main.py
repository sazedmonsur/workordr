from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import (
    customers, technicians, jobs, schedules,
    invoices, payments, dashboard,
    services, bookings, availability,
    analytics, notifications_log,
)

# Create all tables on startup (idempotent — safe to call each time)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="WorkOrdr API",
    description="Field Service Management — Phase 2",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.get("/health")
def health():
    return {"status": "ok", "app": "WorkOrdr", "version": "2.0.0"}
