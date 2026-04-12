import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


# ── Customers ──────────────────────────────────────────────────────────────

class CustomerCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None


class CustomerOut(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    phone: Optional[str]
    address: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Technicians ────────────────────────────────────────────────────────────

class TechnicianCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None


class TechnicianOut(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    phone: Optional[str]
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Jobs ───────────────────────────────────────────────────────────────────

class JobCreate(BaseModel):
    customer_id: uuid.UUID
    technician_id: Optional[uuid.UUID] = None
    title: str
    description: Optional[str] = None


class JobStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class JobOut(BaseModel):
    id: uuid.UUID
    customer_id: uuid.UUID
    technician_id: Optional[uuid.UUID]
    title: str
    description: Optional[str]
    status: str
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    customer: Optional[CustomerOut] = None
    technician: Optional[TechnicianOut] = None

    model_config = {"from_attributes": True}


# ── Schedules ──────────────────────────────────────────────────────────────

class ScheduleCreate(BaseModel):
    job_id: uuid.UUID
    technician_id: uuid.UUID
    scheduled_start: datetime
    scheduled_end: datetime


class ScheduleOut(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    technician_id: uuid.UUID
    scheduled_start: datetime
    scheduled_end: datetime
    created_at: datetime
    job: Optional[JobOut] = None
    technician: Optional[TechnicianOut] = None

    model_config = {"from_attributes": True}


# ── Invoices ───────────────────────────────────────────────────────────────

class InvoiceItemCreate(BaseModel):
    description: str
    quantity: int = 1
    unit_price: float


class InvoiceItemOut(BaseModel):
    id: uuid.UUID
    description: str
    quantity: int
    unit_price: float
    total: float

    model_config = {"from_attributes": True}


class InvoiceCreate(BaseModel):
    job_id: uuid.UUID
    items: list[InvoiceItemCreate]
    tax: float = 0.0


class InvoiceOut(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    customer_id: uuid.UUID
    subtotal: float
    tax: float
    total: float
    status: str
    stripe_payment_intent_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    items: list[InvoiceItemOut] = []
    customer: Optional[CustomerOut] = None

    model_config = {"from_attributes": True}


# ── Payments ───────────────────────────────────────────────────────────────

class PaymentIntentCreate(BaseModel):
    invoice_id: uuid.UUID


class PaymentIntentOut(BaseModel):
    client_secret: str
    payment_intent_id: str


class PaymentConfirm(BaseModel):
    payment_intent_id: str
    invoice_id: uuid.UUID


# ── Dashboard ──────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_jobs: int
    completed_jobs: int
    pending_jobs: int
    in_progress_jobs: int
    total_revenue: float
    paid_invoices: int
    unpaid_invoices: int
    recent_jobs: list[JobOut] = []
