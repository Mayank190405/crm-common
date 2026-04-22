import asyncio
import json
import redis.asyncio as redis
from typing import Dict, List
from fastapi import WebSocket
from app.core.config import settings

class ConnectionManager:
    def __init__(self):
        # user_id -> list of active websockets on THIS instance
        self.active_connections: Dict[int, List[WebSocket]] = {}
        self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        self.pubsub_task = None

    async def connect(self, websocket: WebSocket, user_id: int):
        # Enforce Connection Limits
        current_connections = sum(len(conns) for conns in self.active_connections.values())
        if current_connections >= settings.WS_MAX_CLIENTS:
            await websocket.close(code=1013) # Try again later
            return

        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        
        # Start Pub/Sub listener if not already running
        if self.pubsub_task is None:
            self.pubsub_task = asyncio.create_task(self._listen_to_redis())

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def broadcast_to_user(self, user_id: int, message: dict):
        """
        Public API to send a message. Instead of sending directly,
        it publishes to Redis so all pods can see it.
        """
        payload = json.dumps({
            "user_id": user_id,
            "message": message
        })
        await self.redis_client.publish("crm_notifications", payload)

    async def _listen_to_redis(self):
        """
        Continuously listen for notifications on the Redis channel
        and route them to the correct local connections.
        """
        pubsub = self.redis_client.pubsub()
        await pubsub.subscribe("crm_notifications")
        
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    user_id = data.get("user_id")
                    actual_msg = data.get("message")
                    
                    # If this pod has connections for this user, send the message
                    if user_id in self.active_connections:
                        for connection in self.active_connections[user_id]:
                            try:
                                await connection.send_json(actual_msg)
                            except Exception:
                                pass
        except Exception as e:
            print(f"Redis PubSub Error: {e}")
        finally:
            await pubsub.unsubscribe("crm_notifications")

manager = ConnectionManager()
