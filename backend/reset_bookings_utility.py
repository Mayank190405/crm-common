import os
import sys
from sqlmodel import SQLModel, Session, select, delete
from app.db.session import engine
from app.models.models import Unit, Booking, UnitStatus, CoApplicant, BookingStatus, BookingCostItem, PaymentSchedule, Payment, BookingStatusHistory

def reset_bookings():
    print("Resetting all bookings and units...")
    with Session(engine) as session:
        # 1. Clear all linked booking data in correct dependency order
        print("Clearing payments and schedules...")
        session.exec(delete(Payment))
        session.exec(delete(PaymentSchedule))
        print("Clearing cost items and applicants...")
        session.exec(delete(BookingCostItem))
        session.exec(delete(CoApplicant))
        session.exec(delete(BookingStatusHistory))
        
        # 2. Delete all bookings
        bookings = session.exec(select(Booking)).all()
        print(f"Deleting {len(bookings)} bookings...")
        for b in bookings:
            session.delete(b)
        
        # 3. Reset all Units to AVAILABLE
        units = session.exec(select(Unit)).all()
        print(f"Resetting {len(units)} units to AVAILABLE status...")
        for u in units:
            u.status = UnitStatus.AVAILABLE
            u.blocked_until = None
        
        session.commit()
    print("SUCCESS: Full database reset complete. All units are now AVAILABLE.")

if __name__ == "__main__":
    reset_bookings()
