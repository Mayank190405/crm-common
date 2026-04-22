import asyncio
from app.services.whatsapp import send_whatsapp_notification
import logging

logging.basicConfig(level=logging.INFO)

async def test():
    phone = "9011060943"
    message = "Test WhatsApp Notification from JD-CRM System"
    print(f"Sending test WhatsApp to {phone}...")
    success = await send_whatsapp_notification(phone, message)
    if success:
        print("✅ SUCCESS: WhatsApp sent!")
    else:
        print("❌ FAILED: Check logs.")

if __name__ == "__main__":
    asyncio.run(test())
