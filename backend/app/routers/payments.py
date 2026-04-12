import os
import stripe
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Invoice
from app.schemas import PaymentIntentCreate, PaymentIntentOut, PaymentConfirm
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

    if not stripe.api_key or stripe.api_key == "":
        raise HTTPException(status_code=500, detail="Stripe not configured. Add STRIPE_SECRET_KEY to .env")

    try:
        intent = stripe.PaymentIntent.create(
            amount=int(float(invoice.total) * 100),  # cents
            currency="usd",
            metadata={"invoice_id": str(invoice.id)},
        )
        invoice.stripe_payment_intent_id = intent.id
        db.commit()
        return PaymentIntentOut(
            client_secret=intent.client_secret,
            payment_intent_id=intent.id
        )
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/confirm")
def confirm_payment(payload: PaymentConfirm, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == payload.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status == "paid":
        return {"message": "Invoice already marked as paid"}

    if stripe.api_key and stripe.api_key != "":
        try:
            intent = stripe.PaymentIntent.retrieve(payload.payment_intent_id)
            if intent.status != "succeeded":
                raise HTTPException(status_code=400, detail=f"Payment not succeeded: {intent.status}")
        except stripe.StripeError as e:
            raise HTTPException(status_code=400, detail=str(e))

    invoice.status = "paid"
    invoice.stripe_payment_intent_id = payload.payment_intent_id
    db.commit()
    return {"message": "Payment confirmed", "invoice_id": str(invoice.id)}
