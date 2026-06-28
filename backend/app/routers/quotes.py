from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user
from app.models import Quote, QuoteItem, JobPhoto, Job
from app.schemas import QuoteCreate, QuoteOut, QuoteStatusUpdate, JobPhotoCreate, JobPhotoOut

router = APIRouter(tags=["quotes"])


@router.post("/quotes", response_model=QuoteOut)
def create_quote(body: QuoteCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    job = db.query(Job).filter(Job.id == body.job_id, Job.company_id == user.company_id).first()
    if not job:
        raise HTTPException(404, "Job not found")

    subtotal = sum(float(i.quantity) * float(i.unit_price) for i in body.items)
    quote = Quote(
        company_id=user.company_id,
        job_id=body.job_id,
        technician_id=body.technician_id,
        notes=body.notes,
        subtotal=subtotal,
        total=subtotal,
        status="submitted",
        submitted_at=datetime.utcnow(),
    )
    db.add(quote)
    db.flush()

    for item in body.items:
        db.add(QuoteItem(
            quote_id=quote.id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total=float(item.quantity) * float(item.unit_price),
        ))

    db.commit()
    db.refresh(quote)
    return quote


@router.get("/quotes/job/{job_id}", response_model=list[QuoteOut])
def get_job_quotes(job_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(Quote).filter(
        Quote.job_id == job_id,
        Quote.company_id == user.company_id,
    ).order_by(Quote.created_at.desc()).all()


@router.get("/quotes/{quote_id}", response_model=QuoteOut)
def get_quote(quote_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    quote = db.query(Quote).filter(Quote.id == quote_id, Quote.company_id == user.company_id).first()
    if not quote:
        raise HTTPException(404, "Quote not found")
    return quote


@router.patch("/quotes/{quote_id}/status", response_model=QuoteOut)
def update_quote_status(quote_id: str, body: QuoteStatusUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(403, "Admin only")
    quote = db.query(Quote).filter(Quote.id == quote_id, Quote.company_id == user.company_id).first()
    if not quote:
        raise HTTPException(404, "Quote not found")
    if body.status not in ("approved", "rejected"):
        raise HTTPException(400, "Status must be approved or rejected")
    quote.status = body.status
    db.commit()
    db.refresh(quote)
    return quote


# ── Job Photos ──────────────────────────────────────────────────────────────

@router.post("/jobs/{job_id}/photos", response_model=JobPhotoOut)
def add_job_photo(job_id: str, body: JobPhotoCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == user.company_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    photo = JobPhoto(
        company_id=user.company_id,
        job_id=job_id,
        technician_id=body.technician_id,
        caption=body.caption,
        data=body.data,
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


@router.get("/jobs/{job_id}/photos", response_model=list[JobPhotoOut])
def get_job_photos(job_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(JobPhoto).filter(
        JobPhoto.job_id == job_id,
        JobPhoto.company_id == user.company_id,
    ).order_by(JobPhoto.created_at).all()
