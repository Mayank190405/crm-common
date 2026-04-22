from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

with engine.begin() as conn:
    print("Adding permissions column to user table...")
    try:
        conn.execute(text('ALTER TABLE "user" ADD COLUMN permissions JSONB DEFAULT \'{}\''))
        print("Column added successfully.")
    except Exception as e:
        print(f"Error: {e}")
