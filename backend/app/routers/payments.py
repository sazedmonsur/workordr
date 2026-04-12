import os
import uuid
import stripe
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Invoice, Job, JobStatusHistory
from app.schemas import PaymentIntentCreate, PaymentIntentOut, PaymentConfirm
from app.notifications.events import notify
from dotenv import load_dotenv

load_dotenv()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/create-intent", response_model=PaymentIntentOut)
def create_payment_intent(payload: PaymentIntentCreate, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == payload.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status == "paid":
        raise HTTPException(status_code=400, detail="Invoice already paid")

    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured. Add STRIPE_SECRET_KEY to .env")

    try:
        intent = stripe.PaymentIntent.create(
            amount=int(float(invoice.total) * 100),
            currency="usd",
            metadata={"invoice_id": str(invoice.id)},
        )
        invoice.stripe_payment_intent_id = intent.id
        db.commit()
        return PaymentIntentOut(client_secret=intent.client_secret, payment_intent_id=intent.id)
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/confirm")
def confirm_payment(payload: PaymentConfirm, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).options(
        joinedload(Invoice.customer),
        joinedload(Invoice.job),
    ).filter(Invoice.id == payload.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status == "paid":
        return {"message": "Invoice already marked as paid"}

    if stripe.api_key:
        try:
            intent = stripe.PaymentIntent.retrieve(payload.payment_intent_id)
            if intent.status != "succeeded":
                raise HTTPException(status_code=400, detail=f"Payment not succeeded: {intent.status}")
        except stripe.StripeError as e:
            raise HTTPException(status_code=400, detail=str(e))

    invoice.status = "paid"
    invoice.stripe_payment_intent_id = payload.payment_intent_id

    # Advance job status to paid
    if invoice.job and invoice.job.status == "invoiced":
        db.add(JobStatusHistory(
            job_id=invoice.job.id,
            old_status="invoiced",
            new_status="paid",
            changed_by="system",
        ))
        invoice.job.status = "paid"

    db.commit()

    # Notify customer
    if invoice.customer:
        notify(
            db,
            event_type="payment_received",
            recipient_email=invoice.customer.email,
            recipient_phone=invoice.customer.phone,
            data={
                "customer_name": invoice.customer.name,
                "amount": f"{float(invoice.total):.2f}",
            },
        )

    return {"message": "Payment confirmed", "invoice_id": str(invoice.id)}
