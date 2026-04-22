import os
from sqlmodel import Session, select
from app.api.deps import engine
from app.models.models import Booking, Unit, BookingStatus, UnitStatus

with Session(engine) as db:
    bookings = db.exec(select(Booking).where(Booking.status == BookingStatus.ADMIN_CONFIRMED)).all()
    for b in bookings:
        unit = db.get(Unit, b.unit_id)
        if unit and unit.status != UnitStatus.SOLD:
            print(f"Updating Unit {unit.id} to SOLD")
            unit.status = UnitStatus.SOLD
            db.add(unit)
    db.commit()
    print("Done")
