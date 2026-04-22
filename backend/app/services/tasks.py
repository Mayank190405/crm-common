from datetime import datetime, timedelta, timezone
from sqlmodel import Session, select
from app.db.session import engine
from app.models.models import (
    Unit, UnitStatus, Activity, User, NotificationType, Lead, 
    UserRole, PaymentSchedule, Booking
)
from app.services.notifications import create_notification
import asyncio

def release_expired_blocks():
    """
    Scans for units whose block expiry has passed and returns them to AVAILABLE.
    """
    with Session(engine) as session:
        now = datetime.now(timezone.utc)
        statement = select(Unit).where(
            Unit.status == UnitStatus.BLOCKED,
            Unit.blocked_until < now
        )
        expired_units = session.exec(statement).all()
        
        for unit in expired_units:
            unit.status = UnitStatus.AVAILABLE
            unit.blocked_until = None
            session.add(unit)
            print(f"[{datetime.now(timezone.utc)}] Background Worker: Released expired block for Unit: {unit.unit_number}")
            
        session.commit()

async def process_followup_reminders():
    """
    Checks for upcoming follow-ups and sends WhatsApp notifications.
    Patterns: 24h, 5h, 5m, on-time
    """
    with Session(engine) as session:
        now = datetime.now(timezone.utc)
        # Fetch all incomplete activities with follow-up time
        statement = select(Activity).where(
            Activity.is_completed == False,
            Activity.follow_up_at != None,
            Activity.follow_up_at >= now - timedelta(hours=24) # Process missed stuff from last 24h
        )
        activities = session.exec(statement).all()
        
        for act in activities:
            due = act.follow_up_at
            if due and due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
            
            diff = due - now
            diff_seconds = diff.total_seconds()
            
            should_notify = False
            label = ""
            flag_attr = ""
            
            # 24 Hours Before (within 1 hour window)
            if 23*3600 <= diff_seconds <= 24*3600 and not act.notified_24h:
                should_notify, label, flag_attr = True, "24 hours", "notified_24h"
            # 5 Hours Before
            elif 4.5*3600 <= diff_seconds <= 5*3600 and not act.notified_5h:
                should_notify, label, flag_attr = True, "5 hours", "notified_5h"
            # 5 Minutes Before (within 10-min window)
            elif 0 <= diff_seconds <= 10*60 and not act.notified_5m:
                should_notify, label, flag_attr = True, "5 minutes", "notified_5m"
            # On Time (within 10 min window to catch up if server was busy)
            elif -600 <= diff_seconds <= 60 and not act.notified_ontime:
                should_notify, label, flag_attr = True, "NOW", "notified_ontime"
                
            if should_notify:
                setattr(act, flag_attr, True)
                session.add(act)
                
                # Custom label for Site Visit type (3)
                final_label = f"SITE VISIT: {label}" if act.activity_type_id == 3 else label
                
                # Send notification
                create_notification(
                    db=session,
                    user_id=act.user_id,
                    type=NotificationType.ACTIVITY_REMINDER,
                    title=f"Reminder: {final_label} to Follow-up",
                    message=f"Follow-up for lead (ID: {act.lead_id}) is due in {label}. Note: {act.note[:50]}...",
                    send_whatsapp=True
                )
        
        session.commit()

async def process_payment_reminders():
    """
    Scans for upcoming payment milestones and notifies accounts and relevant sales agents.
    Triggers at 3 days before and on the due date.
    """
    with Session(engine) as session:
        now = datetime.now(timezone.utc)
        three_days_later = now + timedelta(days=3)
        
        statement = select(PaymentSchedule).where(
            PaymentSchedule.is_paid == False,
            PaymentSchedule.due_date <= three_days_later,
            PaymentSchedule.due_date >= now - timedelta(days=30) # Only recent/upcoming
        )
        schedules = session.exec(statement).all()
        
        for sch in schedules:
            # Simple deduplication: Only notify once per day
            if sch.last_notification_sent and (now - sch.last_notification_sent) < timedelta(hours=24):
                continue
                
            booking = session.get(Booking, sch.booking_id)
            if not booking: continue
            
            # 1. Notify Sales Agent
            create_notification(
                db=session,
                user_id=booking.created_by_id,
                type=NotificationType.PAYMENT_DUE,
                title="Payment Milestone Approaching",
                message=f"Payment for {sch.milestone} (₹{sch.amount:,.2f}) for Booking {booking.id} is due soon/today.",
                related_id=booking.id,
                send_whatsapp=True
            )
            
            # 2. Notify Accounts
            accounts_users = session.exec(select(User).where(User.role == UserRole.ACCOUNTS)).all()
            for accounts_user in accounts_users:
                 create_notification(
                    db=session,
                    user_id=accounts_user.id,
                    type=NotificationType.PAYMENT_DUE,
                    title="Awaiting Payment",
                    message=f"Milestone {sch.milestone} for Booking {booking.id} is unpaid. Due: {sch.due_date.strftime('%Y-%m-%d')}",
                    related_id=booking.id,
                    send_whatsapp=False # Admins get system notif, agent gets WhatsApp
                )
                
            sch.last_notification_sent = now
            session.add(sch)
            
        session.commit()

async def notify_unassigned_leads():
    """
    Periodically reminds Admins and Telecallers about unassigned leads.
    """
    with Session(engine) as session:
        statement = select(Lead).where(Lead.assigned_to_id == None)
        unassigned_leads = session.exec(statement).all()
        
        if len(unassigned_leads) > 0:
            # Notify admins and telecallers
            target_users = session.exec(select(User).where(
                (User.role == UserRole.ADMIN) | (User.role == UserRole.TELECALLER) | (User.role == UserRole.SUPER_ADMIN)
            )).all()
            
            for user in target_users:
                create_notification(
                    db=session,
                    user_id=user.id,
                    type=NotificationType.LEAD_ASSIGNED,
                    title="Unassigned Leads Pending",
                    message=f"There are {len(unassigned_leads)} leads waiting to be assigned to sales executives.",
                    send_whatsapp=True
                )
        session.commit()