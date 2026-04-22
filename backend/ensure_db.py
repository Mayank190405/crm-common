import psycopg2
from psycopg2 import sql
from app.core.config import settings

def ensure_db_exists():
    # Connect to the default 'postgres' database to check for 'app'
    try:
        conn = psycopg2.connect(
            dbname='postgres',
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            host=settings.POSTGRES_SERVER
        )
        conn.autocommit = True
        cur = conn.cursor()
        
        # Check if database exists
        cur.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s", (settings.POSTGRES_DB,))
        exists = cur.fetchone()
        
        if not exists:
            # Create database if it doesn't exist
            print(f"Creating database {settings.POSTGRES_DB}...")
            cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(settings.POSTGRES_DB)))
            print(f"Database {settings.POSTGRES_DB} created!")
        else:
            print(f"Database {settings.POSTGRES_DB} already exists.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error checking/creating database: {e}")

if __name__ == "__main__":
    ensure_db_exists()
