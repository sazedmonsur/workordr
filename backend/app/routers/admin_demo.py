import os
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db, engine
from app.demo_seed import reset_and_seed
from app.models import Company, User
from app.auth import hash_password

router = APIRouter(prefix="/admin", tags=["admin"])

DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "")


@router.post("/quick-user")
def quick_user(payload: dict, db: Session = Depends(get_db)):
    """Emergency endpoint: create user for demo@workordr.com with workordr2024"""
    cid = str(db.query(Company).filter(Company.name=="WorkOrdr Demo").first().id) if db.query(Company).filter(Company.name=="WorkOrdr Demo").first() else str(__import__('uuid').uuid4())
    if not db.query(Company).filter(Company.name=="WorkOrdr Demo").first():
        db.add(Company(id=__import__('uuid').UUID(cid), name="WorkOrdr Demo"))
        db.commit()
    u = User(id=__import__('uuid').uuid4(), company_id=__import__('uuid').UUID(cid), email="demo@workordr.com", password_hash=hash_password("workordr2024"), role="admin", is_active=True)
    db.add(u)
    db.commit()
    return {"ok": True}

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


@router.post("/insert-demo-user-sql")
def insert_demo_user_sql(payload: dict, db: Session = Depends(get_db)):
    """Direct SQL insert - fallback when ORM fails. Protected by DEMO_PASSWORD env var."""
    if DEMO_PASSWORD and payload.get("key") != DEMO_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid key")

    try:
        company_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())
        password_hash = hash_password("workordr2024")

        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO companies (id, name, is_active)
                VALUES (:cid, 'WorkOrdr Demo', true)
                ON CONFLICT DO NOTHING
            """), {"cid": company_id})

            conn.execute(text("""
                INSERT INTO users (id, company_id, email, password_hash, role, is_active)
                VALUES (:uid, :cid, 'demo@workordr.com', :ph, 'admin', true)
                ON CONFLICT (email) DO UPDATE SET password_hash = :ph
            """), {"uid": user_id, "cid": company_id, "ph": password_hash})

            conn.commit()

        return {"message": "Demo user created via SQL", "email": "demo@workordr.com"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
