import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Technician
from app.schemas import TechnicianCreate, TechnicianOut

router = APIRouter(prefix="/technicians", tags=["technicians"])


@router.post("", response_model=TechnicianOut, status_code=201)
def create_technician(payload: TechnicianCreate, db: Session = Depends(get_db)):
    existing = db.query(Technician).filter(Technician.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    tech = Technician(**payload.model_dump())
    db.add(tech)
    db.commit()
    db.refresh(tech)
    return tech


@router.get("", response_model=list[TechnicianOut])
def list_technicians(db: Session = Depends(get_db)):
    return db.query(Technician).filter(Technician.status == "active").order_by(Technician.name).all()


@router.get("/{tech_id}", response_model=TechnicianOut)
def get_technician(tech_id: uuid.UUID, db: Session = Depends(get_db)):
    tech = db.query(Technician).filter(Technician.id == tech_id).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician not found")
    return tech
