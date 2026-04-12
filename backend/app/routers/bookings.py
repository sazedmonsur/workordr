"""
Customer-facing booking intake.
Creates a Job with status=requested and fires a notification.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Customer, Job, Service
from app.schemas import BookingCreate, BookingOut
from app.notifications.events import notify

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingOut, status_code=201)
def create_booking(payload: BookingCreate, db: Session = Depends(get_db)):
    # Verify service exists
    service = db.query(Service).filter(
        Service.id == payload.service_id, Service.is_active == True
    ).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found or inactive")

    # Upsert customer by email
    customer = db.query(Customer).filter(Customer.email == payload.customer_email).first()
    if not customer:
        customer = Customer(
            name=payload.customer_name,
            email=payload.customer_email,
            phone=payload.customer_phone,
            address=payload.address,
        )
        db.add(customer)
        db.flush()
    else:
        # Update name/phone if provided
        customer.name = payload.customer_name
        if payload.customer_phone:
            customer.phone = payload.customer_phone

    # Create the job
    job = Job(
        customer_id=customer.id,
        service_id=payload.service_id,
        title=service.name,
        description=payload.notes,
        address=payload.address,
        status="requested",
        scheduled_at=payload.preferred_start,
        scheduled_end_at=payload.preferred_end,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Fire notification
    notify(
        db,
        event_type="booking_created",
        recipient_email=customer.email,
        recipient_phone=customer.phone,
        data={
            "customer_name": customer.name,
            "service_name": service.name,
            "scheduled_at": str(payload.preferred_start),
        },
    )

    return BookingOut(
        job_id=job.id,
        status=job.status,
        service_name=service.name,
        customer_name=customer.name,
        scheduled_at=job.scheduled_at,
        message="Booking received. We'll confirm your appointment shortly.",
    )
