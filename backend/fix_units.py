import os
from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

with engine.begin() as conn:
    # Set unit status to SOLD for all units associated with an ADMIN_CONFIRMED booking
    conn.execute(text("UPDATE unit SET status='SOLD' FROM booking WHERE booking.unit_id = unit.id AND booking.status='admin_confirmed'"))
    print("Database updated.")
