from datetime import datetime, timedelta
from typing import Any, Union
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# --- Rate Limiting Protection ---
import redis.asyncio as redis
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limit: int = 100, window: int = 60):
        super().__init__(app)
        self.redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
        self.limit = limit
        self.window = window

    async def dispatch(self, request: Request, call_next):
        # Skip internal/vital paths
        if request.url.path in ["/health", "/metrics"]:
            return await call_next(request)

        client_ip = request.client.host
        key = f"rate_limit:{client_ip}:{request.url.path}"

        try:
            current = await self.redis.incr(key)
            if current == 1:
                await self.redis.expire(key, self.window)
            
            if current > self.limit:
                raise HTTPException(status_code=429, detail="API rate limit exceeded")
        except HTTPException as e:
            raise e
        except Exception:
            pass # Fail-Safe: Allow traffic if Redis is down

        return await call_next(request)
