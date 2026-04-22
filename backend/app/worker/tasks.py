from app.core.celery_app import celery_app
from app.services.websocket import manager
import asyncio
import logging
from datetime import datetime
from sqlalchemy import select

@celery_app.task(name="reconcile_inventory")
def reconcile_inventory():
    """
    Periodic task to clear expired blocks and reconcile unit statuses.
    Ensures that inventory is always accurate.
    """
    # Import inside to avoid circular deps with session
    from app.db.session import SessionLocal
    from app.models.models import Unit, UnitStatus
    
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        # Find units that are BLOCKED but past their expiry
        statement = select(Unit).where(
            Unit.status == UnitStatus.BLOCKED,
            Unit.blocked_until < now
        )
        expired_units = db.execute(statement).scalars().all()
        
        for unit in expired_units:
            unit.status = UnitStatus.AVAILABLE
            unit.blocked_until = None
            db.add(unit)
            logging.info(f"Reconciled Unit {unit.unit_number}: Released expired block.")
        
        db.commit()
    except Exception as e:
        logging.error(f"Inventory reconciliation failed: {e}")
        db.rollback()
    finally:
        db.close()

@celery_app.task(name="process_document_metadata")
def process_document_metadata(document_id: int):
    """
    Placeholder for background document processing
    """
    logging.info(f"Processing metadata for document {document_id}")
    pass
