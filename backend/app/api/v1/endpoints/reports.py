from typing import Any
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.api import deps
from app.models.models import User, UserRole
from app.services import reports

router = APIRouter()

@router.get("/summary")
def get_summary_report(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.check_access_reports), # Only Admin/Managers with access
) -> Any:
    """
    Get executive summary report.
    """
    return reports.get_sales_summary(db)

@router.get("/project-performance")
def get_project_performance(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.check_access_reports),
) -> Any:
    # Need to join Project -> Tower -> Floor -> Unit -> Booking
    from app.models.models import Project, Tower, Floor, Unit, Booking, BookingStatus
    from sqlalchemy.orm import selectinload
    from sqlalchemy import func
    
    projects = db.exec(select(Project).options(
        selectinload(Project.towers).selectinload(Tower.floors).selectinload(Floor.units).selectinload(Unit.bookings)
    )).all()
    
    performance = []
    for p in projects:
        total_revenue = 0
        total_sold = 0
        for t in p.towers:
            for f in t.floors:
                for u in f.units:
                    for b in u.bookings:
                        if b.status in [BookingStatus.ADMIN_CONFIRMED, BookingStatus.ACCOUNTS_VERIFIED]:
                            total_revenue += b.total_cost
                            total_sold += 1
        
        performance.append({
            "project_id": p.id,
            "project_name": p.name,
            "units_sold": total_sold,
            "total_revenue": total_revenue
        })
        
    # Sort by revenue descending
    performance.sort(key=lambda x: x["total_revenue"], reverse=True)
    return performance

@router.get("/test-db")
def test_db_activity(db: Session = Depends(deps.get_db)):
    from app.models.models import Activity
    act = db.exec(select(Activity).limit(1)).first()
    return {"status": "ok", "activity_found": act.id if act else None}

@router.get("/employee-performance")
def get_employee_performance(
    days: int = 90,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.check_access_reports),
) -> Any:
    from app.models.models import User, Lead, Booking, BookingStatus, Activity, ActivityType
    from sqlalchemy.orm import selectinload
    from datetime import datetime, timedelta
    
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    # We want to see all users with roles that manage leads
    employees = db.exec(select(User).where(User.role.in_([UserRole.SALES_AGENT, UserRole.SALES_MANAGER, UserRole.TELECALLER])).options(
        selectinload(User.assigned_leads),
        selectinload(User.created_bookings),
        selectinload(User.activities)
    )).all()
    
    perf = []
    for e in employees:
        # Filter leads by recent activity or assignment
        recent_leads = [l for l in e.assigned_leads if l.created_at >= cutoff]
        
        # Bookings in range
        confirmed_bookings = [b for b in e.created_bookings if b.status in [BookingStatus.ADMIN_CONFIRMED, BookingStatus.ACCOUNTS_VERIFIED] and b.created_at >= cutoff]
        revenue = sum(b.total_cost for b in confirmed_bookings)
        
        # Activities (Visits/Meetings)
        # Type 2 = Meeting, 3 = Site Visit
        visits = [a for a in e.activities if a.activity_type_id in [2, 3] and a.created_at >= cutoff]
        
        perf.append({
            "employee_id": e.id,
            "employee_name": e.full_name,
            "role": e.role,
            "leads_managed": len(e.assigned_leads), # Total managed
            "new_leads_period": len(recent_leads), # Managed in last 90 days
            "visits_scheduled": len(visits),
            "bookings_closed": len(confirmed_bookings),
            "revenue": revenue,
            "conversion_rate": round((len(confirmed_bookings) / len(e.assigned_leads) * 100), 2) if len(e.assigned_leads) > 0 else 0
        })
        
    perf.sort(key=lambda x: x["revenue"], reverse=True)
    return perf
