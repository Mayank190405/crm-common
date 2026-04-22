#!/bin/bash

# Run database initialization/migration
echo "Initializing database..."
python init_production_db.py

# Start the application
echo "Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
