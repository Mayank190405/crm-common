from typing import Optional, List, Dict
from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime, timezone
from app.models.models import UserRole, LeadStatus, UnitStatus, BookingStatus

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.SALES_AGENT
    is_active: bool = True
    permissions: Dict[str, bool] = {}
    phone: Optional[str] = None
    designation: Optional[str] = None
    bio: Optional[str] = None

class UserCreate(UserBase):
    password: str

class ResetPassword(BaseModel):
    old_password: str
    new_password: str

class UserOut(UserBase):
    id: int
    class Config:
        from_attributes = True

class UserBrief(BaseModel):
    id: int
    full_name: str
    role: UserRole
    class Config:
        from_attributes = True

# --- Project/Inventory Schemas ---
class ProjectBrief(BaseModel):
    id: int
    name: str
    location: str
    class Config:
        from_attributes = True

class TowerBrief(BaseModel):
    id: int
    name: str
    project: Optional[ProjectBrief] = None
    class Config:
        from_attributes = True

class FloorBrief(BaseModel):
    id: int
    floor_number: int
    tower: Optional[TowerBrief] = None
    class Config:
        from_attributes = True

class UnitOut(BaseModel):
    id: int
    unit_number: str
    unit_type: Optional[str] = None
    saleable_area: Optional[float] = None
    status: UnitStatus
    blocked_until: Optional[datetime] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    blocked_by: Optional[str] = None
    floor: Optional[FloorBrief] = None
    
    @field_validator("blocked_until", mode="after")
    @classmethod
    def ensure_utc_unit(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    
    class Config:
        from_attributes = True

class FloorOut(BaseModel):
    id: int
    floor_number: int
    units: Optional[List["UnitOut"]] = []
    class Config:
        from_attributes = True

class TowerOut(BaseModel):
    id: int
    name: str
    floors: Optional[List["FloorOut"]] = []
    class Config:
        from_attributes = True

class ProjectOut(BaseModel):
    id: int
    name: str
    location: str
    towers: Optional[List["TowerOut"]] = []
    class Config:
        from_attributes = True

class ProjectCreate(BaseModel):
    name: str
    location: str

class LeadSourceCreate(BaseModel):
    name: str
    campaign_name: Optional[str] = None
    class Config:
        from_attributes = True

# --- Lead Schemas ---
class LeadBase(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: str
    source_id: Optional[int] = None
    project_id: Optional[int] = None
    budget: Optional[float] = None

class LeadCreate(LeadBase):
    assigned_to_id: Optional[int] = None

class LeadUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    status: Optional[str] = None
    assigned_to_id: Optional[int] = None
    project_id: Optional[int] = None
    budget: Optional[float] = None

class LeadOut(LeadBase):
    id: int
    status: str
    created_at: datetime
    assigned_to_id: Optional[int] = None
    assigned_to: Optional[UserBrief] = None
    project_id: Optional[int] = None
    
    @field_validator("created_at", mode="after")
    @classmethod
    def ensure_utc_lead(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    source_ref: Optional[LeadSourceCreate] = None
    project: Optional[ProjectBrief] = None
    next_follow_up_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class LeadStageBase(BaseModel):
    slug: str
    name: str
    color: str = "slate"
    is_active: bool = True
    display_order: int = 0

class LeadStageCreate(LeadStageBase):
    pass

class LeadStageUpdate(BaseModel):
    slug: Optional[str] = None
    name: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None

class LeadStageOut(LeadStageBase):
    id: int
    class Config:
        from_attributes = True

class LeadPagination(BaseModel):
    items: List[LeadOut]
    total: int
    page: int
    size: int
    pages: int

class BulkTransfer(BaseModel):
    from_user_id: int
    to_user_id: int

class BulkAssign(BaseModel):
    lead_ids: List[int]
    to_user_id: int

# --- Activity Schemas ---
class ActivityBase(BaseModel):
    activity_type_id: int
    note: str
    follow_up_at: Optional[datetime] = None

    @field_validator("follow_up_at", mode="after")
    @classmethod
    def ensure_utc_followup(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v

class ActivityCreate(ActivityBase):
    lead_id: int
    new_status: Optional[str] = None

class ActivityOut(ActivityBase):
    id: int
    user_id: int
    created_at: datetime
    is_completed: bool
    completed_at: Optional[datetime] = None
    
    @field_validator("created_at", "completed_at", mode="after")
    @classmethod
    def ensure_utc_activity(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    class Config:
        from_attributes = True

# --- Booking Schemas ---
class BookingBase(BaseModel):
    lead_id: Optional[int] = None
    unit_id: int
    customer_id: int
    agreement_cost: float
    actual_cost: float
    other_costs: float = 0.0
    total_cost: float
    final_total_cost: float
    bank_loan_amount: Optional[float] = 0.0
    own_contribution_amount: Optional[float] = 0.0

class BookingCreate(BookingBase):
    booking_form_photo: Optional[str] = None

class CoApplicantBase(BaseModel):
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None
    address: Optional[str] = None

class CoApplicantCreate(CoApplicantBase):
    pass

class BookingCostItemBase(BaseModel):
    name: str
    amount: float
    description: Optional[str] = None

class BookingCostItemCreate(BookingCostItemBase):
    pass

class PaymentMilestoneBase(BaseModel):
    milestone: str
    amount: float
    due_date: datetime

    @field_validator("due_date", mode="after")
    @classmethod
    def ensure_utc_milestone(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v

class ManualBookingCreate(BaseModel):
    lead_id: Optional[int] = None
    unit_id: int
    
    # Financial Details
    agreement_cost: float
    actual_cost: float
    other_costs: float = 0.0
    total_cost: float
    final_total_cost: float
    
    # Customer Details
    full_name: str
    email: Optional[str] = None
    phone: str
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None
    address: Optional[str] = None
    
    bank_loan_amount: Optional[float] = 0.0
    own_contribution_amount: Optional[float] = 0.0
    co_applicants: Optional[List[CoApplicantCreate]] = []
    cost_items: Optional[List[BookingCostItemCreate]] = []
    payment_milestones: Optional[List[PaymentMilestoneBase]] = []

class CustomerBrief(BaseModel):
    id: int
    full_name: str
    phone: str
    email: str
    class Config:
        from_attributes = True

class BookingOut(BookingBase):
    id: int
    status: BookingStatus
    created_by_id: Optional[int] = None
    created_at: datetime
    
    @field_validator("created_at", mode="after")
    @classmethod
    def ensure_utc_booking(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    
    unit: Optional[UnitOut] = None
    customer: Optional[CustomerBrief] = None
    lead: Optional[LeadOut] = None
    created_by: Optional[UserOut] = None
    
    class Config:
        from_attributes = True

# --- Financial Schemas ---
class PaymentScheduleBase(BaseModel):
    milestone: str
    amount: float
    due_date: datetime

    @field_validator("due_date", mode="after")
    @classmethod
    def ensure_utc_schedule(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v

class PaymentScheduleOut(PaymentScheduleBase):
    id: int
    is_paid: bool
    class Config:
        from_attributes = True

class PaymentBase(BaseModel):
    amount_paid: float
    transaction_reference: str
    payment_mode: str
    payment_schedule_id: Optional[int] = None

class PaymentCreate(PaymentBase):
    booking_id: int

class PaymentOut(PaymentBase):
    id: int
    booking_id: int
    payment_date: datetime
    
    @field_validator("payment_date", mode="after")
    @classmethod
    def ensure_utc_payment(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    verified_by_id: Optional[int] = None
    class Config:
        from_attributes = True

# --- Notification Schemas ---
class NotificationOut(BaseModel):
    id: int
    type: str
    title: str
    message: str
    is_read: bool
    related_id: Optional[int] = None
    created_at: datetime

    @field_validator("created_at", mode="after")
    @classmethod
    def ensure_utc_notif(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    class Config:
        from_attributes = True

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
