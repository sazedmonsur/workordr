from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import customers, technicians, jobs, schedules, invoices, payments, dashboard

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="WorkOrdr API",
    description="Field Service Management — MVP",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customers.router)
app.include_router(technicians.router)
app.include_router(jobs.router)
app.include_router(schedules.router)
app.include_router(invoices.router)
app.include_router(payments.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok", "app": "WorkOrdr"}
