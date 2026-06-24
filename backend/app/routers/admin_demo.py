import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.demo_seed import reset_and_seed

router = APIRouter(prefix="/admin", tags=["admin"])

DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "")


@router.post("/reset-demo")
def reset_demo(payload: dict, db: Session = Depends(get_db)):
    """Wipe all data and re-seed with demo data. Protected by DEMO_PASSWORD env var."""
    if DEMO_PASSWORD and payload.get("key") != DEMO_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid key")
    counts = reset_and_seed(db)
    return {"message": "Demo data reset successfully", "seeded": counts}
