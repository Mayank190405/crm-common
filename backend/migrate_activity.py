from app.db.session import engine
from sqlalchemy import text

def migrate():
    # 1. Add missing Activity columns
    activity_cols = [
        "is_completed BOOLEAN DEFAULT FALSE",
        "completed_at TIMESTAMP",
        "notified_24h BOOLEAN DEFAULT FALSE",
        "notified_5h BOOLEAN DEFAULT FALSE",
        "notified_5m BOOLEAN DEFAULT FALSE",
        "notified_ontime BOOLEAN DEFAULT FALSE"
    ]
    
    with engine.connect() as conn:
        print("Migrating Activity columns...")
        for col in activity_cols:
            try:
                name = col.split()[0]
                sql = f"ALTER TABLE activity ADD COLUMN IF NOT EXISTS {col}"
                conn.execute(text(sql))
            except Exception as e:
                print(f"Skipping {name}: {str(e)}")
        
        # 2. Fix Lead last_name (making it nullable)
        print("Fixing Lead table...")
        try:
            conn.execute(text("ALTER TABLE lead ALTER COLUMN last_name DROP NOT NULL"))
        except Exception as e:
            print(f"Skipping last_name fix: {str(e)}")
            
        conn.commit()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
