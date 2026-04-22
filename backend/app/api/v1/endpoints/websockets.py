from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlmodel import Session, select
from app.services.websocket import manager
from app.api import deps
from jose import jwt
from app.core import security
from app.core.config import settings
from app.models.models import User

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    """
    WebSocket endpoint for real-time notifications.
    """
    if not token:
        await websocket.close(code=1008)
        return

    try:
        # Debug: Print received token info (safe parts)
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        email = payload.get("sub")
        if not email:
            await websocket.close(code=1008)
            return
            
        with Session(deps.engine) as db:
            user = db.exec(select(User).where(User.email == email)).first()
            if not user:
                await websocket.close(code=1008)
                return
            user_id_int = user.id
    except Exception as e:
        # If there's an error, it's likely auth failed
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, user_id_int)
    try:
        while True:
            # Keep connection alive & handle incoming pings if any
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id_int)
    except Exception:
        manager.disconnect(websocket, user_id_int)

