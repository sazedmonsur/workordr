import uuid
from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Schedule, Job, Technician
from app.schemas import ScheduleCreate, ScheduleOut

router = APIRouter(prefix="/schedules", tags=["schedules"])


@router.post("", response_model=ScheduleOut, status_code=201)
def create_schedule(payload: ScheduleCreate, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    existing = db.query(Schedule).filter(Schedule.job_id == payload.job_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Job is already scheduled")

    tech = db.query(Technician).filter(Technician.id == payload.technician_id).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician not found")

    if payload.scheduled_end <= payload.scheduled_start:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    schedule = Schedule(**payload.model_dump())
    db.add(schedule)

    # update job
    job.technician_id = payload.technician_id
    job.status = "scheduled"

    db.commit()
    db.refresh(schedule)
    return db.query(Schedule).options(
        joinedload(Schedule.job).joinedload(Job.customer),
        joinedload(Schedule.technician)
    ).filter(Schedule.id == schedule.id).first()


@router.get("", response_model=list[ScheduleOut])
def list_schedules(
    date_filter: Optional[date] = Query(None, alias="date"),
    technician_id: Optional[uuid.UUID] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(Schedule).options(
        joinedload(Schedule.job).joinedload(Job.customer),
        joinedload(Schedule.technician)
    )
    if date_filter:
        q = q.filter(
            Schedule.scheduled_start >= date_filter.isoformat(),
            Schedule.scheduled_start < f"{date_filter.isoformat()}T23:59:59"
        )
    if technician_id:
        q = q.filter(Schedule.technician_id == technician_id)
    return q.order_by(Schedule.scheduled_start).all()
