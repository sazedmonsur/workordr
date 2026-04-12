"""
Technician availability:
  GET  /availability/search          — available slots for a date range (customer-facing)
  GET  /availability/{tech_id}       — all blocked slots for a technician (admin)
  POST /availability/{tech_id}       — add a blocked/time_off slot
  DELETE /availability/{slot_id}     — remove a slot
  PUT  /technician/availability      — technician self-manages their blocks
"""
import uuid
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Technician, AvailabilitySlot, Schedule
from app.schemas import AvailabilitySlotCreate, AvailabilitySlotOut, AvailableSlot

router = APIRouter(tags=["availability"])


def _parse_time(hhmm: str) -> tuple[int, int]:
    h, m = hhmm.split(":")
    return int(h), int(m)


def _get_available_slots(
    db: Session,
    date: datetime,
    service_duration_minutes: int = 60,
) -> list[AvailableSlot]:
    """
    Compute available time slots for all active technicians on a given date.
    Slot granularity = service_duration_minutes.
    """
    day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)

    technicians = db.query(Technician).filter(Technician.status == "active").all()
    results: list[AvailableSlot] = []

    for tech in technicians:
        wh_start_h, wh_start_m = _parse_time(tech.working_hours_start)
        wh_end_h, wh_end_m = _parse_time(tech.working_hours_end)

        work_start = day_start.replace(hour=wh_start_h, minute=wh_start_m)
        work_end = day_start.replace(hour=wh_end_h, minute=wh_end_m)

        # Collect all booked/blocked intervals
        blocked: list[tuple[datetime, datetime]] = []

        # Existing schedule blocks
        schedules = db.query(Schedule).filter(
            Schedule.technician_id == tech.id,
            Schedule.scheduled_start >= day_start,
            Schedule.scheduled_start < day_end,
        ).all()
        for s in schedules:
            blocked.append((s.scheduled_start, s.scheduled_end))

        # Manual availability blocks
        slots = db.query(AvailabilitySlot).filter(
            AvailabilitySlot.technician_id == tech.id,
            AvailabilitySlot.start_time < day_end,
            AvailabilitySlot.end_time > day_start,
        ).all()
        for sl in slots:
            blocked.append((sl.start_time, sl.end_time))

        # Walk through working hours in increments of service_duration_minutes
        cursor = work_start
        step = timedelta(minutes=service_duration_minutes)
        while cursor + step <= work_end:
            slot_end = cursor + step
            overlap = any(
                not (slot_end <= b_start or cursor >= b_end)
                for b_start, b_end in blocked
            )
            if not overlap:
                results.append(AvailableSlot(
                    start=cursor,
                    end=slot_end,
                    technician_id=tech.id,
                    technician_name=tech.name,
                ))
            cursor += step

    results.sort(key=lambda s: (s.start, s.technician_name))
    return results


@router.get("/availability/search", response_model=list[AvailableSlot])
def search_availability(
    date: str = Query(..., description="ISO date YYYY-MM-DD"),
    duration: int = Query(60, description="Service duration in minutes"),
    db: Session = Depends(get_db),
):
    try:
        day = datetime.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    return _get_available_slots(db, day, duration)


@router.get("/availability/{tech_id}", response_model=list[AvailabilitySlotOut])
def get_tech_availability(tech_id: uuid.UUID, db: Session = Depends(get_db)):
    tech = db.query(Technician).filter(Technician.id == tech_id).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician not found")
    return db.query(AvailabilitySlot).filter(
        AvailabilitySlot.technician_id == tech_id
    ).order_by(AvailabilitySlot.start_time).all()


@router.post("/availability/{tech_id}", response_model=AvailabilitySlotOut, status_code=201)
def add_availability_block(
    tech_id: uuid.UUID, payload: AvailabilitySlotCreate, db: Session = Depends(get_db)
):
    tech = db.query(Technician).filter(Technician.id == tech_id).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician not found")
    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=400, detail="end_time must be after start_time")
    slot = AvailabilitySlot(technician_id=tech_id, **payload.model_dump())
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


@router.delete("/availability/slot/{slot_id}", status_code=200)
def delete_availability_block(slot_id: uuid.UUID, db: Session = Depends(get_db)):
    slot = db.query(AvailabilitySlot).filter(AvailabilitySlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    db.delete(slot)
    db.commit()
    return {"detail": "Deleted"}
