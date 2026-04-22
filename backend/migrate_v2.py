from sqlalchemy import create_engine, text
import os

DATABASE_URL = os.getenv("SQLALCHEMY_DATABASE_URI", "postgresql://postgres:postgres@db/app")
engine = create_engine(DATABASE_URL)

def migrate():
    # Use autocommit to ignore failures of individual columns if they already exist
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        print("Migrating Activity table...")
        try:
            conn.execute(text("ALTER TABLE activity ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_activity_is_completed ON activity (is_completed)"))
        except Exception as e: print(f"Activity is_completed skip: {e}")
        
        try:
            conn.execute(text("ALTER TABLE activity ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITHOUT TIME ZONE"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_activity_completed_at ON activity (completed_at)"))
        except Exception as e: print(f"Activity completed_at skip: {e}")

        # New Notification Columns
        notif_cols = ["notified_24h", "notified_5h", "notified_5m", "notified_ontime"]
        for col in notif_cols:
            try:
                conn.execute(text(f"ALTER TABLE activity ADD COLUMN IF NOT EXISTS {col} BOOLEAN DEFAULT FALSE"))
                print(f"Added {col} to activity")
            except Exception as e: print(f"Activity {col} skip: {e}")

        print("Migrating Booking table...")
        cols = [
            ("agreement_cost", "FLOAT DEFAULT 0.0"),
            ("actual_cost", "FLOAT DEFAULT 0.0"),
            ("other_costs", "FLOAT DEFAULT 0.0"),
            ("total_cost", "FLOAT DEFAULT 0.0"),
            ("final_total_cost", "FLOAT DEFAULT 0.0"),
            ("bank_loan_amount", "FLOAT DEFAULT 0.0"),
            ("own_contribution_amount", "FLOAT DEFAULT 0.0"),
            ("booking_form_photo", "VARCHAR")
        ]
        for col, col_type in cols:
            try:
                # PostgreSQL doesn't support ADD COLUMN IF NOT EXISTS for older versions easily in one go, but we can catch
                conn.execute(text(f"ALTER TABLE booking ADD COLUMN {col} {col_type}"))
                print(f"Added {col}")
            except Exception as e: 
                if "already exists" in str(e).lower():
                    print(f"Booking {col} already exists, skipping.")
                else:
                    print(f"Booking {col} error: {e}")
        
    print("Migration V2 finished.")

if __name__ == "__main__":
    migrate()
