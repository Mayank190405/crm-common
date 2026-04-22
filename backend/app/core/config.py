from typing import List, Union, Optional
from pydantic import AnyHttpUrl, validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Krads Real Estate CRM"
    
    # CORS
    BACKEND_CORS_ORIGINS: Union[List[str], str] = []

    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str):
            if not v:
                return []
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    # Database
    POSTGRES_SERVER: str = "db"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "app"
    SQLALCHEMY_DATABASE_URI: str = None

    @validator("SQLALCHEMY_DATABASE_URI", pre=True)
    def assemble_db_connection(cls, v: str, values: dict) -> str:
        if isinstance(v, str):
            return v
        from urllib.parse import quote_plus
        user = values.get('POSTGRES_USER')
        password = quote_plus(str(values.get('POSTGRES_PASSWORD')))
        server = values.get('POSTGRES_SERVER')
        db = values.get('POSTGRES_DB')
        return f"postgresql://{user}:{password}@{server}/{db}"

    # JWT - Hardened for Production
    SECRET_KEY: str = "YOUR_SECRET_KEY_KEEP_IT_SAFE"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 4  # Reduced from 8 days to 4 hours

    # Platform Hardening
    USE_S3: bool = False
    S3_BUCKET: str = "krads-crm-docs"
    REDIS_URL: str = "redis://localhost:6379/0"
    USE_CELERY: bool = False
    SENTRY_DSN: Optional[str] = None
    WS_HEARTBEAT_SEC: int = 30
    WS_MAX_CLIENTS: int = 5000  # Hard limit per pod to prevent FD exhaustion

    # Meta API (Facebook Lead Ads)
    META_VERIFY_TOKEN: str = "your_fb_verify_token"
    META_ACCESS_TOKEN: str = "your_page_or_system_user_token"
    META_APP_SECRET: Optional[str] = None
    META_API_VERSION: str = "v21.0"

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
