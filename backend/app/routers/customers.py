import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Customer
from app.schemas import CustomerCreate, CustomerOut
from app.auth import get_current_user

router = APIRouter(prefix="/customers", tags=["customers"])


@router.post("", response_model=CustomerOut, status_code=201)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    customer = Customer(**payload.model_dump(), company_id=user.company_id)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("", response_model=list[CustomerOut])
def list_customers(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(Customer).filter(Customer.company_id == user.company_id).order_by(Customer.created_at.desc()).all()


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    customer = db.query(Customer).filter(Customer.id == customer_id, Customer.company_id == user.company_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer
