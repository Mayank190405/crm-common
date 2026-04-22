from typing import Optional
from sqlmodel import Session
from app.models.models import Notification, NotificationType, User
from app.services.websocket import manager
from app.services.whatsapp import send_whatsapp_notification
import asyncio

def create_notification(
    db: Session,
    user_id: int,
    type: NotificationType,
    title: str,
    message: str,
    related_id: Optional[int] = None,
    send_whatsapp: bool = False
) -> Notification:
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        related_id=related_id
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    # 1. Push to WebSocket
    payload = {
        "id": notification.id,
        "type": str(notification.type),
        "title": notification.title,
        "message": notification.message,
        "related_id": notification.related_id,
        "created_at": notification.created_at.isoformat()
    }
    
    # 2. External Integrations
    try:
        user = db.get(User, user_id)
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # WebSocket Broadcast
            loop.create_task(manager.broadcast_to_user(user_id, payload))
            
            # WhatsApp Notification
            if send_whatsapp and user and user.phone:
                loop.create_task(send_whatsapp_notification(user.phone, f"{title}: {message}"))
        else:
            # Fallback for sync contexts / background tasks
            if send_whatsapp and user and user.phone:
                 asyncio.run(send_whatsapp_notification(user.phone, f"{title}: {message}"))
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Notification System Failure: {str(e)}")
    
    # Final Commit to ensure persistence
    try:
        db.commit()
    except Exception:
        pass
        
    return notification
