import os
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Company, User, Customer, Technician, Job
from app.auth import hash_password
from sqlalchemy import func

router = APIRouter(prefix="/superadmin", tags=["superadmin"])
SUPERADMIN_KEY = os.getenv("SUPERADMIN_KEY", "")


def require_superadmin(x_superadmin_key: str | None = Header(default=None)):
    if not SUPERADMIN_KEY or x_superadmin_key != SUPERADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid superadmin key")


@router.post("/create-company")
def create_company(payload: dict, db: Session = Depends(get_db), _=Depends(require_superadmin)):
    company_name = payload.get("company_name", "").strip()
    admin_email = payload.get("admin_email", "").lower().strip()
    admin_password = payload.get("admin_password", "")
    if not all([company_name, admin_email, admin_password]):
        raise HTTPException(status_code=400, detail="company_name, admin_email, admin_password all required")
    if db.query(User).filter(User.email == admin_email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    company = Company(name=company_name)
    db.add(company)
    db.flush()
    user = User(
        company_id=company.id,
        email=admin_email,
        password_hash=hash_password(admin_password),
        role="admin",
    )
    db.add(user)
    db.commit()
    return {
        "company_id": str(company.id),
        "company_name": company_name,
        "admin_email": admin_email,
        "message": f"Company '{company_name}' created successfully",
    }


@router.get("/companies")
def list_companies(db: Session = Depends(get_db), _=Depends(require_superadmin)):
    companies = db.query(Company).order_by(Company.created_at.desc()).all()
    result = []
    for c in companies:
        job_count = db.query(func.count(Job.id)).filter(Job.company_id == c.id).scalar()
        customer_count = db.query(func.count(Customer.id)).filter(Customer.company_id == c.id).scalar()
        tech_count = db.query(func.count(Technician.id)).filter(Technician.company_id == c.id).scalar()
        admin = db.query(User).filter(User.company_id == c.id, User.role == "admin").first()
        result.append({
            "id": str(c.id),
            "name": c.name,
            "is_active": c.is_active,
            "created_at": c.created_at,
            "admin_email": admin.email if admin else None,
            "jobs": job_count,
            "customers": customer_count,
            "technicians": tech_count,
        })
    return result


@router.patch("/companies/{company_id}/toggle")
def toggle_company(company_id: str, db: Session = Depends(get_db), _=Depends(require_superadmin)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    company.is_active = not company.is_active
    db.query(User).filter(User.company_id == company.id).update({"is_active": company.is_active})
    db.commit()
    return {"id": str(company.id), "name": company.name, "is_active": company.is_active}
