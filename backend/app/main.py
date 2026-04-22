from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
import asyncio

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
from datetime import datetime
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.core.security import RateLimitMiddleware
from app.core.metrics import MetricsMiddleware

# Initialize Logging
setup_logging()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    redirect_slashes=False,
)

async def background_worker():
    """
    Periodic background tasks:
    1. Release Expired Blocks (Units)
    2. Process Follow-up Reminders (WhatsApp)
    """
    from app.services.tasks import (
        release_expired_blocks, 
        process_followup_reminders,
        process_payment_reminders,
        notify_unassigned_leads
    )
    while True:
        try:
            release_expired_blocks()
            await process_followup_reminders()
            await process_payment_reminders()
            await notify_unassigned_leads()
        except Exception as e:
            print(f"[{datetime.utcnow()}] Worker Error: {str(e)}")
        await asyncio.sleep(60)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(background_worker())

# Improved CORS policy
origins = []
if settings.BACKEND_CORS_ORIGINS:
    if isinstance(settings.BACKEND_CORS_ORIGINS, str):
        origins = [o.strip() for o in settings.BACKEND_CORS_ORIGINS.split(",") if o.strip()]
    else:
        origins = [str(origin).rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS]

# Add middleware in reverse order of execution (Outer-most added last)
# 1. Metrics & Rate Limiting (Inner)
app.add_middleware(MetricsMiddleware)
app.add_middleware(RateLimitMiddleware, limit=1000, window=60)

# 2. CORS (Outer)
if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/health")
def health_check():
    return {"status": "operational", "timestamp": datetime.utcnow().isoformat()}

from prometheus_client import make_asgi_app
from fastapi import Request

# Mount prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {"message": "Welcome to Real Estate CRM API"}
