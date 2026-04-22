from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
import pandas as pd
import io
from sqlmodel import Session, select
from datetime import datetime, timedelta
from app.api import deps
from app.models.models import User, Project, Tower, Floor, Unit, UnitStatus, UnitStatusHistory, UserRole, Booking, BookingStatus
from app.schemas.schemas import ProjectOut, UnitOut, ProjectCreate

router = APIRouter()

@router.get("/sample-csv")
def get_inventory_sample_csv():
    """
    Generate a sample CSV template for inventory bulk upload.
    """
    from fastapi.responses import StreamingResponse
    import io
    
    data = [
        {"Floor": 1, "Unit": "101", "Unit Type": "2 BHK", "Saleable Area": 1172},
        {"Floor": 1, "Unit": "102", "Unit Type": "2 BHK", "Saleable Area": 1139},
        {"Floor": 2, "Unit": "201", "Unit Type": "3 BHK", "Saleable Area": 1229},
        {"Floor": 2, "Unit": "202", "Unit Type": "3 BHK", "Saleable Area": 1429},
        {"Floor": 3, "Unit": "301", "Unit Type": "2 BHK", "Saleable Area": 1122},
    ]
    
    df = pd.DataFrame(data)
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    
    response = StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = "attachment; filename=inventory_sample.csv"
    return response

@router.get("", response_model=List[ProjectOut])
def read_projects(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.check_access_inventory),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve all projects with full hierarchy (Towers -> Floors -> Units -> Bookings).
    Uses optimized selectinload to prevent N+1 queries.
    """
    from sqlalchemy.orm import selectinload
    
    # Eager load the entire tree + related customer/creator data for Unit properties
    statement = select(Project).options(
        selectinload(Project.towers)
        .selectinload(Tower.floors)
        .selectinload(Floor.units)
        .selectinload(Unit.bookings)
        .selectinload(Booking.customer),
        
        selectinload(Project.towers)
        .selectinload(Tower.floors)
        .selectinload(Floor.units)
        .selectinload(Unit.bookings)
        .selectinload(Booking.created_by)
    ).offset(skip).limit(limit)
    
    projects = db.exec(statement).all()
    return projects

@router.post("", response_model=ProjectOut)
def create_project(
    *,
    db: Session = Depends(deps.get_db),
    project_in: ProjectCreate,
    current_user: User = Depends(deps.check_admin),
) -> Any:
    """
    Create a new project (Admin Only).
    """
    project = Project(**project_in.dict())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.post("/{project_id}/bulk-upload-inventory")
async def bulk_upload_inventory(
    project_id: int,
    file: UploadFile = File(...),
    tower_name: str = Query("Tower 1"),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.check_admin),
):
    """
    Bulk upload units for a project from CSV/Excel.
    Columns: Floor, Unit, Unit Type, Saleable Area
    """
    content = await file.read()
    if file.filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(content))
    else:
        df = pd.read_excel(io.BytesIO(content))
    
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # 1. Get or create Tower
    tower = db.exec(select(Tower).where(Tower.project_id == project_id, Tower.name == tower_name)).first()
    if not tower:
        tower = Tower(name=tower_name, project_id=project_id)
        db.add(tower)
        db.commit()
        db.refresh(tower)

    created_count = 0
    for _, row in df.iterrows():
        try:
            floor_num = int(row["Floor"])
            unit_num = str(row["Unit"])
            unit_type = str(row["Unit Type"]) if pd.notna(row.get("Unit Type")) else None
            area = float(row["Saleable Area"]) if pd.notna(row.get("Saleable Area")) else None
            
            # Get or create Floor
            floor = db.exec(select(Floor).where(Floor.tower_id == tower.id, Floor.floor_number == floor_num)).first()
            if not floor:
                floor = Floor(tower_id=tower.id, floor_number=floor_num)
                db.add(floor)
                db.commit()
                db.refresh(floor)
            
            # Create Unit
            unit = Unit(
                floor_id=floor.id,
                unit_number=unit_num,
                unit_type=unit_type,
                saleable_area=area,
                status=UnitStatus.AVAILABLE
            )
            db.add(unit)
            created_count += 1
        except Exception as e:
            print(f"Error skipping row: {e}")
            continue
            
    db.commit()
    return {"msg": f"Successfully created {created_count} units in {tower_name}"}

@router.get("/units/{floor_id}", response_model=List[UnitOut])
def read_units_by_floor(
    floor_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.check_access_inventory),
) -> Any:
    """
    Retrieve units for a specific floor.
    Auto-releases expired blocks and includes customer info if exists.
    """
    from sqlalchemy.orm import selectinload
    statement = select(Unit).where(Unit.floor_id == floor_id).options(
        selectinload(Unit.bookings).selectinload(Booking.customer),
        selectinload(Unit.bookings).selectinload(Booking.created_by)
    )
    units = db.exec(statement).all()
    
    now = datetime.utcnow()
    results = []
    
    for unit in units:
        # Check for expired blocks
        if unit.status == UnitStatus.BLOCKED and unit.blocked_until and unit.blocked_until < now:
            unit.status = UnitStatus.AVAILABLE
            unit.blocked_until = None
            db.add(unit)
        
        # Manually map to UnitOut fields since they aren't directly on the model
        unit_data = UnitOut.from_orm(unit)
        
        # Get latest active booking if any
        active_booking = next((b for b in unit.bookings if b.status != BookingStatus.CANCELLED), None)
        if active_booking and active_booking.customer:
            unit_data.customer_name = active_booking.customer.full_name
            unit_data.customer_phone = active_booking.customer.phone
        
        results.append(unit_data)
    
    db.commit()
    return results

@router.patch("/units/{id}/status")
def update_unit_status(
    id: int,
    status: UnitStatus,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.check_admin), # Strict RBAC: Only Admin/Managers
) -> Any:
    """
    Update unit status and track history. Strict RBAC enforced.
    """
    unit = db.get(Unit, id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    # Track History
    history = UnitStatusHistory(
        unit_id=unit.id,
        old_status=unit.status,
        new_status=status,
        changed_by_id=current_user.id
    )
    db.add(history)
    
    unit.status = status
    if status == UnitStatus.BLOCKED:
        unit.blocked_until = datetime.utcnow() + timedelta(hours=48) # Default block
    else:
        unit.blocked_until = None
        
    db.add(unit)
    db.commit()
    return {"msg": f"Unit {unit.unit_number} status updated to {status}"}

@router.get("/units/detail/{id}", response_model=UnitOut)
def read_unit_detail(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    from sqlalchemy.orm import selectinload
    statement = select(Unit).where(Unit.id == id).options(
        selectinload(Unit.floor).selectinload(Floor.tower).selectinload(Tower.project)
    )
    unit = db.exec(statement).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    return unit
