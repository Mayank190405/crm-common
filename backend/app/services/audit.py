from typing import Dict, Any
from sqlmodel import Session
from app.models.models import AuditLog
from datetime import datetime

def log_event(
    db: Session,
    user_id: int,
    action: str,
    target_table: str,
    target_id: int,
    payload: Dict[str, Any] = None
):
    """
    Utility to record audit logs for critical operations.
    """
    log = AuditLog(
        user_id=user_id,
        action=action,
        target_table=target_table,
        target_id=target_id,
        payload=payload,
        created_at=datetime.utcnow()
    )
    db.add(log)
    db.commit()
