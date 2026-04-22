import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# AutomateX Config
API_URL = "https://automatexindia.com/api/v1/whatsapp/send/template"
API_TOKEN = "12805|VsCD837x8ffV5d1TL2MRgjkLka1NtsE9hQNgMayo479bc925"
PHONE_NUMBER_ID = "642271775644817"
TEMPLATE_ID = "295437"

async def send_whatsapp_notification(phone: str, message: str) -> bool:
    """
    Sends a WhatsApp template notification via AutomateX.
    Pattern mapping: template_id=295437 with variable-notification-1
    """
    if not phone:
        return False
        
    # Standardize phone (remove +, ensure 10-12 digits)
    clean_phone = "".join(filter(str.isdigit, phone))
    if len(clean_phone) == 10:
        clean_phone = "91" + clean_phone
        
    data = {
        "apiToken": API_TOKEN,
        "phone_number_id": PHONE_NUMBER_ID,
        "template_id": TEMPLATE_ID,
        "templateVariable-notification-1": message,
        "phone_number": clean_phone
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(API_URL, data=data, timeout=10.0)
            if response.status_code == 200:
                logger.info(f"WhatsApp sent to {clean_phone}")
                return True
            else:
                logger.error(f"WhatsApp failed: {response.text}")
                return False
    except Exception as e:
        logger.error(f"WhatsApp exception: {str(e)}")
        return False
