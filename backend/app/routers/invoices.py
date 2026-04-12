import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Invoice, InvoiceItem, Job
from app.schemas import InvoiceCreate, InvoiceOut

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.post("", response_model=InvoiceOut, status_code=201)
def create_invoice(payload: InvoiceCreate, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Can only invoice completed jobs")

    existing = db.query(Invoice).filter(Invoice.job_id == payload.job_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Invoice already exists for this job")

    if not payload.items:
        raise HTTPException(status_code=400, detail="Invoice must have at least one line item")

    subtotal = sum(item.quantity * item.unit_price for item in payload.items)
    tax = round(payload.tax, 2)
    total = round(subtotal + tax, 2)

    invoice = Invoice(
        job_id=payload.job_id,
        customer_id=job.customer_id,
        subtotal=round(subtotal, 2),
        tax=tax,
        total=total,
        status="draft"
    )
    db.add(invoice)
    db.flush()

    for item in payload.items:
        db.add(InvoiceItem(
            invoice_id=invoice.id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total=round(item.quantity * item.unit_price, 2)
        ))

    db.commit()
    db.refresh(invoice)
    return db.query(Invoice).options(
        joinedload(Invoice.items),
        joinedload(Invoice.customer)
    ).filter(Invoice.id == invoice.id).first()


@router.get("", response_model=list[InvoiceOut])
def list_invoices(db: Session = Depends(get_db)):
    return db.query(Invoice).options(
        joinedload(Invoice.items),
        joinedload(Invoice.customer)
    ).order_by(Invoice.created_at.desc()).all()


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: uuid.UUID, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).options(
        joinedload(Invoice.items),
        joinedload(Invoice.customer),
        joinedload(Invoice.job)
    ).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice
