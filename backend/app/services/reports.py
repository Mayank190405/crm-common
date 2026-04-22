from typing import Any, Dict
from sqlmodel import Session, select, func
from app.models.models import Lead, Booking, Unit, UnitStatus

def get_sales_summary(db: Session) -> Dict[str, Any]:
    """
    Generate a high-level sales and inventory summary.
    """
    total_leads = db.exec(select(func.count(Lead.id))).one()
    total_booked = db.exec(select(func.count(Booking.id))).one()
    
    # Inventory status distribution
    available_units = db.exec(select(func.count(Unit.id)).where(Unit.status == UnitStatus.AVAILABLE)).one()
    sold_units = db.exec(select(func.count(Unit.id)).where(Unit.status == UnitStatus.SOLD)).one()
    blocked_units = db.exec(select(func.count(Unit.id)).where(Unit.status == UnitStatus.BLOCKED)).one()

    return {
        "leads": {
            "total": total_leads,
        },
        "bookings": {
            "total_confirmed": total_booked,
        },
        "inventory": {
            "available": available_units,
            "sold": sold_units,
            "blocked": blocked_units,
        }
    }
