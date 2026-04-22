from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from sqlalchemy import or_
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from app.api import deps
from app.models.models import User, Lead, LeadStatus, LeadStatusHistory, LeadAssignmentHistory, UserRole, LeadSource, Booking, Activity, LeadStage
from app.schemas.schemas import LeadCreate, LeadOut, LeadUpdate, LeadSourceCreate, BulkAssign, BulkTransfer, LeadPagination, LeadStageOut, LeadStageCreate, LeadStageUpdate
from fastapi.responses import StreamingResponse
import re
import io
import pandas as pd

router = APIRouter()

def normalize_phone(phone: str) -> str:
    """
    Standardize phone numbers for deduplication and valid indexing.
    Specifically handles Indian numbers (+91) by canonicalizing to last 10 digits.
    """
    # Remove all non-numeric characters
    cleaned = re.sub(r"\D", "", phone)
    
    # Handle Indian country code (91)
    if len(cleaned) == 12 and cleaned.startswith("91"):
        cleaned = cleaned[-10:]
    
    # Ensure it's at least a 10-digit number
    if len(cleaned) < 10:
        raise HTTPException(status_code=400, detail=f"Invalid phone number format: {phone}")
    
    return cleaned

# --- STATIC PREFIX ROUTES (Must be before parameterized ones) ---

@router.get("/sources", response_model=List[LeadSource])
def read_lead_sources(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.check_access_leads),
) -> Any:
    return db.exec(select(LeadSource)).all()

@router.post("/sources", response_model=LeadSource)
def create_lead_source(
    *,
    db: Session = Depends(deps.get_db),
    source_in: LeadSourceCreate,
    current_user: User = Depends(deps.check_admin),
) -> Any:
    source = LeadSource(**source_in.dict())
    db.add(source)
    db.commit()
    db.refresh(source)
    return source

@router.get("/sample-csv")
def download_sample_csv():
    df = pd.DataFrame([{
        "first_name": "Rahul",
        "last_name": "Sharma",
        "email": "rahul@example.com",
        "phone": "9876543210",
        "budget": 7500000,
        "source_name": "Facebook"
    }])
    output = io.StringIO()
    df.to_csv(output, index=False)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads_sample.csv"}
    )

@router.post("/bulk-delete")
def bulk_delete_leads(
    *,
    db: Session = Depends(deps.get_db),
    ids: List[int],
    current_user: User = Depends(deps.check_admin),
) -> Any:
    for lead_id in ids:
        lead = db.get(Lead, lead_id)
        if lead:
            db.delete(lead)
    db.commit()
    return {"msg": f"Deleted {len(ids)} leads"}

@router.get("/unassigned", response_model=List[LeadOut])
def get_unassigned_leads(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.check_access_leads),
) -> Any:
    return db.exec(
        select(Lead)
        .where(Lead.assigned_to_id == None)
        .options(selectinload(Lead.project), selectinload(Lead.source_ref))
    ).all()

@router.post("/bulk-assign")
def bulk_assign_leads(
    *,
    db: Session = Depends(deps.get_db),
    assign_in: BulkAssign,
    current_user: User = Depends(deps.check_admin),
) -> Any:
    from app.services.notifications import create_notification
    from app.models.models import NotificationType
    
    to_user = db.get(User, assign_in.to_user_id)
    if not to_user:
        raise HTTPException(status_code=404, detail="Target user not found")
        
    count = 0
    for lead_id in assign_in.lead_ids:
        lead = db.get(Lead, lead_id)
        if lead:
            lead.assigned_to_id = to_user.id
            # Log history
            history = LeadAssignmentHistory(
                lead_id=lead.id,
                to_user_id=to_user.id,
                from_user_id=None
            )
            db.add(history)
            count += 1
    
    db.commit()
    
    # Send Notification to Sales Executive
    create_notification(
        db=db,
        user_id=to_user.id,
        type=NotificationType.LEAD_ASSIGNED,
        title="New Leads Assigned",
        message=f"Admin has assigned {count} new leads to you.",
        send_whatsapp=True
    )
    
    # NEW: Send confirmation to Admin/Sender too
    create_notification(
        db=db,
        user_id=current_user.id,
        type=NotificationType.LEAD_ASSIGNED,
        title="Assignment Completed",
        message=f"You successfully assigned {count} leads to {to_user.full_name}.",
        send_whatsapp=False
    )
    
    return {"msg": f"Successfully assigned {count} leads to {to_user.full_name}"}

@router.post("/bulk-transfer")
def bulk_transfer_data(
    *,
    db: Session = Depends(deps.get_db),
    transfer_in: BulkTransfer,
    current_user: User = Depends(deps.check_admin),
) -> Any:
    from_user = db.get(User, transfer_in.from_user_id)
    to_user = db.get(User, transfer_in.to_user_id)
    if not from_user or not to_user:
        raise HTTPException(status_code=404, detail="User(s) not found")
        
    # Transfer Leads
    leads = db.exec(select(Lead).where(Lead.assigned_to_id == from_user.id)).all()
    for l in leads:
        l.assigned_to_id = to_user.id
        db.add(LeadAssignmentHistory(lead_id=l.id, from_user_id=from_user.id, to_user_id=to_user.id))
        
    # Transfer Bookings (created_by_id)
    bookings = db.exec(select(Booking).where(Booking.created_by_id == from_user.id)).all()
    for b in bookings:
        b.created_by_id = to_user.id
        
    db.commit()
    return {"msg": f"Transferred {len(leads)} leads and {len(bookings)} bookings to {to_user.full_name}"}

@router.post("/bulk-upload")
async def bulk_upload_leads(
    file: UploadFile = File(...),
    assigned_to_id: Optional[int] = Form(None),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.check_telecaller),
):
    content = await file.read()
    try:
        if file.filename.endswith(".csv"):
            # Try multiple encodings - Excel often saves as cp1252/latin-1
            for encoding in ["utf-8", "utf-8-sig", "cp1252", "latin-1", "iso-8859-1"]:
                try:
                    df = pd.read_csv(io.BytesIO(content), encoding=encoding)
                    break
                except UnicodeDecodeError:
                    continue
            else:
                raise HTTPException(status_code=400, detail="Could not read CSV file. Please try saving your file as UTF-8 CSV in Excel.")
        else:
            df = pd.read_excel(io.BytesIO(content))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")
    
    # Normalize headers for flexible mapping
    # 1. Lowercase + No Spaces/Underscores
    def normalize_header(h):
        return str(h).lower().replace(" ", "").replace("_", "").strip()
    
    df.columns = [normalize_header(c) for c in df.columns]
    
    # Helper for flexible column lookup
    def get_val(row, *aliases):
        for a in aliases:
            a_norm = normalize_header(a)
            if a_norm in df.columns:
                val = row[a_norm]
                return None if pd.isna(val) else val
        return None

    created_count = 0
    duplicate_count = 0
    error_count = 0
    
    for idx, row in df.iterrows():
        try:
            # 1. Extract & Validate Phone (Critical)
            raw_phone = get_val(row, "phone", "mobile", "contact")
            if not raw_phone:
                print(f"Row {idx}: Missing phone number")
                error_count += 1
                continue
            phone = normalize_phone(str(raw_phone))
            
            # 2. Extract Fields
            first_name = get_val(row, "first_name", "firstname", "name")
            if not first_name:
                print(f"Row {idx}: Missing first name")
                error_count += 1
                continue
                
            last_name = get_val(row, "last_name", "lastname")
            email = str(get_val(row, "email")).lower().strip() if get_val(row, "email") else None
            
            # 3. Deduplication (Refined to ignore NULLs)
            dup_filter = []
            if phone:
                dup_filter.append(Lead.phone == phone)
            if email:
                dup_filter.append(Lead.email == email)
                
            if dup_filter:
                existing = db.exec(select(Lead).where(or_(*dup_filter))).first()
                if existing:
                    duplicate_count += 1
                    continue
            
            # 4. Reference Lookups
            source_name = get_val(row, "source", "sourcename", "leadsource")
            source_id = None
            if source_name:
                source = db.exec(select(LeadSource).where(LeadSource.name.ilike(str(source_name).strip()))).first()
                if source:
                    source_id = source.id
            
            raw_budget = get_val(row, "budget", "value")
            
            lead = Lead(
                first_name=str(first_name).strip(),
                last_name=str(last_name).strip() if last_name else None,
                email=email,
                phone=phone,
                source_id=source_id,
                assigned_to_id=assigned_to_id,
                budget=float(raw_budget) if raw_budget else None
            )
            db.add(lead)
            created_count += 1
        except Exception as e:
            print(f"Row {idx}: Unexpected error: {str(e)}")
            error_count += 1
            continue
            
    db.commit()
    return {
        "msg": f"Import complete: {created_count} created, {duplicate_count} duplicates skipped, {error_count} rows failed validation."
    }

@router.post("/preview-upload")
async def preview_upload_leads(
    file: UploadFile = File(...),
    current_user: User = Depends(deps.check_telecaller),
):
    content = await file.read()
    if file.filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(content))
    else:
        df = pd.read_excel(io.BytesIO(content))
    
    # Get top 2 rows, handle potential empty files
    preview = df.head(2).fillna("").to_dict(orient="records")
    return {"preview": preview}

    db.commit()
    return {"msg": f"Successfully assigned {assigned_count} leads"}

@router.get("/search", response_model=List[LeadOut])
def search_leads(
    q: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.check_access_leads),
    limit: int = 20,
) -> Any:
    """
    Search leads by name, email, or phone.
    """
    from sqlalchemy.orm import selectinload
    search_term = f"%{q}%"
    
    statement = select(Lead).where(
        (Lead.first_name.ilike(search_term)) | 
        (Lead.last_name.ilike(search_term)) | 
        (Lead.email.ilike(search_term)) | 
        (Lead.phone.ilike(search_term))
    ).options(selectinload(Lead.source_ref), selectinload(Lead.project))
    
    # RBAC: Agents only see their own assigned leads. Telecallers/Managers/Admins see all.
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SALES_MANAGER, UserRole.TELECALLER]:
        statement = statement.where(Lead.assigned_to_id == current_user.id)
        
    return db.exec(statement.limit(limit)).all()

# --- PARAMETERIZED & ROOT ROUTES (Must be after specific static routes) ---

@router.get("", response_model=LeadPagination)
def read_leads(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.check_access_leads),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    status: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None),
    source_id: Optional[int] = Query(None),
    assigned_to_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
) -> Any:
    """
    Get leads with upcoming follow-up at top and pagination.
    """
    from sqlalchemy import func, or_
    from sqlalchemy.orm import selectinload
    import math

    skip = (page - 1) * size
    now = datetime.now(timezone.utc)

    # Subquery for next follow up (only looking at future, incomplete ones)
    next_fup_sub = select(
        Activity.lead_id,
        func.min(Activity.follow_up_at).label("next_fup")
    ).where(
        Activity.follow_up_at >= now,
        Activity.is_completed == False
    ).group_by(Activity.lead_id).subquery()

    # Base query
    statement = select(Lead, next_fup_sub.c.next_fup).outerjoin(
        next_fup_sub, Lead.id == next_fup_sub.c.lead_id
    )

    # Search logic
    if search:
        search_fmt = f"%{search}%"
        statement = statement.where(or_(
            Lead.first_name.ilike(search_fmt),
            Lead.last_name.ilike(search_fmt),
            Lead.phone.ilike(search_fmt),
            Lead.email.ilike(search_fmt)
        ))

    # Role-based filtering
    allowed_roles = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SALES_MANAGER, UserRole.TELECALLER]
    if current_user.role not in allowed_roles:
        statement = statement.where(Lead.assigned_to_id == current_user.id)

    # Filters
    if status:
        statement = statement.where(Lead.status == status)
    if project_id:
        statement = statement.where(Lead.project_id == project_id)
    if source_id:
        statement = statement.where(Lead.source_id == source_id)
    if assigned_to_id:
        statement = statement.where(Lead.assigned_to_id == assigned_to_id)

    # Sorting: Upcoming follow-up first, then newest leads
    statement = statement.options(
        selectinload(Lead.source_ref), 
        selectinload(Lead.project),
        selectinload(Lead.assigned_to)
    ).order_by(
        next_fup_sub.c.next_fup.asc().nulls_last(), # Future dates ascending (soonest first)
        Lead.created_at.desc()
    )

    # Get total count
    count_statement = select(func.count()).select_from(statement.subquery())
    total = db.exec(count_statement).one()

    # Paging result
    results = db.exec(statement.offset(skip).limit(size)).all()

    from app.schemas.schemas import LeadOut
    items = []
    for lead, next_fup in results:
        # Construct LeadOut then set next_follow_up_at manually
        lead_out = LeadOut.model_validate(lead)
        lead_out.next_follow_up_at = next_fup
        items.append(lead_out)

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": math.ceil(total / size) if size > 0 else 0
    }

@router.post("", response_model=LeadOut)
def create_lead(
    *,
    db: Session = Depends(deps.get_db),
    lead_in: LeadCreate,
    current_user: User = Depends(deps.check_access_leads),
) -> Any:
    # 1. Normalization & Initial Validation
    try:
        normalized_phone = normalize_phone(lead_in.phone)
        normalized_email = lead_in.email.lower().strip() if lead_in.email else None
    except HTTPException as e:
        # Rethrow explicit HTTP errors from normalization (e.g. invalid phone)
        raise e
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Data normalization error: {str(e)}")

    # 2. Strict Deduplication (Refined to ignore NULLs)
    # Only check if phone or email matches when they have values
    dup_filter = []
    if normalized_phone:
        dup_filter.append(Lead.phone == normalized_phone)
    if normalized_email:
        dup_filter.append(Lead.email == normalized_email)
        
    if dup_filter:
        existing_lead = db.exec(select(Lead).where(or_(*dup_filter))).first()
        if existing_lead:
            print(f"[Lead-Deduplication] Blocked manual creation. Existing ID: {existing_lead.id} | Phone: {normalized_phone}")
            raise HTTPException(
                status_code=400, 
                detail=f"Lead already exists (Lead ID: {existing_lead.id})",
                headers={"X-Existing-Lead-ID": str(existing_lead.id)}
            )

    # 3. Transactional Creation
    lead = Lead(
        first_name=lead_in.first_name,
        last_name=lead_in.last_name,
        email=normalized_email,
        phone=normalized_phone,
        source_id=lead_in.source_id,
        project_id=lead_in.project_id,
        assigned_to_id=lead_in.assigned_to_id,
        budget=lead_in.budget
    )
    
    if not lead.assigned_to_id and current_user.role == UserRole.SALES_AGENT:
        lead.assigned_to_id = current_user.id
            
    db.add(lead)
    db.commit()
    db.refresh(lead)

    # 4. Assignment Auditing & Notification
    if lead.assigned_to_id:
        history = LeadAssignmentHistory(lead_id=lead.id, to_user_id=lead.assigned_to_id)
        db.add(history)
        
        from app.services.notifications import create_notification, NotificationType
        create_notification(
            db, 
            lead.assigned_to_id, 
            NotificationType.LEAD_ASSIGNED, 
            "New Lead Assigned", 
            f"You have been assigned a new lead: {lead.first_name} {lead.last_name}",
            related_id=lead.id,
            send_whatsapp=True
        )
        db.commit()

    return lead

@router.get("/{id}", response_model=LeadOut)
def read_lead(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.check_access_leads),
) -> Any:
    """
    Get a specific lead by ID.
    """
    from sqlalchemy.orm import selectinload
    lead = db.exec(
        select(Lead)
        .options(selectinload(Lead.source_ref), selectinload(Lead.project), selectinload(Lead.assigned_to))
        .where(Lead.id == id)
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # RBAC check
    allowed_roles = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SALES_MANAGER, UserRole.TELECALLER]
    if current_user.role not in allowed_roles and lead.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this lead")
        
    return lead

@router.put("/{id}", response_model=LeadOut)
def update_lead(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    lead_in: LeadUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    from sqlalchemy.orm import selectinload
    lead = db.exec(
        select(Lead)
        .options(selectinload(Lead.source_ref), selectinload(Lead.project), selectinload(Lead.assigned_to))
        .where(Lead.id == id)
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Permission: Owner, Manager, or Admin
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SALES_MANAGER] and lead.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    update_data = lead_in.dict(exclude_unset=True)
    
    # History Tracking
    if "status" in update_data and update_data["status"] != lead.status:
        db.add(LeadStatusHistory(
            lead_id=lead.id, old_status=lead.status, new_status=update_data["status"], changed_by_id=current_user.id
        ))

    if "assigned_to_id" in update_data and update_data["assigned_to_id"] != lead.assigned_to_id:
        db.add(LeadAssignmentHistory(
            lead_id=lead.id, from_user_id=lead.assigned_to_id, to_user_id=update_data["assigned_to_id"]
        ))

    for key, value in update_data.items():
        setattr(lead, key, value)
    
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead
@router.get("/export/csv")
def export_leads_csv(
    *,
    db: Session = Depends(deps.get_db),
    project_id: int = Query(None),
    source_id: int = Query(None),
    status: str = Query(None),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Export leads to CSV with filters.
    """
    from sqlalchemy.orm import selectinload
    statement = select(Lead).options(selectinload(Lead.source_ref), selectinload(Lead.project), selectinload(Lead.assigned_to))
    
    if project_id:
        statement = statement.where(Lead.project_id == project_id)
    if source_id:
        statement = statement.where(Lead.source_id == source_id)
    if status:
        statement = statement.where(Lead.status == status)
        
    # RBAC: Agents only see their own
    if current_user.role not in [UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.TELECALLER]:
        statement = statement.where(Lead.assigned_to_id == current_user.id)
        
    leads = db.exec(statement).all()
    
    # Create DataFrame
    data = []
    for l in leads:
        data.append({
            "Lead ID": l.id,
            "First Name": l.first_name,
            "Last Name": l.last_name,
            "Email": l.email,
            "Phone": l.phone,
            "Project": l.project.name if l.project else "N/A",
            "Source": l.source_ref.name if l.source_ref else "Direct",
            "Status": l.status,
            "Budget": l.budget,
            "Created At": l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else ""
        })
    
    df = pd.DataFrame(data)
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    
    response = StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = f"attachment; filename=leads_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return response
# --- Lead Stages ---

@router.get("/config/stages", response_model=List[LeadStageOut])
def get_lead_stages(db: Session = Depends(deps.get_db)) -> Any:
    """
    Get all lead stages. Seeds default ones if empty.
    """
    stages = db.exec(select(LeadStage).order_by(LeadStage.display_order)).all()
    if not stages:
        # Seed default stages
        defaults = [
            ("new", "New", "blue", 0),
            ("contacted", "Contacted", "indigo", 1),
            ("call_not_received", "Call Not Received", "orange", 2),
            ("qualified", "Qualified", "green", 3),
            ("switched_off", "Switched Off", "red", 4),
            ("lost", "Lost", "slate", 5),
            ("won", "Won", "emerald", 6),
        ]
        for slug, name, color, order in defaults:
            stage = LeadStage(slug=slug, name=name, color=color, display_order=order)
            db.add(stage)
        db.commit()
        stages = db.exec(select(LeadStage).order_by(LeadStage.display_order)).all()
    return stages

@router.post("/config/stages", response_model=LeadStageOut)
def create_lead_stage(
    stage_in: LeadStageCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.check_admin)
) -> Any:
    stage = LeadStage(**stage_in.model_dump())
    db.add(stage)
    db.commit()
    db.refresh(stage)
    return stage

@router.put("/config/stages/{stage_id}", response_model=LeadStageOut)
def update_lead_stage(
    stage_id: int,
    stage_in: LeadStageUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.check_admin)
) -> Any:
    stage = db.get(LeadStage, stage_id)
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    update_data = stage_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(stage, key, value)
    db.add(stage)
    db.commit()
    db.refresh(stage)
    return stage

@router.delete("/config/stages/{stage_id}")
def delete_lead_stage(
    stage_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.check_admin)
) -> Any:
    stage = db.get(LeadStage, stage_id)
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    db.delete(stage)
    db.commit()
    return {"status": "success"}
