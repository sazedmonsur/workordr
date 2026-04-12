from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.database import get_db
from app.models import Job, Invoice
from app.schemas import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_jobs = db.query(func.count(Job.id)).scalar()
    completed_jobs = db.query(func.count(Job.id)).filter(Job.status == "completed").scalar()
    pending_jobs = db.query(func.count(Job.id)).filter(Job.status == "pending").scalar()
    in_progress_jobs = db.query(func.count(Job.id)).filter(Job.status == "in_progress").scalar()

    paid_invoices = db.query(func.count(Invoice.id)).filter(Invoice.status == "paid").scalar()
    unpaid_invoices = db.query(func.count(Invoice.id)).filter(Invoice.status != "paid").scalar()

    total_revenue_result = db.query(func.sum(Invoice.total)).filter(Invoice.status == "paid").scalar()
    total_revenue = float(total_revenue_result or 0)

    recent_jobs = db.query(Job).options(
        joinedload(Job.customer),
        joinedload(Job.technician)
    ).order_by(Job.created_at.desc()).limit(5).all()

    return DashboardStats(
        total_jobs=total_jobs,
        completed_jobs=completed_jobs,
        pending_jobs=pending_jobs,
        in_progress_jobs=in_progress_jobs,
        total_revenue=total_revenue,
        paid_invoices=paid_invoices,
        unpaid_invoices=unpaid_invoices,
        recent_jobs=recent_jobs,
    )
