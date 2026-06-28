from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.database import get_db
from app.models import Job, Invoice
from app.schemas import DashboardStats
from app.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    cid = user.company_id

    total_jobs = db.query(func.count(Job.id)).filter(Job.company_id == cid).scalar()
    completed_jobs = db.query(func.count(Job.id)).filter(Job.company_id == cid, Job.status == "completed").scalar()
    pending_jobs = db.query(func.count(Job.id)).filter(Job.company_id == cid, Job.status == "pending").scalar()
    in_progress_jobs = db.query(func.count(Job.id)).filter(Job.company_id == cid, Job.status == "in_progress").scalar()

    # Invoice stats filtered via join to jobs
    paid_invoices = db.query(func.count(Invoice.id)).join(Job, Invoice.job_id == Job.id).filter(
        Job.company_id == cid, Invoice.status == "paid"
    ).scalar()
    unpaid_invoices = db.query(func.count(Invoice.id)).join(Job, Invoice.job_id == Job.id).filter(
        Job.company_id == cid, Invoice.status != "paid"
    ).scalar()

    total_revenue_result = db.query(func.sum(Invoice.total)).join(Job, Invoice.job_id == Job.id).filter(
        Job.company_id == cid, Invoice.status == "paid"
    ).scalar()
    total_revenue = float(total_revenue_result or 0)

    recent_jobs = db.query(Job).options(
        joinedload(Job.customer),
        joinedload(Job.technician)
    ).filter(Job.company_id == cid).order_by(Job.created_at.desc()).limit(5).all()

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
