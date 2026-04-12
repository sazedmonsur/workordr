import uuid
from datetime import datetime
from sqlalchemy import String, Text, Numeric, Integer, ForeignKey, DateTime, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    address: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    jobs: Mapped[list["Job"]] = relationship("Job", back_populates="customer")
    invoices: Mapped[list["Invoice"]] = relationship("Invoice", back_populates="customer")


class Technician(Base):
    __tablename__ = "technicians"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="active")
    # Phase 2 additions
    skill_level: Mapped[str] = mapped_column(String(20), default="junior")  # junior, senior, specialist
    base_rate: Mapped[float | None] = mapped_column(Numeric(10, 2))
    working_hours_start: Mapped[str] = mapped_column(String(5), default="08:00")  # "HH:MM"
    working_hours_end: Mapped[str] = mapped_column(String(5), default="17:00")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    jobs: Mapped[list["Job"]] = relationship("Job", back_populates="technician")
    schedules: Mapped[list["Schedule"]] = relationship("Schedule", back_populates="technician")
    technician_services: Mapped[list["TechnicianService"]] = relationship(
        "TechnicianService", back_populates="technician", cascade="all, delete-orphan"
    )
    availability_slots: Mapped[list["AvailabilitySlot"]] = relationship(
        "AvailabilitySlot", back_populates="technician", cascade="all, delete-orphan"
    )


class Service(Base):
    __tablename__ = "services"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str | None] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text)
    base_price: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    estimated_duration: Mapped[int] = mapped_column(Integer, default=60)  # minutes
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    technician_services: Mapped[list["TechnicianService"]] = relationship(
        "TechnicianService", back_populates="service", cascade="all, delete-orphan"
    )
    jobs: Mapped[list["Job"]] = relationship("Job", back_populates="service")


class TechnicianService(Base):
    __tablename__ = "technician_services"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    technician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("technicians.id"), nullable=False)
    service_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("services.id"), nullable=False)

    technician: Mapped["Technician"] = relationship("Technician", back_populates="technician_services")
    service: Mapped["Service"] = relationship("Service", back_populates="technician_services")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    technician_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("technicians.id"))
    service_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("services.id"))
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="pending")
    notes: Mapped[str | None] = mapped_column(Text)
    address: Mapped[str | None] = mapped_column(Text)  # job site address
    # Denormalised scheduling fields for fast querying
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime)
    scheduled_end_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    customer: Mapped["Customer"] = relationship("Customer", back_populates="jobs")
    technician: Mapped["Technician | None"] = relationship("Technician", back_populates="jobs")
    service: Mapped["Service | None"] = relationship("Service", back_populates="jobs")
    schedule: Mapped["Schedule | None"] = relationship("Schedule", back_populates="job", uselist=False)
    invoice: Mapped["Invoice | None"] = relationship("Invoice", back_populates="job", uselist=False)
    status_history: Mapped[list["JobStatusHistory"]] = relationship(
        "JobStatusHistory", back_populates="job", cascade="all, delete-orphan", order_by="JobStatusHistory.created_at"
    )


class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id"), unique=True, nullable=False)
    technician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("technicians.id"), nullable=False)
    scheduled_start: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    scheduled_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    job: Mapped["Job"] = relationship("Job", back_populates="schedule")
    technician: Mapped["Technician"] = relationship("Technician", back_populates="schedules")


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id"), unique=True, nullable=False)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    tax: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    total: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    job: Mapped["Job"] = relationship("Job", back_populates="invoice")
    customer: Mapped["Customer"] = relationship("Customer", back_populates="invoices")
    items: Mapped[list["InvoiceItem"]] = relationship(
        "InvoiceItem", back_populates="invoice", cascade="all, delete-orphan"
    )


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False)
    description: Mapped[str] = mapped_column(String(200), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    total: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="items")


class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    technician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("technicians.id"), nullable=False)
    slot_type: Mapped[str] = mapped_column(String(20), nullable=False)  # blocked, time_off
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    technician: Mapped["Technician"] = relationship("Technician", back_populates="availability_slots")


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    recipient_email: Mapped[str | None] = mapped_column(String(100))
    recipient_phone: Mapped[str | None] = mapped_column(String(20))
    channel: Mapped[str] = mapped_column(String(20), nullable=False)  # email, sms
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, sent, failed
    payload: Mapped[str | None] = mapped_column(Text)  # JSON string
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class JobStatusHistory(Base):
    __tablename__ = "job_status_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    old_status: Mapped[str] = mapped_column(String(30), nullable=False)
    new_status: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by: Mapped[str | None] = mapped_column(String(50))  # admin, technician, system
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    job: Mapped["Job"] = relationship("Job", back_populates="status_history")
