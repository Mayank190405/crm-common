from sqlmodel import SQLModel, Session, select
from app.db.session import engine
from app.models.models import User, UserRole, Project, Lead, Activity, Booking, BookingDocument, Tower, Floor, Unit, LeadSource, ActivityType
from app.core.security import get_password_hash

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        # 1. Create initial admin user
        statement = select(User).where(User.email == "admin@crm.com")
        existing_admin = session.exec(statement).first()
        if not existing_admin:
            admin_user = User(
                email="admin@crm.com",
                full_name="System Administrator",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.ADMIN,
                is_active=True
            )
            session.add(admin_user)
            print("Initial admin user created: admin@crm.com / admin123")

        # 2. Seed Lead Sources
        sources = ["Facebook", "Google Ads", "Direct Website", "Walk-in", "Referral"]
        for s_name in sources:
            existing_s = session.exec(select(LeadSource).where(LeadSource.name == s_name)).first()
            if not existing_s:
                session.add(LeadSource(name=s_name))

        # 3. Seed Activity Types
        a_types = ["Call", "Meeting", "Site Visit", "Email", "Note"]
        for a_name in a_types:
            existing_a = session.exec(select(ActivityType).where(ActivityType.name == a_name)).first()
            if not existing_a:
                session.add(ActivityType(name=a_name))

        session.commit()

if __name__ == "__main__":
    create_db_and_tables()
    print("Database tables created and seeded successfully!")
