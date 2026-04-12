import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Job, Technician
from app.schemas import JobCreate, JobOut, JobStatusUpdate

router = APIRouter(prefix="/jobs", tags=["jobs"])

VALID_STATUSES = {"pending", "scheduled", "in_progress", "completed", "cancelled"}


@router.post("", response_model=JobOut, status_code=201)
def create_job(payload: JobCreate, db: Session = Depends(get_db)):
    job = Job(**payload.model_dump())
    db.add(job)
    db.commit()
    db.refresh(job)
    return db.query(Job).options(
        joinedload(Job.customer),
        joinedload(Job.technician)
    ).filter(Job.id == job.id).first()


@router.get("", response_model=list[JobOut])
def list_jobs(
    status: Optional[str] = Query(None),
    technician_id: Optional[uuid.UUID] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(Job).options(joinedload(Job.customer), joinedload(Job.technician))
    if status:
        q = q.filter(Job.status == status)
    if technician_id:
        q = q.filter(Job.technician_id == technician_id)
    return q.order_by(Job.created_at.desc()).all()


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: uuid.UUID, db: Session = Depends(get_db)):
    job = db.query(Job).options(
        joinedload(Job.customer),
        joinedload(Job.technician),
        joinedload(Job.schedule)
    ).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.patch("/{job_id}/status", response_model=JobOut)
def update_job_status(job_id: uuid.UUID, payload: JobStatusUpdate, db: Session = Depends(get_db)):
    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {VALID_STATUSES}")
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = payload.status
    if payload.notes:
        job.notes = payload.notes
    db.commit()
    db.refresh(job)
    return db.query(Job).options(
        joinedload(Job.customer),
        joinedload(Job.technician)
    ).filter(Job.id == job.id).first()
