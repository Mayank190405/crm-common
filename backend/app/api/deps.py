from typing import Generator, Optional, List
from fastapi import Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlmodel import Session, select

from app.core import security
from app.core.config import settings
from app.db.session import get_session
from app.models.models import User, UserRole
from app.schemas.schemas import TokenData

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login/access-token",
    auto_error=False
)

from app.db.session import engine

def get_db() -> Generator:
    with Session(engine) as session:
        yield session

def get_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(reusable_oauth2),
    query_token: Optional[str] = Query(None, alias="token")
) -> User:
    final_token = token or query_token
    
    if not final_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
        
    try:
        payload = jwt.decode(
            final_token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenData(**payload)
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    statement = select(User).where(User.email == token_data.sub)
    user = db.exec(statement).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# --- Strict Role Dependencies ---

def check_admin(user: User = Depends(get_current_active_user)):
    if user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def check_accounts(user: User = Depends(get_current_active_user)):
    if user.role not in [UserRole.ADMIN, UserRole.ACCOUNTS]:
        raise HTTPException(status_code=403, detail="Accounts access required")
    return user

def check_sales(user: User = Depends(get_current_active_user)):
    if user.role not in [UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.SALES_AGENT]:
        raise HTTPException(status_code=403, detail="Sales access required")
    return user

def check_telecaller(user: User = Depends(get_current_active_user)):
    if user.role not in [UserRole.ADMIN, UserRole.TELECALLER, UserRole.SALES_MANAGER]:
        raise HTTPException(status_code=403, detail="Telecaller/Manager access required")
    return user

class RoleRequirement:
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_active_user)):
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not authorized for this role",
            )
        return user

# --- Permission-Based Dependencies ---

class PermissionRequirement:
    def __init__(self, permission_key: str):
        self.permission_key = permission_key

    def __call__(self, user: User = Depends(get_current_active_user)):
        # Admin/Super Admin bypass
        if user.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
            return user
            
        # Check permissions dict
        if not user.permissions or not user.permissions.get(self.permission_key):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Missing {self.permission_key} permission"
            )
        return user

check_access_leads = PermissionRequirement("access_leads")
check_access_inventory = PermissionRequirement("access_inventory")
check_access_bookings = PermissionRequirement("access_bookings")
check_access_financials = PermissionRequirement("access_financials")
check_access_reports = PermissionRequirement("access_reports")
check_access_settings = PermissionRequirement("access_settings")
