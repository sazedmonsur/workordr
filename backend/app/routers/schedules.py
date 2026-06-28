import uuid
from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Schedule, Job, Technician, JobStatusHistory
from app.schemas import ScheduleCreate, ScheduleOut
from app.notifications.events import notify
from app.auth import get_current_user

router = APIRouter(prefix="/schedules", tags=["schedules"])


def _load_schedule(db: Session, schedule_id: uuid.UUID) -> Schedule:
    return db.query(Schedule).options(
        joinedload(Schedule.job).joinedload(Job.customer),
        joinedload(Schedule.job).joinedload(Job.service),
        joinedload(Schedule.technician),
    ).filter(Schedule.id == schedule_id).first()


@router.post("", response_model=ScheduleOut, status_code=201)
def create_schedule(payload: ScheduleCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    job = db.query(Job).options(
        joinedload(Job.customer), joinedload(Job.service)
    ).filter(Job.id == payload.job_id, Job.company_id == user.company_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    tech = db.query(Technician).filter(
        Technician.id == payload.technician_id,
        Technician.company_id == user.company_id,
    ).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician not found")

    if payload.scheduled_end <= payload.scheduled_start:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    existing = db.query(Schedule).filter(Schedule.job_id == payload.job_id).first()
    if existing:
        # Update existing schedule (reassign/reschedule)
        existing.technician_id = payload.technician_id
        existing.scheduled_start = payload.scheduled_start
        existing.scheduled_end = payload.scheduled_end
        schedule = existing
    else:
        schedule = Schedule(**payload.model_dump())
        db.add(schedule)

    # Update job fields
    old_status = job.status
    job.technician_id = payload.technician_id
    job.scheduled_at = payload.scheduled_start
    job.scheduled_end_at = payload.scheduled_end
    job.status = "assigned"

    if old_status != "assigned":
        db.add(JobStatusHistory(
            job_id=job.id,
            old_status=old_status,
            new_status="assigned",
            changed_by="admin",
            notes=f"Scheduled with {tech.name}",
        ))

    db.commit()
    db.refresh(schedule)

    # Notify customer
    if job.customer:
        notify(
            db,
            event_type="technician_assigned",
            recipient_email=job.customer.email,
            recipient_phone=job.customer.phone,
            data={
                "customer_name": job.customer.name,
                "technician_name": tech.name,
                "scheduled_at": str(payload.scheduled_start),
                "service_name": job.service.name if job.service else job.title,
            },
        )

    return _load_schedule(db, schedule.id)


@router.get("", response_model=list[ScheduleOut])
def list_schedules(
    date_filter: Optional[date] = Query(None, alias="date"),
    technician_id: Optional[uuid.UUID] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    q = db.query(Schedule).options(
        joinedload(Schedule.job).joinedload(Job.customer),
        joinedload(Schedule.job).joinedload(Job.service),
        joinedload(Schedule.technician),
    ).join(Job, Schedule.job_id == Job.id).filter(Job.company_id == user.company_id)
    if date_filter:
        q = q.filter(
            Schedule.scheduled_start >= date_filter.isoformat(),
            Schedule.scheduled_start < f"{date_filter.isoformat()}T23:59:59",
        )
    if technician_id:
        q = q.filter(Schedule.technician_id == technician_id)
    return q.order_by(Schedule.scheduled_start).all()
