from fastapi import APIRouter
from app.api.v1.endpoints import auth, leads, projects, activities, bookings, documents, financials, notifications, reports, downloads, websockets, webhooks

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(leads.router, prefix="/leads", tags=["leads"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(activities.router, prefix="/activities", tags=["activities"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["bookings"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(financials.router, prefix="/financials", tags=["financials"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(downloads.router, prefix="/downloads", tags=["downloads"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(websockets.router, tags=["websockets"])
