from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlmodel import Session
from app.api import deps
from app.models.models import User, BookingDocument, UserRole
import os

router = APIRouter()

UPLOAD_ROOT = "storage/documents"

@router.get("/{document_id}")
def download_document(
    document_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Secure file download. Verifies user access before serving.
    """
    doc = db.get(BookingDocument, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Authorization logic
    if current_user.role not in [UserRole.ADMIN, UserRole.ACCOUNTS, UserRole.SALES_MANAGER]:
        # Check if user is the creator of the booking
        from app.models.models import Booking
        booking = db.get(Booking, doc.booking_id)
        if not booking or booking.created_by_id != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized to download this file")

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Physical file missing on server")

    return FileResponse(
        path=doc.file_path, 
        filename=os.path.basename(doc.file_path),
        media_type='application/octet-stream'
    )
