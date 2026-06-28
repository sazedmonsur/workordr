import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Invoice, InvoiceItem, Job, JobStatusHistory
from app.schemas import InvoiceCreate, InvoiceOut
from app.notifications.events import notify
from app.auth import get_current_user

router = APIRouter(prefix="/invoices", tags=["invoices"])


def _load_invoice(db: Session, invoice_id: uuid.UUID) -> Invoice:
    return db.query(Invoice).options(
        joinedload(Invoice.items),
        joinedload(Invoice.customer),
        joinedload(Invoice.job),
    ).filter(Invoice.id == invoice_id).first()


@router.post("", response_model=InvoiceOut, status_code=201)
def create_invoice(payload: InvoiceCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    job = db.query(Job).options(
        joinedload(Job.customer)
    ).filter(Job.id == payload.job_id, Job.company_id == user.company_id).first()
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
def list_invoices(db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Filter by company via the job's company_id
    return db.query(Invoice).options(
        joinedload(Invoice.items),
        joinedload(Invoice.customer),
        joinedload(Invoice.job),
    ).join(Job, Invoice.job_id == Job.id).filter(
        Job.company_id == user.company_id
    ).order_by(Invoice.created_at.desc()).all()


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: uuid.UUID, db: Session = Depends(get_db)):
    """Public endpoint — used by customer payment link pages."""
    invoice = _load_invoice(db, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.patch("/{invoice_id}/mark-paid", response_model=InvoiceOut)
def mark_invoice_paid(invoice_id: uuid.UUID, payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Mark an invoice as paid via cash, e-transfer, or other offline method."""
    invoice = db.query(Invoice).options(joinedload(Invoice.job)).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    # Verify the invoice's job belongs to the user's company
    if invoice.job and invoice.job.company_id != user.company_id:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status == "paid":
        raise HTTPException(status_code=400, detail="Invoice already paid")
    invoice.status = "paid"
    if invoice.job and invoice.job.status != "paid":
        db.add(JobStatusHistory(
            job_id=invoice.job.id,
            old_status=invoice.job.status,
            new_status="paid",
            changed_by="admin",
            notes=payload.get("method", "offline payment"),
        ))
        invoice.job.status = "paid"
    db.commit()
    return _load_invoice(db, invoice_id)
