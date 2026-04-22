from enum import Enum
from typing import Optional, List, Dict
from sqlmodel import Field, Session, SQLModel, create_engine, select, Relationship, Index, text
from sqlalchemy import JSON, Column, ForeignKey, Integer
from datetime import datetime, timedelta, timezone
from pydantic import model_validator

# --- Enums ---

class UserRole(str, Enum):
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"
    SALES_MANAGER = "sales_manager"
    SALES_AGENT = "sales_agent"
    TELECALLER = "telecaller"
    ACCOUNTS = "accounts"

class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    CALL_NOT_RECEIVED = "call_not_received"
    QUALIFIED = "qualified"
    LOST = "lost"
    WON = "won"
    SWITCHED_OFF = "switched_off"

class LeadStage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    slug: str = Field(unique=True, index=True)
    name: str = Field(index=True)
    color: str = Field(default="slate") 
    is_active: bool = Field(default=True)
    display_order: int = Field(default=0)

class UnitStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    BLOCKED = "BLOCKED"
    SOLD = "SOLD"

class BookingStatus(str, Enum):
    DRAFT = "draft"
    PENDING_VERIFICATION = "pending_verification"
    ACCOUNTS_VERIFIED = "accounts_verified"
    ADMIN_CONFIRMED = "admin_confirmed"
    HOLD = "hold"
    CANCELLED = "cancelled"
    REJECTED = "rejected"

class NotificationType(str, Enum):
    FOLLOW_UP = "follow_up"
    BOOKING_UPDATE = "booking_update"
    LEAD_ASSIGNED = "lead_assigned"
    PAYMENT_DUE = "payment_due"
    ACTIVITY_REMINDER = "activity_reminder"
    BOOKING_CREATED = "booking_created"

# --- Core Entities ---

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    full_name: str
    hashed_password: str
    role: UserRole = Field(default=UserRole.SALES_AGENT)
    is_active: bool = Field(default=True)
    permissions: Dict[str, bool] = Field(default={}, sa_type=JSON)
    phone: str = Field(index=True)
    designation: Optional[str] = Field(default=None)
    bio: Optional[str] = Field(default=None)
    
    # Relationships
    assigned_leads: List["Lead"] = Relationship(back_populates="assigned_to")
    activities: List["Activity"] = Relationship(back_populates="user")
    created_bookings: List["Booking"] = Relationship(back_populates="created_by")
    audit_logs: List["AuditLog"] = Relationship(back_populates="user")
    notifications: List["Notification"] = Relationship(back_populates="user")

class LeadSource(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str 
    campaign_name: Optional[str] = None
    leads: List["Lead"] = Relationship(back_populates="source_ref")

class Lead(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    first_name: str
    last_name: Optional[str] = Field(default=None)
    email: Optional[str] = Field(default=None, index=True)
    phone: str = Field(index=True)
    status: str = Field(default="new", index=True)
    budget: Optional[float] = Field(default=None)
    
    source_id: Optional[int] = Field(default=None, foreign_key="leadsource.id")
    source_ref: Optional[LeadSource] = Relationship(back_populates="leads")
    
    project_id: Optional[int] = Field(default=None, foreign_key="project.id", index=True)
    project: Optional["Project"] = Relationship(back_populates="leads")
    
    assigned_to_id: Optional[int] = Field(default=None, sa_column=Column(Integer, ForeignKey("user.id", ondelete="SET NULL"), index=True))
    assigned_to: Optional[User] = Relationship(back_populates="assigned_leads")
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)
    
    # Relationships
    activities: List["Activity"] = Relationship(back_populates="lead")
    bookings: List["Booking"] = Relationship(back_populates="lead")
    status_history: List["LeadStatusHistory"] = Relationship(back_populates="lead")
    assignment_history: List["LeadAssignmentHistory"] = Relationship(back_populates="lead")

class LeadStatusHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    lead_id: int = Field(foreign_key="lead.id")
    old_status: LeadStatus
    new_status: LeadStatus
    changed_by_id: int = Field(sa_column=Column(Integer, ForeignKey("user.id", ondelete="SET NULL")))
    changed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    lead: Lead = Relationship(back_populates="status_history")

class LeadAssignmentHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    lead_id: int = Field(foreign_key="lead.id")
    from_user_id: Optional[int] = Field(default=None, sa_column=Column(Integer, ForeignKey("user.id", ondelete="SET NULL")))
    to_user_id: int = Field(sa_column=Column(Integer, ForeignKey("user.id", ondelete="SET NULL")))
    assigned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    lead: Lead = Relationship(back_populates="assignment_history")

class ActivityType(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str 
    activities: List["Activity"] = Relationship(back_populates="activity_type")

class Activity(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    lead_id: int = Field(foreign_key="lead.id", index=True)
    user_id: int = Field(sa_column=Column(Integer, ForeignKey("user.id", ondelete="SET NULL"), index=True))
    activity_type_id: int = Field(foreign_key="activitytype.id")
    note: str
    follow_up_at: Optional[datetime] = Field(default=None, index=True)
    is_completed: bool = Field(default=False, index=True)
    completed_at: Optional[datetime] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)
    
    notified_24h: bool = Field(default=False)
    notified_5h: bool = Field(default=False)
    notified_5m: bool = Field(default=False)
    notified_ontime: bool = Field(default=False)
    
    lead: Lead = Relationship(back_populates="activities")
    user: User = Relationship(back_populates="activities")
    activity_type: ActivityType = Relationship(back_populates="activities")

    @property
    def is_overdue(self) -> bool:
        """Derived property: True if not completed and follow_up_at has passed."""
        if self.is_completed:
            return False
        if not self.follow_up_at:
            return False
        # follow_up_at is Optional[datetime], we check it exists above
        return self.follow_up_at < datetime.now(timezone.utc)

    @model_validator(mode="after")
    def sync_completion_state(self) -> "Activity":
        """Ensures completed_at is set if is_completed=True, and vice versa."""
        if self.is_completed and not self.completed_at:
            self.completed_at = datetime.now(timezone.utc)
        elif not self.is_completed:
            self.completed_at = None
        return self

    # Composite Index for Timeline Performance
    __table_args__ = (
        Index("ix_activity_lead_timeline", "lead_id", "created_at"),
    )

# --- Inventory ---

class Project(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    location: str
    towers: List["Tower"] = Relationship(back_populates="project")
    leads: List["Lead"] = Relationship(back_populates="project")

class Tower(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")
    name: str
    project: Project = Relationship(back_populates="towers")
    floors: List["Floor"] = Relationship(back_populates="tower")

class Floor(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tower_id: int = Field(foreign_key="tower.id")
    floor_number: int
    tower: Tower = Relationship(back_populates="floors")
    units: List["Unit"] = Relationship(back_populates="floor")

class Unit(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    floor_id: int = Field(foreign_key="floor.id")
    unit_number: str
    unit_type: Optional[str] = None # e.g. 2 BHK, 3 BHK
    saleable_area: Optional[float] = None # in sq ft
    status: UnitStatus = Field(default=UnitStatus.AVAILABLE, index=True)
    blocked_until: Optional[datetime] = None
    
    floor: Floor = Relationship(back_populates="units")
    bookings: List["Booking"] = Relationship(back_populates="unit")
    status_history: List["UnitStatusHistory"] = Relationship(back_populates="unit")

    @property
    def customer_name(self):
        active_booking = next((b for b in self.bookings if b.status in [BookingStatus.PENDING_VERIFICATION, BookingStatus.ACCOUNTS_VERIFIED, BookingStatus.ADMIN_CONFIRMED]), None)
        return active_booking.customer.full_name if active_booking and active_booking.customer else None

    @property
    def customer_phone(self):
        active_booking = next((b for b in self.bookings if b.status in [BookingStatus.PENDING_VERIFICATION, BookingStatus.ACCOUNTS_VERIFIED, BookingStatus.ADMIN_CONFIRMED]), None)
        return active_booking.customer.phone if active_booking and active_booking.customer else None

    @property
    def blocked_by(self):
        active_booking = next((b for b in self.bookings if b.status in [BookingStatus.PENDING_VERIFICATION, BookingStatus.ACCOUNTS_VERIFIED, BookingStatus.ADMIN_CONFIRMED]), None)
        return active_booking.created_by.full_name if active_booking and active_booking.created_by else None
class UnitStatusHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    unit_id: int = Field(foreign_key="unit.id")
    old_status: UnitStatus
    new_status: UnitStatus
    changed_by_id: int = Field(sa_column=Column(Integer, ForeignKey("user.id", ondelete="SET NULL")))
    changed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    unit: Unit = Relationship(back_populates="status_history")

# --- Customers & Bookings ---

class Customer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    full_name: str
    email: Optional[str] = Field(default=None, index=True)
    phone: str = Field(index=True)
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None
    address: Optional[str] = None
    profile_photo: Optional[str] = None
    
    bookings: List["Booking"] = Relationship(back_populates="customer")
    documents: List["CustomerDocument"] = Relationship(back_populates="customer")

# --- Inventory Reservation Integrity ---

class CoApplicant(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    booking_id: int = Field(foreign_key="booking.id")
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None
    address: Optional[str] = None
    profile_photo: Optional[str] = None
    
    booking: "Booking" = Relationship(back_populates="co_applicants")

class Booking(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    lead_id: Optional[int] = Field(default=None, foreign_key="lead.id", index=True)
    unit_id: int = Field(foreign_key="unit.id", index=True)
    customer_id: int = Field(foreign_key="customer.id", index=True)
    created_by_id: Optional[int] = Field(default=None, sa_column=Column(Integer, ForeignKey("user.id", ondelete="SET NULL")))
    
    status: BookingStatus = Field(default=BookingStatus.DRAFT, index=True)
    
    # Cost Fields
    agreement_cost: float = Field(default=0.0)
    actual_cost: float = Field(default=0.0)
    other_costs: float = Field(default=0.0)
    total_cost: float = Field(default=0.0)
    final_total_cost: float = Field(default=0.0)
    
    bank_loan_amount: float = Field(default=0.0)
    own_contribution_amount: float = Field(default=0.0)
    
    # Document photo (mandatory before submission)
    booking_form_photo: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)
    
    # Relationships
    lead: Lead = Relationship(back_populates="bookings")
    unit: "Unit" = Relationship(back_populates="bookings")
    customer: Customer = Relationship(back_populates="bookings")
    created_by: User = Relationship(back_populates="created_bookings")
    co_applicants: List[CoApplicant] = Relationship(back_populates="booking")
    cost_breakdown: List["BookingCostItem"] = Relationship(back_populates="booking")
    documents: List["BookingDocument"] = Relationship(back_populates="booking")
    payment_schedules: List["PaymentSchedule"] = Relationship(back_populates="booking")
    status_history: List["BookingStatusHistory"] = Relationship(back_populates="booking")
    payments: List["Payment"] = Relationship(back_populates="booking")

    # DB Constraint: Prevent multiple ACTIVE bookings for the same unit
    # Only one booking can be in 'PENDING_VERIFICATION', 'ACCOUNTS_VERIFIED', or 'ADMIN_CONFIRMED' for a unit at a time.
    # Note: SQLModel Indexing for partial indexes might require raw DDL or specialized Field usage.
    # We will use Index with where clause for PostgreSQL.
    __table_args__ = (
        Index(
            "ix_unique_active_booking_per_unit",
            "unit_id",
            unique=True,
            postgresql_where=text("status IN ('PENDING_VERIFICATION', 'ACCOUNTS_VERIFIED', 'ADMIN_CONFIRMED')")
        ),
    )

class BookingStatusHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    booking_id: int = Field(foreign_key="booking.id")
    old_status: BookingStatus
    new_status: BookingStatus
    changed_by_id: int = Field(sa_column=Column(Integer, ForeignKey("user.id", ondelete="SET NULL")))
    changed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    booking: Booking = Relationship(back_populates="status_history")

class BookingCostItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    booking_id: int = Field(foreign_key="booking.id")
    name: str # e.g. Base Cost, PLC, Club House, GST, Maintenance
    amount: float
    description: Optional[str] = None
    
    booking: Booking = Relationship(back_populates="cost_breakdown")

class PaymentSchedule(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    booking_id: int = Field(foreign_key="booking.id")
    milestone: str
    amount: float
    due_date: datetime
    is_paid: bool = Field(default=False)
    last_notification_sent: Optional[datetime] = None
    booking: Booking = Relationship(back_populates="payment_schedules")
    payments: List["Payment"] = Relationship(back_populates="milestone_ref")

class Payment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    booking_id: int = Field(foreign_key="booking.id")
    payment_schedule_id: Optional[int] = Field(default=None, foreign_key="paymentschedule.id")
    amount_paid: float
    transaction_reference: str = Field(unique=True, index=True)
    payment_mode: str # NEFT, Cheque, UPI, Cash
    payment_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    verified_by_id: Optional[int] = Field(default=None, sa_column=Column(Integer, ForeignKey("user.id", ondelete="SET NULL")))
    
    booking: Booking = Relationship(back_populates="payments")
    milestone_ref: Optional[PaymentSchedule] = Relationship(back_populates="payments")

# --- Documents ---

class CustomerDocument(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int = Field(foreign_key="customer.id")
    type: str 
    file_path: str
    customer: Customer = Relationship(back_populates="documents")

class BookingDocument(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    booking_id: int = Field(foreign_key="booking.id")
    type: str 
    file_path: str
    uploaded_by_id: int = Field(sa_column=Column(Integer, ForeignKey("user.id", ondelete="SET NULL")))
    version: int = Field(default=1)
    booking: Booking = Relationship(back_populates="documents")

# --- Infrastructure ---

class Notification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), index=True))
    type: str # Use string for durability across DB migrations
    title: str
    message: str
    is_read: bool = Field(default=False, index=True)
    related_id: Optional[int] = None # e.g., lead_id or booking_id
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)
    
    user: User = Relationship(back_populates="notifications")

class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(sa_column=Column(Integer, ForeignKey("user.id", ondelete="SET NULL")))
    action: str
    target_table: str
    target_id: int
    payload: Optional[dict] = Field(default=None, sa_type=JSON)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user: User = Relationship(back_populates="audit_logs")
