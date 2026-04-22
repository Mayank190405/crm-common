from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

def check_columns():
    with engine.connect() as conn:
        print("--- Checking customer table columns ---")
        try:
            result = conn.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'customer';
            """))
            for row in result:
                print(f"Column: {row[0]}, Type: {row[1]}")
        except Exception as e:
            print(f"Error checking customer: {e}")

        print("\n--- Checking booking table columns ---")
        try:
            result = conn.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'booking';
            """))
            for row in result:
                print(f"Column: {row[0]}, Type: {row[1]}")
        except Exception as e:
            print(f"Error checking booking: {e}")

if __name__ == "__main__":
    check_columns()
