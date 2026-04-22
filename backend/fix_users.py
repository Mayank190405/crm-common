from app.db.session import engine
from app.models.models import User
from sqlmodel import Session, select

def fix():
    with Session(engine) as session:
        statement = select(User).where(User.phone == None)
        users = session.exec(statement).all()
        for u in users:
            u.phone = ""
            session.add(u)
        session.commit()
        print(f"Fixed {len(users)} users.")

if __name__ == "__main__":
    fix()
