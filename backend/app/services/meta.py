import httpx
import logging
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

async def get_facebook_lead_details(leadgen_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetches lead details from Facebook Graph API using the leadgen_id.
    """
    url = f"https://graph.facebook.com/{settings.META_API_VERSION}/{leadgen_id}"
    params = {
        "access_token": settings.META_ACCESS_TOKEN
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Map lead fields
            # Field data is usually in 'field_data' as a list of {name, values}
            lead_info = {
                "first_name": "Meta",
                "last_name": "Lead",
                "email": None,
                "phone": None,
                "meta_data": data
            }
            
            if "field_data" in data:
                for field in data["field_data"]:
                    name = field.get("name")
                    values = field.get("values", [])
                    if not values:
                        continue
                    
                    val = values[0]
                    if name in ["full_name", "name"]:
                        parts = val.split(" ", 1)
                        lead_info["first_name"] = parts[0]
                        if len(parts) > 1:
                            lead_info["last_name"] = parts[1]
                    elif name == "first_name":
                        lead_info["first_name"] = val
                    elif name == "last_name":
                        lead_info["last_name"] = val
                    elif name == "email":
                        lead_info["email"] = val
                    elif name in ["phone_number", "phone"]:
                        lead_info["phone"] = val
            
            return lead_info
            
    except httpx.HTTPStatusError as e:
        logger.error(f"Meta API error: {e.response.text}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error fetching Meta lead: {str(e)}")
        return None
