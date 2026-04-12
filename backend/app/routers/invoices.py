import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Invoice, InvoiceItem, Job, JobStatusHistory
from app.schemas import InvoiceCreate, InvoiceOut
from app.notifications.events import notify

router = APIRouter(prefix="/invoices", tags=["invoices"])


def _load_invoice(db: Session, invoice_id: uuid.UUID) -> Invoice:
    return db.query(Invoice).options(
        joinedload(Invoice.items),
        joinedload(Invoice.customer),
        joinedload(Invoice.job),
    ).filter(Invoice.id == invoice_id).first()


@router.post("", response_model=InvoiceOut, status_code=201)
def create_invoice(payload: InvoiceCreate, db: Session = Depends(get_db)):
    job = db.query(Job).options(
        joinedload(Job.customer)
    ).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status not in ("completed", "invoiced"):
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
        status="draft",
    )
    db.add(invoice)
    db.flush()

    for item in payload.items:
        db.add(InvoiceItem(
            invoice_id=invoice.id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total=round(item.quantity * item.unit_price, 2),
        ))

    # Advance job status
    if job.status == "completed":
        db.add(JobStatusHistory(
            job_id=job.id,
            old_status=job.status,
            new_status="invoiced",
            changed_by="system",
        ))
        job.status = "invoiced"

    db.commit()
    db.refresh(invoice)

    # Notify customer
    if job.customer:
        notify(
            db,
            event_type="invoice_generated",
            recipient_email=job.customer.email,
            recipient_phone=job.customer.phone,
            data={
                "customer_name": job.customer.name,
                "total": f"{total:.2f}",
                "invoice_id": str(invoice.id),
                "pay_url": f"/invoice/{invoice.id}/pay",
            },
        )

    return _load_invoice(db, invoice.id)


@router.get("", response_model=list[InvoiceOut])
def list_invoices(db: Session = Depends(get_db)):
    return db.query(Invoice).options(
        joinedload(Invoice.items),
        joinedload(Invoice.customer),
    ).order_by(Invoice.created_at.desc()).all()


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: uuid.UUID, db: Session = Depends(get_db)):
    invoice = _load_invoice(db, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice
