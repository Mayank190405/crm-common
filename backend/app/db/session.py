from sqlmodel import create_engine, Session
from app.core.config import settings

engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URI, 
    echo=False,
    pool_size=10,
    max_overflow=5,
    pool_timeout=30
)

def get_session():
    with Session(engine) as session:
        yield session
