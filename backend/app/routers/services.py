import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Service, TechnicianService, Technician
from app.schemas import ServiceCreate, ServiceUpdate, ServiceOut
from app.auth import get_current_user

router = APIRouter(prefix="/services", tags=["services"])


@router.get("", response_model=list[ServiceOut])
def list_services(active_only: bool = True, db: Session = Depends(get_db), user=Depends(get_current_user)):
    q = db.query(Service).filter(Service.company_id == user.company_id)
    if active_only:
        q = q.filter(Service.is_active == True)
    return q.order_by(Service.category, Service.name).all()


@router.post("", response_model=ServiceOut, status_code=201)
def create_service(payload: ServiceCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    svc = Service(**payload.model_dump(), company_id=user.company_id)
    db.add(svc)
    db.commit()
    db.refresh(svc)
    return svc


@router.get("/{service_id}", response_model=ServiceOut)
def get_service(service_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    svc = db.query(Service).filter(Service.id == service_id, Service.company_id == user.company_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    return svc


@router.put("/{service_id}", response_model=ServiceOut)
def update_service(service_id: uuid.UUID, payload: ServiceUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    svc = db.query(Service).filter(Service.id == service_id, Service.company_id == user.company_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(svc, field, value)
    db.commit()
    db.refresh(svc)
    return svc


@router.post("/{service_id}/technicians/{tech_id}", status_code=201)
def assign_service_to_technician(service_id: uuid.UUID, tech_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    svc = db.query(Service).filter(Service.id == service_id, Service.company_id == user.company_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    tech = db.query(Technician).filter(Technician.id == tech_id, Technician.company_id == user.company_id).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician not found")
    existing = db.query(TechnicianService).filter(
        TechnicianService.technician_id == tech_id, TechnicianService.service_id == service_id
    ).first()
    if existing:
        return {"detail": "Already assigned"}
    db.add(TechnicianService(technician_id=tech_id, service_id=service_id))
    db.commit()
    return {"detail": "Assigned"}


@router.delete("/{service_id}/technicians/{tech_id}", status_code=200)
def remove_service_from_technician(service_id: uuid.UUID, tech_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    ts = db.query(TechnicianService).filter(
        TechnicianService.technician_id == tech_id, TechnicianService.service_id == service_id
    ).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(ts)
    db.commit()
    return {"detail": "Removed"}
