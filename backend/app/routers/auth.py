from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Company
from app.auth import verify_password, create_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(payload: dict, db: Session = Depends(get_db)):
    email = payload.get("email", "").lower().strip()
    password = payload.get("password", "")
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    company = db.query(Company).filter(Company.id == user.company_id).first() if user.company_id else None
    token = create_token(
        str(user.id),
        str(user.company_id) if user.company_id else None,
        user.role,
        str(user.technician_id) if user.technician_id else None,
    )
    return {
        "token": token,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "role": user.role,
            "company_id": str(user.company_id) if user.company_id else None,
            "technician_id": str(user.technician_id) if user.technician_id else None,
            "company_name": company.name if company else "WorkOrdr",
        }
    }


@router.get("/me")
def me(user=Depends(get_current_user), db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == user.company_id).first() if user.company_id else None
    return {
        "id": str(user.id),
        "email": user.email,
        "role": user.role,
        "company_id": str(user.company_id) if user.company_id else None,
        "technician_id": str(user.technician_id) if user.technician_id else None,
        "company_name": company.name if company else "WorkOrdr",
    }
