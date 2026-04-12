from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models import NotificationLog
from app.schemas import NotificationLogOut

router = APIRouter(prefix="/admin/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationLogOut])
def list_notifications(
    status: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(NotificationLog)
    if status:
        q = q.filter(NotificationLog.status == status)
    if event_type:
        q = q.filter(NotificationLog.event_type == event_type)
    return q.order_by(NotificationLog.created_at.desc()).limit(limit).all()
