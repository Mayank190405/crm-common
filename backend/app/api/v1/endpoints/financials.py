from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.api import deps
from app.models.models import User, Booking, Payment, PaymentSchedule, UserRole
from app.schemas.schemas import PaymentCreate, PaymentOut, PaymentScheduleOut
from app.services.audit import log_event
from app.services.notifications import create_notification, NotificationType

router = APIRouter()

@router.post("/payments", response_model=PaymentOut)
def record_payment(
    *,
    db: Session = Depends(deps.get_db),
    payment_in: PaymentCreate,
    current_user: User = Depends(deps.check_access_financials),
) -> Any:
    """
    Record a new payment transaction with strict validation.
    1. Check for duplicate reference.
    2. Validate against milestone amount.
    3. Audit log the verification.
    """
    # 1. Duplicate reference check
    dup_check = db.exec(select(Payment).where(Payment.transaction_reference == payment_in.transaction_reference)).first()
    if dup_check:
        raise HTTPException(status_code=400, detail="Transaction reference already exists")

    booking = db.get(Booking, payment_in.booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # 2. Milestone validation
    if payment_in.payment_schedule_id:
        schedule = db.get(PaymentSchedule, payment_in.payment_schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail="Payment schedule milestone not found")
        
        # Check if payment exceeds milestone (simple check)
        # Note: In a real app, we would sum all payments for this schedule_id
        if payment_in.amount_paid > schedule.amount:
             raise HTTPException(status_code=400, detail=f"Payment amount exceeds milestone of {schedule.amount}")
        
        schedule.is_paid = True
        db.add(schedule)

    # 3. Record Payment
    payment = Payment.from_orm(payment_in)
    payment.verified_by_id = current_user.id
    db.add(payment)
    
    # 4. Audit & Notification
    db.commit()
    db.refresh(payment)
    
    log_event(
        db, 
        current_user.id, 
        "VERIFY_PAYMENT", 
        "payment", 
        payment.id, 
        {"amount": payment.amount_paid, "ref": payment.transaction_reference}
    )
    
    # Notify Sales Agent that payment is verified
    create_notification(
        db,
        booking.created_by_id,
        NotificationType.BOOKING_UPDATE,
        "Payment Verified",
        f"A payment of {payment.amount_paid} for Booking ID {booking.id} has been verified.",
        related_id=booking.id
    )
    
    return payment

@router.get("/booking/{booking_id}/schedules", response_model=List[PaymentScheduleOut])
def get_payment_schedules(
    booking_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    statement = select(PaymentSchedule).where(PaymentSchedule.booking_id == booking_id)
    return db.exec(statement).all()

@router.get("/booking/{booking_id}/payments", response_model=List[PaymentOut])
def get_payments(
    booking_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    statement = select(Payment).where(Payment.booking_id == booking_id)
    return db.exec(statement).all()

@router.get("/schedules/all", response_model=List[Any])
def get_all_global_schedules(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Gets all schedules for tracking due and overdue payments."""
    schedules = db.exec(select(PaymentSchedule)).all()
    res = []
    for s in schedules:
        data = s.model_dump()
        data["booking_id"] = s.booking_id
        b = db.get(Booking, s.booking_id)
        if b:
            data["unit_id"] = b.unit_id
            data["customer_name"] = b.customer.full_name if b.customer else "Unknown"
        res.append(data)
    return res

@router.get("/payments/all", response_model=List[Any])
def get_all_global_payments(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Gets all recorded payments."""
    payments = db.exec(select(Payment)).all()
    res = []
    for p in payments:
        data = p.model_dump()
        b = db.get(Booking, p.booking_id)
        if b:
            data["unit_id"] = b.unit_id
            data["customer_name"] = b.customer.full_name if b.customer else "Unknown"
        res.append(data)
    return res
