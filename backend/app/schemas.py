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
    skill_level: str = "junior"
    base_rate: Optional[float] = None
    working_hours_start: str = "08:00"
    working_hours_end: str = "17:00"


class TechnicianUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    skill_level: Optional[str] = None
    base_rate: Optional[float] = None
    working_hours_start: Optional[str] = None
    working_hours_end: Optional[str] = None


class ServiceOut(BaseModel):
    id: uuid.UUID
    name: str
    category: Optional[str]
    description: Optional[str]
    base_price: float
    estimated_duration: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TechnicianOut(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    phone: Optional[str]
    status: str
    skill_level: str
    base_rate: Optional[float]
    working_hours_start: str
    working_hours_end: str
    created_at: datetime
    services: list[ServiceOut] = []

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        instance = super().model_validate(obj, *args, **kwargs)
        # Resolve technician_services → services
        if hasattr(obj, "technician_services"):
            instance.services = [ts.service for ts in obj.technician_services if ts.service]
        return instance


# ── Services ───────────────────────────────────────────────────────────────

class ServiceCreate(BaseModel):
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    base_price: float = 0.0
    estimated_duration: int = 60


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[float] = None
    estimated_duration: Optional[int] = None
    is_active: Optional[bool] = None


# ── Jobs ───────────────────────────────────────────────────────────────────

class JobCreate(BaseModel):
    customer_id: uuid.UUID
    technician_id: Optional[uuid.UUID] = None
    service_id: Optional[uuid.UUID] = None
    title: str
    description: Optional[str] = None
    address: Optional[str] = None


class JobUpdate(BaseModel):
    technician_id: Optional[uuid.UUID] = None
    service_id: Optional[uuid.UUID] = None
    title: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class JobStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None
    changed_by: Optional[str] = "admin"


class JobOut(BaseModel):
    id: uuid.UUID
    customer_id: uuid.UUID
    technician_id: Optional[uuid.UUID]
    service_id: Optional[uuid.UUID]
    title: str
    description: Optional[str]
    status: str
    notes: Optional[str]
    address: Optional[str]
    scheduled_at: Optional[datetime]
    scheduled_end_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    customer: Optional[CustomerOut] = None
    technician: Optional[TechnicianOut] = None
    service: Optional[ServiceOut] = None

    model_config = {"from_attributes": True}


class JobStatusHistoryOut(BaseModel):
    id: uuid.UUID
    old_status: str
    new_status: str
    changed_by: Optional[str]
    notes: Optional[str]
    created_at: datetime

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


# ── Availability ───────────────────────────────────────────────────────────

class AvailabilitySlotCreate(BaseModel):
    slot_type: str  # blocked, time_off
    start_time: datetime
    end_time: datetime
    notes: Optional[str] = None


class AvailabilitySlotOut(BaseModel):
    id: uuid.UUID
    technician_id: uuid.UUID
    slot_type: str
    start_time: datetime
    end_time: datetime
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class AvailableSlot(BaseModel):
    start: datetime
    end: datetime
    technician_id: uuid.UUID
    technician_name: str


# ── Bookings (customer-facing) ─────────────────────────────────────────────

class BookingCreate(BaseModel):
    service_id: uuid.UUID
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = None
    address: str
    notes: Optional[str] = None
    preferred_start: datetime
    preferred_end: datetime


class BookingOut(BaseModel):
    job_id: uuid.UUID
    status: str
    service_name: str
    customer_name: str
    scheduled_at: Optional[datetime]
    message: str


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


# ── Quotes ─────────────────────────────────────────────────────────────────

class QuoteItemCreate(BaseModel):
    description: str
    quantity: float = 1.0
    unit_price: float


class QuoteItemOut(BaseModel):
    id: uuid.UUID
    description: str
    quantity: float
    unit_price: float
    total: float

    model_config = {"from_attributes": True}


class QuoteCreate(BaseModel):
    job_id: uuid.UUID
    technician_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    items: list[QuoteItemCreate]


class QuoteOut(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    technician_id: Optional[uuid.UUID]
    status: str
    notes: Optional[str]
    subtotal: float
    total: float
    created_at: datetime
    submitted_at: Optional[datetime]
    items: list[QuoteItemOut] = []

    model_config = {"from_attributes": True}


class QuoteStatusUpdate(BaseModel):
    status: str  # approved, rejected


# ── Job Photos ──────────────────────────────────────────────────────────────

class JobPhotoCreate(BaseModel):
    job_id: uuid.UUID
    technician_id: Optional[uuid.UUID] = None
    caption: Optional[str] = None
    data: str  # base64 encoded


class JobPhotoOut(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    technician_id: Optional[uuid.UUID]
    caption: Optional[str]
    data: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Analytics ──────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_jobs: int
    completed_jobs: int
    pending_jobs: int
    in_progress_jobs: int
    total_revenue: float
    paid_invoices: int
    unpaid_invoices: int
    recent_jobs: list[JobOut] = []


class AnalyticsOverview(BaseModel):
    jobs_today: int
    jobs_this_week: int
    revenue_today: float
    revenue_this_week: float
    jobs_by_status: dict[str, int]
    paid_invoices: int
    unpaid_invoices: int
    technician_workload: list[dict]


# ── Notifications ──────────────────────────────────────────────────────────

class NotificationLogOut(BaseModel):
    id: uuid.UUID
    event_type: str
    recipient_email: Optional[str]
    recipient_phone: Optional[str]
    channel: str
    status: str
    payload: Optional[str]
    error_message: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
