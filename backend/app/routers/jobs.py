import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Job, Technician, JobStatusHistory
from app.schemas import JobCreate, JobUpdate, JobOut, JobStatusUpdate, JobStatusHistoryOut
from app.auth import get_current_user

router = APIRouter(prefix="/jobs", tags=["jobs"])

VALID_STATUSES = {
    "pending", "requested", "scheduled", "assigned",
    "en_route", "in_progress", "completed", "invoiced", "paid", "cancelled",
}


def _load_job(db: Session, job_id: uuid.UUID, company_id: uuid.UUID = None) -> Job:
    q = db.query(Job).options(
        joinedload(Job.customer),
        joinedload(Job.technician),
        joinedload(Job.service),
        joinedload(Job.schedule),
    ).filter(Job.id == job_id)
    if company_id:
        q = q.filter(Job.company_id == company_id)
    job = q.first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


def _record_status_change(
    db: Session, job: Job, new_status: str, changed_by: str, notes: Optional[str]
):
    history = JobStatusHistory(
        job_id=job.id,
        old_status=job.status,
        new_status=new_status,
        changed_by=changed_by,
        notes=notes,
    )
    db.add(history)


@router.post("", response_model=JobOut, status_code=201)
def create_job(payload: JobCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    job = Job(**payload.model_dump(), company_id=user.company_id)
    db.add(job)
    db.commit()
    db.refresh(job)
    return _load_job(db, job.id, company_id=user.company_id)


@router.get("", response_model=list[JobOut])
def list_jobs(
    status: Optional[str] = Query(None),
    technician_id: Optional[uuid.UUID] = Query(None),
    customer_id: Optional[uuid.UUID] = Query(None),
    date: Optional[str] = Query(None, description="Filter by scheduled_at date YYYY-MM-DD"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    q = db.query(Job).options(
        joinedload(Job.customer),
        joinedload(Job.technician),
        joinedload(Job.service),
    ).filter(Job.company_id == user.company_id)
    if status:
        q = q.filter(Job.status == status)
    if technician_id:
        q = q.filter(Job.technician_id == technician_id)
    if customer_id:
        q = q.filter(Job.customer_id == customer_id)
    if date:
        from datetime import datetime, timedelta
        day = datetime.fromisoformat(date)
        q = q.filter(Job.scheduled_at >= day, Job.scheduled_at < day + timedelta(days=1))
    return q.order_by(Job.created_at.desc()).all()


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    job = _load_job(db, job_id, company_id=user.company_id)
    return job


@router.put("/{job_id}", response_model=JobOut)
def update_job(job_id: uuid.UUID, payload: JobUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == user.company_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(job, field, value)
    db.commit()
    return _load_job(db, job_id, company_id=user.company_id)


@router.patch("/{job_id}/status", response_model=JobOut)
def update_job_status(job_id: uuid.UUID, payload: JobStatusUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {sorted(VALID_STATUSES)}")
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == user.company_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    _record_status_change(db, job, payload.status, payload.changed_by or "admin", payload.notes)
    job.status = payload.status
    if payload.notes:
        job.notes = payload.notes
    db.commit()
    return _load_job(db, job_id, company_id=user.company_id)


@router.get("/{job_id}/history", response_model=list[JobStatusHistoryOut])
def get_job_history(job_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == user.company_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return db.query(JobStatusHistory).filter(
        JobStatusHistory.job_id == job_id
    ).order_by(JobStatusHistory.created_at).all()


# ── Technician-facing ──────────────────────────────────────────────────────

@router.post("/{job_id}/notes", response_model=JobOut)
def add_job_notes(
    job_id: uuid.UUID,
    payload: dict,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == user.company_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    notes = payload.get("notes", "")
    if job.notes:
        job.notes = job.notes + "\n" + notes
    else:
        job.notes = notes
    db.commit()
    return _load_job(db, job_id, company_id=user.company_id)


@router.post("/{job_id}/complete", response_model=JobOut)
def complete_job(
    job_id: uuid.UUID,
    payload: dict,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Technician marks job complete with completion notes."""
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == user.company_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status in ("completed", "invoiced", "paid", "cancelled"):
        raise HTTPException(status_code=400, detail=f"Job already in status: {job.status}")
    completion_notes = payload.get("notes", "")
    _record_status_change(db, job, "completed", "technician", completion_notes)
    job.status = "completed"
    if completion_notes:
        job.notes = (job.notes + "\n" + completion_notes) if job.notes else completion_notes
    db.commit()
    return _load_job(db, job_id, company_id=user.company_id)


# ── Dispatch board endpoint ────────────────────────────────────────────────

@router.get("/admin/dispatch", response_model=list[JobOut], tags=["admin"])
def dispatch_jobs(
    date: Optional[str] = Query(None, description="YYYY-MM-DD (defaults to today)"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """All jobs relevant to dispatch board for a given day."""
    from datetime import datetime, timedelta
    if date:
        day = datetime.fromisoformat(date)
    else:
        day = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    next_day = day + timedelta(days=1)

    q = db.query(Job).options(
        joinedload(Job.customer),
        joinedload(Job.technician),
        joinedload(Job.service),
        joinedload(Job.schedule),
    ).filter(
        Job.company_id == user.company_id,
        Job.status.notin_(["cancelled", "paid"]),
    )
    # Include: unscheduled (no scheduled_at) OR scheduled today
    from sqlalchemy import or_
    q = q.filter(
        or_(
            Job.scheduled_at.is_(None),
            (Job.scheduled_at >= day) & (Job.scheduled_at < next_day),
        )
    )
    return q.order_by(Job.scheduled_at.asc().nullslast(), Job.created_at.asc()).all()
