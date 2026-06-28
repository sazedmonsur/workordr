from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.database import get_db
from app.models import Job, Invoice, Technician, Schedule
from app.schemas import AnalyticsOverview
from app.auth import get_current_user

router = APIRouter(prefix="/admin/analytics", tags=["analytics"])


@router.get("/overview", response_model=AnalyticsOverview)
def analytics_overview(db: Session = Depends(get_db), user=Depends(get_current_user)):
    cid = user.company_id
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())

    # Jobs today / this week (scoped to company)
    jobs_today = db.query(func.count(Job.id)).filter(
        Job.company_id == cid, Job.created_at >= today_start
    ).scalar() or 0
    jobs_this_week = db.query(func.count(Job.id)).filter(
        Job.company_id == cid, Job.created_at >= week_start
    ).scalar() or 0

    # Revenue today / this week (paid invoices only, scoped via job)
    rev_today = db.query(func.sum(Invoice.total)).join(Job, Invoice.job_id == Job.id).filter(
        Job.company_id == cid, Invoice.status == "paid", Invoice.updated_at >= today_start
    ).scalar() or 0.0

    rev_week = db.query(func.sum(Invoice.total)).join(Job, Invoice.job_id == Job.id).filter(
        Job.company_id == cid, Invoice.status == "paid", Invoice.updated_at >= week_start
    ).scalar() or 0.0

    # Jobs by status (scoped to company)
    status_rows = db.query(Job.status, func.count(Job.id)).filter(
        Job.company_id == cid
    ).group_by(Job.status).all()
    jobs_by_status = {row[0]: row[1] for row in status_rows}

    # Invoices (scoped via job)
    paid_invoices = db.query(func.count(Invoice.id)).join(Job, Invoice.job_id == Job.id).filter(
        Job.company_id == cid, Invoice.status == "paid"
    ).scalar() or 0
    unpaid_invoices = db.query(func.count(Invoice.id)).join(Job, Invoice.job_id == Job.id).filter(
        Job.company_id == cid, Invoice.status != "paid"
    ).scalar() or 0

    # Technician workload (scoped to company)
    technicians = db.query(Technician).filter(
        Technician.company_id == cid, Technician.status == "active"
    ).all()
    tech_workload = []
    for tech in technicians:
        active_jobs = db.query(func.count(Job.id)).filter(
            Job.company_id == cid,
            Job.technician_id == tech.id,
            Job.status.in_(["assigned", "scheduled", "en_route", "in_progress"]),
        ).scalar() or 0
        completed_week = db.query(func.count(Job.id)).filter(
            Job.company_id == cid,
            Job.technician_id == tech.id,
            Job.status == "completed",
            Job.updated_at >= week_start,
        ).scalar() or 0
        tech_workload.append({
            "technician_id": str(tech.id),
            "name": tech.name,
            "active_jobs": active_jobs,
            "completed_this_week": completed_week,
        })

    return AnalyticsOverview(
        jobs_today=jobs_today,
        jobs_this_week=jobs_this_week,
        revenue_today=float(rev_today),
        revenue_this_week=float(rev_week),
        jobs_by_status=jobs_by_status,
        paid_invoices=paid_invoices,
        unpaid_invoices=unpaid_invoices,
        technician_workload=tech_workload,
    )
