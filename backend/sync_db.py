from sqlmodel import Session, create_engine, SQLModel, text
from app.core.config import settings
from app.models.models import *

engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)

def init_db():
    print("Initializing Database Schema...")
    # SQLModel.metadata.create_all(engine)
    
    # Manually add columns if they don't exist to avoid dropping data
    with engine.begin() as conn:
        print("Checking for missing columns...")
        
        # Customer updates
        try:
            conn.execute(text('ALTER TABLE customer ADD COLUMN address VARCHAR;'))
            print("Added customer.address")
        except: pass
        try:
            conn.execute(text('ALTER TABLE customer ADD COLUMN profile_photo VARCHAR;'))
            print("Added customer.profile_photo")
        except: pass

        # Booking updates
        try:
            conn.execute(text('ALTER TABLE booking ADD COLUMN bank_loan_amount FLOAT DEFAULT 0.0;'))
            print("Added booking.bank_loan_amount")
        except: pass
        try:
            conn.execute(text('ALTER TABLE booking ADD COLUMN own_contribution_amount FLOAT DEFAULT 0.0;'))
            print("Added booking.own_contribution_amount")
        except: pass

        # PaymentSchedule updates
        try:
            conn.execute(text('ALTER TABLE paymentschedule ADD COLUMN last_notification_sent TIMESTAMP;'))
            print("Added paymentschedule.last_notification_sent")
        except: pass
        
        # CoApplicant updates
        try:
            conn.execute(text('ALTER TABLE coapplicant ADD COLUMN phone VARCHAR;'))
            print("Added coapplicant.phone")
        except: pass
        try:
            conn.execute(text('ALTER TABLE coapplicant ADD COLUMN email VARCHAR;'))
            print("Added coapplicant.email")
        except: pass
        try:
            conn.execute(text('ALTER TABLE coapplicant ADD COLUMN aadhaar_number VARCHAR;'))
            print("Added coapplicant.aadhaar_number")
        except: pass
        try:
            conn.execute(text('ALTER TABLE coapplicant ADD COLUMN address VARCHAR;'))
            print("Added coapplicant.address")
        except: pass
        try:
            conn.execute(text('ALTER TABLE coapplicant ADD COLUMN profile_photo VARCHAR;'))
            print("Added coapplicant.profile_photo")
        except: pass

        # Create new tables
        try:
            SQLModel.metadata.create_all(engine)
            print("Ensured all tables exist via SQLModel.")
        except Exception as e:
            print(f"Error creating tables: {e}")
        
    print("Database sync complete.")

if __name__ == "__main__":
    init_db()
