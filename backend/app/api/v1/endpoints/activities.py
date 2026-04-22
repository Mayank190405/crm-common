from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timedelta
from sqlmodel import Session, select, or_
from app.api import deps
from app.models.models import Activity, User, UserRole, Lead

from app.schemas.schemas import ActivityCreate, ActivityOut

router = APIRouter()

@router.get("", response_model=List[ActivityOut])
def read_activities(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    range: Optional[str] = Query(None), # 'upcoming', 'past'
    user_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve activities with optional range (upcoming/past) and user filters.
    """
    statement = select(Activity)
    
    # 1. User Filter & RBAC
    if user_id:
        # Only managers/admins can see other users' tasks
        allowed_audit_roles = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SALES_MANAGER]
        if current_user.role not in allowed_audit_roles and user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to see other users' tasks")
        statement = statement.where(Activity.user_id == user_id)
    elif current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SALES_MANAGER, UserRole.TELECALLER]:
        # Agents only see themselves
        statement = statement.where(Activity.user_id == current_user.id)

    # 2. Date Ranges
    now = datetime.utcnow()
    if range == "upcoming":
        # Follow-ups due in the next 24 hours, not completed
        statement = statement.where(
            Activity.follow_up_at >= now,
            Activity.follow_up_at <= now + timedelta(hours=24),
            Activity.is_completed == False
        ).order_by(Activity.follow_up_at.asc())
    elif range == "past":
        # Completed tasks in the last 90 days
        statement = statement.where(
            Activity.is_completed == True,
            Activity.completed_at >= now - timedelta(days=90)
        ).order_by(Activity.completed_at.desc())
    else:
        statement = statement.order_by(Activity.created_at.desc())
        
    activities = db.exec(statement.offset(skip).limit(limit)).all()
    return activities

@router.patch("/{id}/complete", response_model=ActivityOut)
def mark_activity_completed(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Mark an activity task as completed.
    """
    activity = db.get(Activity, id)
    if not activity or (activity.user_id != current_user.id and current_user.role != UserRole.ADMIN):
        raise HTTPException(status_code=404, detail="Activity task not found")
        
    activity.is_completed = True
    activity.completed_at = datetime.utcnow()
    db.add(activity)
    db.commit()
    db.refresh(activity)
    
    # Notify employee (self) of the task creation via WhatsApp
    from app.services.notifications import create_notification, NotificationType
    create_notification(
        db=db,
        user_id=current_user.id,
        type=NotificationType.ACTIVITY_REMINDER,
        title="Activity Logged",
        message=f"Interaction logged for lead (ID: {activity.lead_id}). Note: {activity.note[:50]}",
        related_id=activity.id,
        send_whatsapp=True
    )
    
    return activity

@router.put("/{id}", response_model=ActivityOut)
def update_activity(
    id: int,
    activity_in: ActivityCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    activity = db.get(Activity, id)
    if not activity or (activity.user_id != current_user.id and current_user.role != UserRole.ADMIN):
        raise HTTPException(status_code=404, detail="Activity not found")
    
    activity.note = activity_in.note
    activity.activity_type_id = activity_in.activity_type_id
    activity.follow_up_at = activity_in.follow_up_at
    
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity

@router.delete("/{id}")
def delete_activity(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    activity = db.get(Activity, id)
    if not activity or (activity.user_id != current_user.id and current_user.role != UserRole.ADMIN):
        raise HTTPException(status_code=404, detail="Activity not found")
    
    db.delete(activity)
    db.commit()
    return {"status": "success"}

@router.get("/lead/{lead_id}", response_model=List[ActivityOut])
def read_lead_activities(
    *,
    db: Session = Depends(deps.get_db),
    lead_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve activities for a specific lead.
    """
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    # Permission Check
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SALES_MANAGER, UserRole.TELECALLER] and lead.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view activities for this lead")

    activities = db.exec(select(Activity).where(Activity.lead_id == lead_id).order_by(Activity.created_at.desc())).all()
    return activities

import logging
logger = logging.getLogger(__name__)

@router.post("", response_model=ActivityOut)
async def create_activity(
    *,
    db: Session = Depends(deps.get_db),
    activity_in: ActivityCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    try:
        activity = Activity(
            lead_id=activity_in.lead_id,
            activity_type_id=activity_in.activity_type_id,
            note=activity_in.note,
            follow_up_at=activity_in.follow_up_at,
            user_id=current_user.id
        )
        db.add(activity)
        
        # 0. Update Lead Status if provided
        if activity_in.new_status:
            lead = db.get(Lead, activity_in.lead_id)
            if lead:
                lead.status = activity_in.new_status
                db.add(lead)
        
        db.commit()
        db.refresh(activity)

        # 1. WhatsApp Notification to Lead for Site Visits (Type 3)
        if activity.activity_type_id == 3:
            try:
                from app.services.whatsapp import send_whatsapp_notification
                lead = db.get(Lead, activity.lead_id)
                if lead and lead.phone:
                    msg = f"Dear {lead.first_name}, thank you for visiting our project site today. Our team will get in touch with you shortly. - JD Developers"
                    await send_whatsapp_notification(lead.phone, msg)
            except Exception as e:
                logger.error(f"Failed to send site visit WhatsApp: {str(e)}")

        # 2. WhatsApp/System Notification to the User (Internal)
        try:
            from app.services.notifications import create_notification, NotificationType
            create_notification(
                db=db,
                user_id=current_user.id,
                type=NotificationType.ACTIVITY_REMINDER.value,
                title="Interaction Logged",
                message=f"You logged a {activity.activity_type_id} for lead {activity.lead_id}.",
                related_id=activity.id,
                send_whatsapp=True
            )
        except Exception as e:
            logger.error(f"Activity notification failed: {str(e)}")

        return activity

    except Exception as e:
        import traceback
        logger.error(f"CRITICAL ERROR in create_activity: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")