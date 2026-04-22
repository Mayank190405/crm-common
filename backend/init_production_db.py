import os
import sys
from sqlmodel import SQLModel, Session, select
from app.db.session import engine
from app.models.models import User, UserRole, LeadSource, ActivityType, Lead, Project, Tower, Floor, Unit, Activity, Booking
from app.core.security import get_password_hash

def init_db():
    print("Creating tables...")
    SQLModel.metadata.create_all(engine)
    
    # Get configuration from env with defaults
    admin_email = os.getenv("FIRST_SUPERUSER", "admin@krads.com")
    admin_password = os.getenv("FIRST_SUPERUSER_PASSWORD", "admin123")
    admin_name = os.getenv("FIRST_SUPERUSER_NAME", "Krads Admin")

    with Session(engine) as session:
        # 1. Create initial Super Admin
        statement = select(User).where(User.email == admin_email)
        existing_admin = session.exec(statement).first()
        
        if not existing_admin:
            print(f"Creating super admin: {admin_email}")
            admin_user = User(
                email=admin_email,
                full_name=admin_name,
                hashed_password=get_password_hash(admin_password),
                role=UserRole.ADMIN,
                is_active=True
            )
            session.add(admin_user)
        else:
            print(f"Super admin {admin_email} already exists.")

        # 2. Seed Lead Sources (Fresh start)
        sources = ["Facebook", "Google Ads", "Direct Website", "Walk-in", "Referral", "Instagram", "WhatsApp"]
        for s_name in sources:
            existing_s = session.exec(select(LeadSource).where(LeadSource.name == s_name)).first()
            if not existing_s:
                session.add(LeadSource(name=s_name))

        # 3. Seed Activity Types
        a_types = ["Call", "Meeting", "Site Visit", "Email", "Note", "Follow-up"]
        for a_name in a_types:
            existing_a = session.exec(select(ActivityType).where(ActivityType.name == a_name)).first()
            if not existing_a:
                session.add(ActivityType(name=a_name))

        session.commit()
    print("Database initialized successfully.")

if __name__ == "__main__":
    init_db()
