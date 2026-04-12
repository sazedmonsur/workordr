import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Technician, TechnicianService, Service
from app.schemas import TechnicianCreate, TechnicianUpdate, TechnicianOut

router = APIRouter(prefix="/technicians", tags=["technicians"])


def _load_tech(db: Session, tech_id: uuid.UUID) -> Technician:
    tech = db.query(Technician).options(
        joinedload(Technician.technician_services).joinedload(TechnicianService.service)
    ).filter(Technician.id == tech_id).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician not found")
    return tech


@router.post("", response_model=TechnicianOut, status_code=201)
def create_technician(payload: TechnicianCreate, db: Session = Depends(get_db)):
    existing = db.query(Technician).filter(Technician.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    tech = Technician(**payload.model_dump())
    db.add(tech)
    db.commit()
    db.refresh(tech)
    return _load_tech(db, tech.id)


@router.get("", response_model=list[TechnicianOut])
def list_technicians(include_inactive: bool = False, db: Session = Depends(get_db)):
    q = db.query(Technician).options(
        joinedload(Technician.technician_services).joinedload(TechnicianService.service)
    )
    if not include_inactive:
        q = q.filter(Technician.status == "active")
    return q.order_by(Technician.name).all()


@router.get("/{tech_id}", response_model=TechnicianOut)
def get_technician(tech_id: uuid.UUID, db: Session = Depends(get_db)):
    return _load_tech(db, tech_id)


@router.put("/{tech_id}", response_model=TechnicianOut)
def update_technician(tech_id: uuid.UUID, payload: TechnicianUpdate, db: Session = Depends(get_db)):
    tech = db.query(Technician).filter(Technician.id == tech_id).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(tech, field, value)
    db.commit()
    return _load_tech(db, tech_id)


@router.post("/{tech_id}/services/{service_id}", status_code=201)
def assign_service(tech_id: uuid.UUID, service_id: uuid.UUID, db: Session = Depends(get_db)):
    tech = db.query(Technician).filter(Technician.id == tech_id).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician not found")
    svc = db.query(Service).filter(Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    exists = db.query(TechnicianService).filter(
        TechnicianService.technician_id == tech_id,
        TechnicianService.service_id == service_id,
    ).first()
    if exists:
        return {"detail": "Already assigned"}
    db.add(TechnicianService(technician_id=tech_id, service_id=service_id))
    db.commit()
    return {"detail": "Service assigned"}


@router.delete("/{tech_id}/services/{service_id}", status_code=200)
def remove_service(tech_id: uuid.UUID, service_id: uuid.UUID, db: Session = Depends(get_db)):
    ts = db.query(TechnicianService).filter(
        TechnicianService.technician_id == tech_id,
        TechnicianService.service_id == service_id,
    ).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(ts)
    db.commit()
    return {"detail": "Removed"}
