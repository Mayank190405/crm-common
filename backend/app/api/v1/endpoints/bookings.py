from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlmodel import Session, select
from app.api import deps
from app.models.models import Booking, User, UserRole, Unit, UnitStatus, Customer, Lead, LeadStatus, UnitStatusHistory, BookingStatus, CoApplicant, BookingCostItem, BookingDocument, PaymentSchedule, BookingStatusHistory, Floor, Tower, Project
from app.schemas.schemas import BookingCreate, ManualBookingCreate, BookingOut
import json
import os
import uuid
import traceback

router = APIRouter()

UPLOAD_DIR = "uploads/bookings"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.get("", response_model=List[BookingOut])
def read_bookings(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.check_access_bookings),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    from sqlalchemy.orm import selectinload
    statement = select(Booking).options(
        selectinload(Booking.unit).selectinload(Unit.floor).selectinload(Floor.tower).selectinload(Tower.project),
        selectinload(Booking.customer),
        selectinload(Booking.lead),
        selectinload(Booking.created_by)
    )
    
    # RBAC: Agents only see bookings they created
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SALES_MANAGER, UserRole.ACCOUNTS]:
        statement = statement.where(Booking.created_by_id == current_user.id)
        
    bookings = db.exec(statement.offset(skip).limit(limit)).all()
    return bookings

@router.get("/{booking_id}", response_model=Any)
def read_booking(
    booking_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve specific booking details with nested metadata.
    """
    try:
        from sqlalchemy.orm import selectinload
        statement = select(Booking).where(Booking.id == booking_id).options(
            selectinload(Booking.unit).selectinload(Unit.floor).selectinload(Floor.tower).selectinload(Tower.project),
            selectinload(Booking.customer),
            selectinload(Booking.lead),
            selectinload(Booking.created_by),
            selectinload(Booking.cost_breakdown)
        )
        booking = db.exec(statement).first()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
            
        payment_schedules = db.exec(select(PaymentSchedule).where(PaymentSchedule.booking_id == booking_id)).all()
        
        # Standard mapping for consistent format
        b_data = booking.model_dump()
        b_data["payment_schedules"] = [ps.model_dump() for ps in payment_schedules]
        b_data["cost_items"] = [ci.model_dump() for ci in booking.cost_breakdown]
        
        # Include missing relationships
        b_data["customer"] = booking.customer.model_dump() if booking.customer else None
        b_data["lead"] = booking.lead.model_dump() if booking.lead else None
        b_data["created_by"] = booking.created_by.model_dump() if booking.created_by else None

        b_data["unit"] = booking.unit.model_dump() if booking.unit else None
        if b_data["unit"] and booking.unit.floor:
            b_data["unit"]["floor"] = booking.unit.floor.model_dump()
            if booking.unit.floor.tower:
                b_data["unit"]["floor"]["tower"] = booking.unit.floor.tower.model_dump()
                if booking.unit.floor.tower.project:
                    b_data["unit"]["floor"]["tower"]["project"] = booking.unit.floor.tower.project.model_dump()
        return b_data
    except Exception as e:
        print(f"ERROR: read_booking failed for {booking_id}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{booking_id}/status", response_model=Any)
def update_booking_status(
    booking_id: int,
    status: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update booking status safely. Allowed Statuses from UI: 
    'Accounts Verified', 'Admin Confirmed', 'Cancelled', 'Pending Verification'
    """
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    status_map = {
        "Accounts Verified": BookingStatus.ACCOUNTS_VERIFIED,
        "Admin Confirmed": BookingStatus.ADMIN_CONFIRMED,
        "Cancelled": BookingStatus.CANCELLED,
        "Pending Verification": BookingStatus.PENDING_VERIFICATION,
        "Rejected": BookingStatus.REJECTED
    }
    
    new_status = status_map.get(status)
    if not new_status:
        raise HTTPException(status_code=400, detail="Invalid status mapping.")
        
    old_status = booking.status
    booking.status = new_status
    
    # Audit log
    history = BookingStatusHistory(
        booking_id=booking.id,
        old_status=old_status,
        new_status=new_status,
        changed_by_id=current_user.id
    )
    db.add(history)
    
    # If cancelled, release unit
    if new_status == BookingStatus.CANCELLED or new_status == BookingStatus.REJECTED:
        unit = db.get(Unit, booking.unit_id)
        if unit:
            u_old = unit.status
            unit.status = UnitStatus.AVAILABLE
            db.add(unit)
            
            u_history = UnitStatusHistory(
                unit_id=unit.id,
                old_status=u_old,
                new_status=UnitStatus.AVAILABLE,
                changed_by_id=current_user.id
            )
            db.add(u_history)
            
    # If confirmed, officially mark unit as sold
    if new_status == BookingStatus.ADMIN_CONFIRMED:
        unit = db.get(Unit, booking.unit_id)
        if unit:
            u_old = unit.status
            unit.status = UnitStatus.SOLD
            db.add(unit)
            
            u_history = UnitStatusHistory(
                unit_id=unit.id,
                old_status=u_old,
                new_status=UnitStatus.SOLD,
                changed_by_id=current_user.id
            )
            db.add(u_history)
            
    db.add(booking)
    db.commit()
    
    # --- Lifecycle Notifications ---
    from app.services.notifications import create_notification
    from app.models.models import NotificationType, Unit
    
    # Pre-fetch unit for notification details if not already fetched
    unit = db.get(Unit, booking.unit_id)
    unit_num = unit.unit_number if unit else "N/A"

    # 1. Notify Agent about the Update
    agent_msg = f"Your booking (ID: {booking.id}) status has been updated to '{status}'."
    if new_status == BookingStatus.ADMIN_CONFIRMED:
        agent_msg = f"CONGRATULATIONS! Your booking for Unit {unit_num} (ID: {booking.id}) has been FINALIZED and confirmed by Admin."
    elif new_status == BookingStatus.REJECTED:
        agent_msg = f"Booking update: Your booking (ID: {booking.id}) was REJECTED."
    elif new_status == BookingStatus.CANCELLED:
        agent_msg = f"Booking ID: {booking.id} has been successfully CANCELLED and the unit is now available."
        
    create_notification(
        db=db,
        user_id=booking.created_by_id,
        type=NotificationType.BOOKING_UPDATE,
        title="Booking Status Update",
        message=agent_msg,
        related_id=booking.id,
        send_whatsapp=True
    )
    
    # 2. If Accounts Verified, notify Admins for FINAL check
    if new_status == BookingStatus.ACCOUNTS_VERIFIED:
        admins = db.exec(select(User).where(User.role == UserRole.ADMIN)).all()
        for admin in admins:
            create_notification(
                db=db,
                user_id=admin.id,
                type=NotificationType.BOOKING_UPDATE,
                title="Booking Ready for Admin Confirmation",
                message=f"Accounts have verified Booking {booking.id}. Please perform the final confirmation.",
                related_id=booking.id,
                send_whatsapp=False
            )
            
    db.commit()
    
    return {"msg": f"Booking moved to {status}", "booking_id": booking.id}

@router.post("/manual", response_model=Any)
async def create_manual_booking(
    *,
    db: Session = Depends(deps.get_db),
    data: str = Form(...),
    photo: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Manual booking submission with cost calculation and mandatory document photo.
    Calculation: 
    1. Difference = Actual Cost - Agreement Cost
    2. Final Total = Actual Cost + Manual/Other Costs + Difference
    """
    try:
        booking_in_dict = json.loads(data)
        booking_in = ManualBookingCreate(**booking_in_dict)
        
        # 1. Check if unit is available
        unit = db.get(Unit, booking_in.unit_id)
        if not unit:
            raise HTTPException(status_code=404, detail="Unit not found")
        if unit.status != UnitStatus.AVAILABLE:
            raise HTTPException(status_code=400, detail=f"Unit is in {unit.status} status and cannot be booked.")

        # 2. Save Mandatory Photo
        file_ext = os.path.splitext(photo.filename)[1]
        photo_filename = f"booking_form_{uuid.uuid4()}{file_ext}"
        photo_path = os.path.join(UPLOAD_DIR, photo_filename)
        with open(photo_path, "wb") as f:
            f.write(await photo.read())

        # 3. Get or create Customer
        # Use both phone and name to ensure we don't accidentally merge different people 
        # using the same contact number (e.g. brokers or office phones)
        statement = select(Customer).where(
            Customer.phone == booking_in.phone,
            Customer.full_name == booking_in.full_name
        )
        customer = db.exec(statement).first()
        
        # Fallback to email search only if it's a real-looking email (no placeholder)
        if not customer and booking_in.email and "@placeholder.com" not in booking_in.email:
            customer = db.exec(select(Customer).where(Customer.email == booking_in.email)).first()
        
        if not customer:
            customer = Customer(
                full_name=booking_in.full_name,
                email=booking_in.email,
                phone=booking_in.phone,
                pan_number=booking_in.pan_number,
                aadhaar_number=booking_in.aadhaar_number,
                address=booking_in.address
            )
            db.add(customer)
            db.flush()
        else:
            # Update details without violating uniqueness of the other record
            # (e.g. if we found it by phone, but it had no email, we update email)
            if not customer.email and booking_in.email: customer.email = booking_in.email
            if not customer.phone and booking_in.phone: customer.phone = booking_in.phone
            if booking_in.address: customer.address = booking_in.address
            if booking_in.pan_number: customer.pan_number = booking_in.pan_number
            if booking_in.aadhaar_number: customer.aadhaar_number = booking_in.aadhaar_number
            db.add(customer)

        # 4. Mandatory Calculations (System Hidden Difference)
        cost_diff = booking_in.actual_cost - booking_in.agreement_cost
        
        # User Logic: actual + all other cost + difference
        final_total = booking_in.actual_cost + booking_in.other_costs + cost_diff

        # 5. Create Booking
        booking = Booking(
            unit_id=booking_in.unit_id,
            customer_id=customer.id,
            lead_id=booking_in.lead_id,
            
            # Costs
            agreement_cost=booking_in.agreement_cost,
            actual_cost=booking_in.actual_cost,
            other_costs=booking_in.other_costs,
            total_cost=booking_in.total_cost, # provided by UI for sanity
            final_total_cost=final_total,
            
            bank_loan_amount=booking_in.bank_loan_amount or 0.0,
            own_contribution_amount=booking_in.own_contribution_amount or 0.0,
            booking_form_photo=photo_path,
            
            created_by_id=current_user.id,
            status=BookingStatus.PENDING_VERIFICATION 
        )
        db.add(booking)
        db.flush()

        # 6. Add Co-Applicants
        if booking_in.co_applicants:
            for co_in in booking_in.co_applicants:
                co = CoApplicant(
                    booking_id=booking.id,
                    full_name=co_in.full_name,
                    phone=co_in.phone,
                    email=co_in.email,
                    pan_number=co_in.pan_number,
                    aadhaar_number=co_in.aadhaar_number,
                    address=co_in.address
                )
                db.add(co)

        # 7. Add Cost Items (Details)
        if booking_in.cost_items:
            for cost_in in booking_in.cost_items:
                cost_item = BookingCostItem(
                    booking_id=booking.id,
                    name=cost_in.name,
                    amount=cost_in.amount,
                    description=cost_in.description
                )
                db.add(cost_item)

        # 8. Add Payment Milestones
        if booking_in.payment_milestones:
            for ms_in in booking_in.payment_milestones:
                ps = PaymentSchedule(
                    booking_id=booking.id,
                    milestone=ms_in.milestone,
                    amount=ms_in.amount,
                    due_date=ms_in.due_date
                )
                db.add(ps)

        # 9. Update Unit Status to BLOCKED
        old_status = unit.status
        unit.status = UnitStatus.BLOCKED 
        db.add(unit)

        history = UnitStatusHistory(
            unit_id=unit.id,
            old_status=old_status,
            new_status=UnitStatus.BLOCKED,
            changed_by_id=current_user.id
        )
        db.add(history)

        # 10. Update Lead if applicable
        if booking_in.lead_id:
            lead = db.get(Lead, booking_in.lead_id)
            if lead:
                lead.status = LeadStatus.QUALIFIED
                db.add(lead)

        db.commit()
        
        # 11. Send Notifications to Admins and the initiating employee
        from app.services.notifications import create_notification
        from app.models.models import NotificationType
        
        # Notify Admins
        admins = db.exec(select(User).where(User.role == UserRole.ADMIN)).all()
        for admin in admins:
            create_notification(
                db=db,
                user_id=admin.id,
                type=NotificationType.BOOKING_CREATED,
                title="New Booking Alert",
                message=f"New booking for Unit {unit.unit_number} by {customer.full_name} for ₹{final_total:,.2f}",
                send_whatsapp=True
            )
            
        # Notify the employee who created the booking
        create_notification(
            db=db,
            user_id=current_user.id,
            type=NotificationType.BOOKING_CREATED,
            title="Booking Confirmed",
            message=f"You successfully booked Unit {unit.unit_number} for {customer.full_name}.",
            send_whatsapp=True
        )

        # 12. Notify the Customer/Lead directly via WhatsApp (Non-blocking)
        from app.services.whatsapp import send_whatsapp_notification
        import asyncio
        if customer.phone:
            msg = f"Congratulations {customer.full_name}! Your booking for Unit {unit.unit_number} has been confirmed with Jay Developers. We have received your preliminary documentation. Welcome aboard!"
            asyncio.create_task(send_whatsapp_notification(customer.phone, msg))
            
        return {"msg": "Booking created successfully.", "booking_id": booking.id}
    except Exception as e:
        db.rollback()
        print("MANUAL BOOKING CRASH:")
        print(traceback.format_exc())
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Settlement Engine Error: {str(e)}")

@router.post("/{booking_id}/upload-document", response_model=Any)
async def upload_booking_document(
    booking_id: int,
    type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Upload Aadhaar, PAN, Photo, Cancelled check, etc.
    """
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    file_ext = os.path.splitext(file.filename)[1]
    file_name = f"{booking_id}_{type}_{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
    
    doc = BookingDocument(
        booking_id=booking_id,
        type=type,
        file_path=file_path,
        uploaded_by_id=current_user.id
    )
    db.add(doc)
    db.commit()
    
    return {"msg": f"{type} uploaded successfully", "file_path": file_path}

@router.get("/{booking_id}/cost-sheet", response_model=Any)
def get_cost_sheet(
    booking_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Generate instant cost sheet data.
    """
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    cost_items = db.exec(select(BookingCostItem).where(BookingCostItem.booking_id == booking_id)).all()
    unit = booking.unit
    
    return {
        "unit_number": unit.unit_number,
        "base_cost": booking.total_cost,
        "additional_costs": cost_items,
        "grand_total": booking.total_cost + sum(item.amount for item in cost_items),
        "customer": booking.customer.full_name,
        "date": booking.created_at
    }
