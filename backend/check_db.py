from app.db.session import engine
from sqlmodel import Session, select
from app.models.models import Payment, Booking, PaymentSchedule
import json

with Session(engine) as session:
    payments = session.exec(select(Payment)).all()
    print(f"Total payments: {len(payments)}")
    for p in payments:
        print(f"Payment ID: {p.id}, Amount: {p.amount_paid}, Booking ID: {p.booking_id}")
    
    bookings = session.exec(select(Booking)).all()
    print(f"\nTotal bookings: {len(bookings)}")
    for b in bookings:
        print(f"Booking ID: {b.id}, Total Cost: {b.total_cost}, Status: {b.status}")

    schedules = session.exec(select(PaymentSchedule)).all()
    print(f"\nTotal schedules: {len(schedules)}")
    for s in schedules:
        print(f"Schedule ID: {s.id}, Amount: {s.amount}, Is Paid: {s.is_paid}")
