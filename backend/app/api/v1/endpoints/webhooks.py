from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, Request, BackgroundTasks
from sqlmodel import Session, select
from app.api import deps
from app.core.config import settings
from app.models.models import Lead, LeadSource, LeadAssignmentHistory
from app.services.meta import get_facebook_lead_details
from app.api.v1.endpoints.leads import normalize_phone
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/meta")
def verify_meta_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
) -> Any:
    """
    Handles Meta's verification challenge.
    """
    if hub_mode == "subscribe" and hub_verify_token == settings.META_VERIFY_TOKEN:
        logger.info("Meta Webhook verified successfully!")
        return int(hub_challenge)
    
    logger.error("Meta Webhook verification failed.")
    raise HTTPException(status_code=403, detail="Verification token mismatch")

async def process_meta_lead(leadgen_id: str):
    """
    Background task to fetch lead details and save to database.
    """
    from app.db.session import engine
    from sqlmodel import Session
    
    with Session(engine) as db:
        try:
            lead_data = await get_facebook_lead_details(leadgen_id)
            if not lead_data:
                logger.error(f"Could not retrieve details for leadgen_id: {leadgen_id}")
                return
                
            # 1. Normalize and Deduplicate (Similar to leads.py)
            phone = None
            if lead_data.get("phone"):
                try:
                    phone = normalize_phone(lead_data["phone"])
                except:
                    logger.warning(f"Invalid phone from Meta: {lead_data['phone']}")
                    
            email = lead_data.get("email", "").lower().strip() if lead_data.get("email") else None
            
            # 2. Check existing
            existing = None
            if phone:
                existing = db.exec(select(Lead).where(Lead.phone == phone)).first()
            
            if not existing and email:
                existing = db.exec(select(Lead).where(Lead.email == email)).first()
                
            if existing:
                logger.info(f"Duplicate lead from Meta skipped: {phone} / {email}")
                return
                
            # 3. Find or Create Facebook source
            source = db.exec(select(LeadSource).where(LeadSource.name.ilike("Facebook"))).first()
            if not source:
                source = LeadSource(name="Facebook", campaign_name="Meta Ad Manager")
                db.add(source)
                db.commit()
                db.refresh(source)
                
            # 4. Create Lead
            new_lead = Lead(
                first_name=lead_data["first_name"],
                last_name=lead_data["last_name"],
                email=email,
                phone=phone,
                source_id=source.id,
                status="new"
            )
            db.add(new_lead)
            db.commit()
            db.refresh(new_lead)
            
            logger.info(f"Processed new lead from Meta: {new_lead.id} ({new_lead.first_name})")
            
        except Exception as e:
            logger.error(f"Error processing Meta lead: {str(e)}")

@router.post("/meta")
async def handle_meta_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Handles incoming notifications from Meta.
    """
    payload = await request.json()
    logger.info(f"Incoming Meta payload: {payload}")
    
    # Check for leadgen data
    # Structure is usually: object='page', entry=[{changes: [{value: {leadgen_id: ...}}]}]
    if payload.get("object") == "page":
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                if change.get("field") == "leadgen":
                    leadgen_id = change.get("value", {}).get("leadgen_id")
                    if leadgen_id:
                        # Process asynchronous details retrieval
                        background_tasks.add_task(process_meta_lead, leadgen_id)
                        
    return {"status": "received"}
