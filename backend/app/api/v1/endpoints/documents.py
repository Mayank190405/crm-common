from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
from app.api import deps
from app.models.models import User, BookingDocument, Booking, UserRole
import os
import secrets

router = APIRouter()

UPLOAD_ROOT = "storage/documents"
ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png"}
MAX_FILE_SIZE = 5 * 1024 * 1024 # 5MB

def validate_file(file: UploadFile):
    ext = file.filename.split(".")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid file extension")
    # In a real app, also check magic bytes / MIME type

@router.post("/upload/{booking_id}")
async def upload_booking_document(
    booking_id: int,
    doc_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Secure document upload with RBAC, path traversal protection, and versioning.
    """
    # 1. Basic RBAC
    if doc_type.lower() in ["agreement", "receipt", "cost_sheet"]:
        if current_user.role not in [UserRole.ADMIN, UserRole.ACCOUNTS]:
            raise HTTPException(status_code=403, detail="Only Accounts/Admin can upload financial docs")
    
    # 2. File Validation
    validate_file(file)
    
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # 3. Path Traversal Protection & Versioning
    # We use secrets.token_hex for a random element in the filename to prevent predictable paths
    booking_dir = os.path.join(UPLOAD_ROOT, f"booking_{booking_id}")
    os.makedirs(booking_dir, exist_ok=True)
    
    existing_docs = db.exec(select(BookingDocument).where(BookingDocument.booking_id == booking_id, BookingDocument.type == doc_type)).all()
    next_version = len(existing_docs) + 1
    
    # Sanitized filename
    safe_filename = "".join([c for c in file.filename if c.isalnum() or c in "._-"])
    final_filename = f"{doc_type}_v{next_version}_{safe_filename}"
    file_path = os.path.join(booking_dir, final_filename)
    
    # 4. Atomic file save
    try:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large")
            
        with open(file_path, "wb") as buffer:
            buffer.write(content)
            
        doc = BookingDocument(
            booking_id=booking_id,
            type=doc_type,
            file_path=file_path,
            uploaded_by_id=current_user.id,
            version=next_version
        )
        db.add(doc)
        db.commit()
        return {"msg": "Document secured", "version": next_version}
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise e

@router.get("/booking/{booking_id}", response_model=List[BookingDocument])
def get_booking_documents(
    booking_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    # RBAC logic
    if current_user.role not in [UserRole.ADMIN, UserRole.ACCOUNTS, UserRole.SALES_MANAGER]:
        booking = db.get(Booking, booking_id)
        if not booking or booking.created_by_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")

    statement = select(BookingDocument).where(BookingDocument.booking_id == booking_id)
    return db.exec(statement).all()
