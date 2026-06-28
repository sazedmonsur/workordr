import os
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.demo_seed import reset_and_seed
from app.models import Company, User
from app.auth import hash_password

router = APIRouter(prefix="/admin", tags=["admin"])

DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "")


@router.post("/reset-demo")
def reset_demo(payload: dict, db: Session = Depends(get_db)):
    """Wipe demo company data and re-seed with demo data. Protected by DEMO_PASSWORD env var."""
    if DEMO_PASSWORD and payload.get("key") != DEMO_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid key")
    # Look up (or create) the demo company
    demo_company = db.query(Company).filter(Company.name == "WorkOrdr Demo").first()
    if not demo_company:
        demo_company = Company(name="WorkOrdr Demo")
        db.add(demo_company)
        db.commit()
        db.refresh(demo_company)
    company_id = demo_company.id
    counts = reset_and_seed(db, company_id=company_id)
    return {"message": "Demo data reset successfully", "seeded": counts}


@router.post("/create-demo-user")
def create_demo_user(payload: dict, db: Session = Depends(get_db)):
    """Create demo@workordr.com admin user. Protected by DEMO_PASSWORD env var."""
    if DEMO_PASSWORD and payload.get("key") != DEMO_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid key")

    # Get or create demo company
    demo_company = db.query(Company).filter(Company.name == "WorkOrdr Demo").first()
    if not demo_company:
        demo_company = Company(name="WorkOrdr Demo")
        db.add(demo_company)
        db.flush()

    # Check if user exists
    existing = db.query(User).filter(User.email == "demo@workordr.com").first()
    if existing:
        return {"message": "User already exists", "email": "demo@workordr.com"}

    # Create user
    user = User(
        id=uuid.uuid4(),
        company_id=demo_company.id,
        email="demo@workordr.com",
        password_hash=hash_password("workordr2024"),
        role="admin",
        is_active=True,
    )
    db.add(user)
    db.commit()

    return {"message": "Demo user created", "email": "demo@workordr.com"}
