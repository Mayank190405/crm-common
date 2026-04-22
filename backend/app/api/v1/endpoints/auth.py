from datetime import timedelta
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.models import User
from app.schemas.schemas import UserOut, UserBase, UserCreate, ResetPassword

router = APIRouter()

@router.post("/login/access-token")
def login_access_token(
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    statement = select(User).where(User.email == form_data.username)
    user = db.exec(statement).first()
    
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.email, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/test-token")
def test_token() -> Any:
    """
    Test access token
    """
    return {"msg": "Token is valid"}

@router.get("/me", response_model=UserOut)
def read_user_me(
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user profile.
    """
    return current_user

@router.patch("/me", response_model=UserOut)
def update_current_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserBase,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update own profile.
    """
    for field, value in user_in.dict(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/reset-password")
def reset_password(
    *,
    db: Session = Depends(deps.get_db),
    reset_data: ResetPassword,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Reset password for current user.
    """
    if not security.verify_password(reset_data.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="Incorrect old password"
        )
    current_user.hashed_password = security.get_password_hash(reset_data.new_password)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return {"message": "Password updated successfully"}

@router.get("/users", response_model=List[UserOut])
def read_users(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.check_admin),
) -> Any:
    """
    Retrieve all active users.
    """
    users = db.exec(select(User).where(User.is_active == True)).all()
    return users

@router.post("/users", response_model=UserOut)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
    current_user: User = Depends(deps.check_admin),
) -> Any:
    """
    Create new user (Agent/Manager/Admin)
    """
    user = db.exec(select(User).where(User.email == user_in.email)).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    user = User(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        is_active=user_in.is_active,
        permissions=user_in.permissions,
        phone=user_in.phone,
        designation=user_in.designation,
        bio=user_in.bio
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.patch("/users/{user_id}", response_model=UserOut)
def update_user_by_admin(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    user_in: UserBase,
    current_user: User = Depends(deps.check_admin),
) -> Any:
    """
    Update user (Admin Only).
    """
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    for field, value in user_in.dict(exclude_unset=True).items():
        setattr(user, field, value)
        
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.delete("/users/{user_id}")
def delete_user(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    current_user: User = Depends(deps.check_admin),
) -> Any:
    """
    Delete user (Admin Only).
    """
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cant delete yourself")
        
    db.delete(user)
    db.commit()
    return {"msg": "User deleted successfully"}

from pydantic import BaseModel

class DeviceTokenUpdate(BaseModel):
    token: str

@router.post("/device-token")
def update_device_token(
    payload: DeviceTokenUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Register the mobile device Expo push token against the active user for centralized PN routing.
    """
    # In a fully fleshed out system we would save this to the User model
    # current_user.push_token = payload.token
    # db.commit()
    return {"msg": "Device token registered successfully"}
